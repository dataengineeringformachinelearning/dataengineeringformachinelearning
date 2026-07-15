"""Firecrawl-backed public web technology inventory enrichment."""

from __future__ import annotations

import asyncio
import ipaddress
import logging
import re
import socket
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Final
from urllib.parse import urlparse

import aiohttp
from asgiref.sync import sync_to_async
from django.conf import settings
from django.db import transaction
from monitor.models import OutboxEvent, ValidatedSite, WebTechnologyObservation

from telemetry.vulnerability_ledger import process_dual_stream_batch

logger = logging.getLogger(__name__)

FIRECRAWL_EVENT_VERSION: Final[str] = "1.0"
MAX_TECHNOLOGIES_PER_SITE: Final[int] = 100
MAX_EVIDENCE_ITEMS: Final[int] = 8
MAX_EVIDENCE_LENGTH: Final[int] = 500
MAX_SITES_PER_RUN: Final[int] = 1_000
ALLOWED_WEB_PORTS: Final[frozenset[int]] = frozenset({80, 443})


class FirecrawlTechnologyError(RuntimeError):
  """Raised when Firecrawl cannot return a trustworthy technology result."""


@dataclass(frozen=True)
class TechnologyEvidence:
  name: str
  normalized_name: str
  version: str
  confidence: float
  evidence: tuple[str, ...]


@dataclass(frozen=True)
class SiteTechnologyScanResult:
  site_id: uuid.UUID
  account_id: uuid.UUID
  observed_count: int
  cpe_match_count: int
  cve_match_count: int


def _normalized_domain(raw: str) -> str:
  candidate = raw.strip().lower().rstrip(".")
  parsed = urlparse(candidate if "://" in candidate else f"//{candidate}")
  host = parsed.hostname or ""
  try:
    return host.encode("idna").decode("ascii")
  except UnicodeError as exc:
    raise ValueError("validated site domain is not valid IDNA") from exc


def _resolved_public_addresses(
  host: str,
) -> tuple[ipaddress.IPv4Address | ipaddress.IPv6Address, ...]:
  try:
    literal = ipaddress.ip_address(host)
    return (literal,)
  except ValueError:
    pass

  try:
    records = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
  except socket.gaierror as exc:
    raise ValueError("site domain could not be resolved") from exc

  addresses = tuple({ipaddress.ip_address(record[4][0]) for record in records})
  if not addresses:
    raise ValueError("site domain resolved without an address")
  return addresses


def validate_public_site_url(url: str, verified_domain: str) -> str:
  """Validate exact verified-origin ownership and reject SSRF-capable targets."""
  parsed = urlparse(url)
  if parsed.scheme not in {"http", "https"}:
    raise ValueError("Firecrawl targets must use http or https")
  if parsed.username or parsed.password:
    raise ValueError("Firecrawl targets cannot contain credentials")
  if not parsed.hostname:
    raise ValueError("Firecrawl target requires a hostname")
  if parsed.port is not None and parsed.port not in ALLOWED_WEB_PORTS:
    raise ValueError("Firecrawl target port is not allowed")

  host = _normalized_domain(parsed.hostname)
  expected = _normalized_domain(verified_domain)
  if host != expected:
    raise ValueError("Firecrawl target must match the verified domain")

  addresses = _resolved_public_addresses(host)
  if any(not address.is_global for address in addresses):
    raise ValueError("Firecrawl target resolves to a non-public address")
  return parsed.geturl()


def normalize_technology_name(raw: str) -> str:
  """Create a deterministic account-local comparison key without losing CPE input."""
  cleaned = re.sub(r"\s+", " ", raw.strip())[:255]
  return re.sub(r"[^a-z0-9+#.]+", "-", cleaned.lower()).strip("-")


def normalize_version(raw: Any) -> str:
  if raw is None:
    return ""
  cleaned = re.sub(r"\s+", " ", str(raw).strip())[:128]
  if cleaned.lower() in {"unknown", "n/a", "none", "null", "latest"}:
    return ""
  return cleaned


class FirecrawlTechnologyClient:
  """Small typed client for Firecrawl v2 structured extraction."""

  def __init__(
    self,
    api_key: str | None = None,
    base_url: str | None = None,
    timeout_seconds: int | None = None,
    min_confidence: float | None = None,
  ) -> None:
    self.api_key = api_key if api_key is not None else settings.FIRECRAWL_API_KEY
    self.base_url = (base_url or settings.FIRECRAWL_API_URL).rstrip("/")
    configured_timeout = (
      timeout_seconds if timeout_seconds is not None else settings.FIRECRAWL_TIMEOUT_SECONDS
    )
    self.timeout_seconds = max(1, min(configured_timeout, 300))
    configured_confidence = (
      min_confidence if min_confidence is not None else settings.FIRECRAWL_MIN_CONFIDENCE
    )
    self.min_confidence = max(0.0, min(configured_confidence, 1.0))

  async def extract(self, url: str) -> list[TechnologyEvidence]:
    if not self.api_key:
      raise FirecrawlTechnologyError("Firecrawl API key is not configured")

    schema = {
      "type": "object",
      "properties": {
        "technologies": {
          "type": "array",
          "maxItems": MAX_TECHNOLOGIES_PER_SITE,
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string"},
              "version": {"type": ["string", "null"]},
              "confidence": {"type": "number", "minimum": 0, "maximum": 1},
              "evidence": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["name", "confidence", "evidence"],
          },
        }
      },
      "required": ["technologies"],
    }
    payload = {
      "url": url,
      "formats": [
        {
          "type": "json",
          "schema": schema,
          "prompt": (
            "Identify observable web technologies in the rendered page like Wappalyzer. "
            "Include frameworks, CMS products, servers, CDNs, analytics, tag managers, "
            "commerce platforms, and JavaScript libraries. Only report a version when the "
            "page provides explicit evidence. Every item must include concise DOM, header, "
            "script URL, generator meta, cookie, or global-variable evidence. Do not infer "
            "technologies from visual appearance alone."
          ),
        }
      ],
      "onlyMainContent": False,
      "maxAge": 86_400_000,
      "storeInCache": True,
      "timeout": min(self.timeout_seconds * 1000, 300_000),
    }
    timeout = aiohttp.ClientTimeout(total=self.timeout_seconds + 5)
    headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
    try:
      async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
        async with session.post(f"{self.base_url}/v2/scrape", json=payload) as response:
          if response.status != 200:
            body = (await response.text())[:500]
            raise FirecrawlTechnologyError(
              f"Firecrawl scrape failed with HTTP {response.status}: {body}"
            )
          try:
            response_payload = await response.json()
          except (aiohttp.ContentTypeError, ValueError) as exc:
            raise FirecrawlTechnologyError("Firecrawl returned invalid JSON") from exc
    except (aiohttp.ClientError, TimeoutError) as exc:
      raise FirecrawlTechnologyError("Firecrawl request failed") from exc

    return self._parse(response_payload)

  def _parse(self, payload: dict[str, Any]) -> list[TechnologyEvidence]:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    structured = data.get("json") if isinstance(data, dict) else None
    if not isinstance(structured, dict):
      raise FirecrawlTechnologyError("Firecrawl response did not include structured JSON")
    raw_items = structured.get("technologies")
    if not isinstance(raw_items, list):
      raise FirecrawlTechnologyError("Firecrawl response did not include technologies")

    deduplicated: dict[tuple[str, str], TechnologyEvidence] = {}
    for raw in raw_items[:MAX_TECHNOLOGIES_PER_SITE]:
      if not isinstance(raw, dict) or not isinstance(raw.get("name"), str):
        continue
      name = re.sub(r"\s+", " ", raw["name"].strip())[:255]
      normalized = normalize_technology_name(name)
      if not normalized:
        continue
      try:
        confidence = max(0.0, min(1.0, float(raw.get("confidence", 0.0))))
      except (TypeError, ValueError):
        continue
      raw_evidence = raw.get("evidence")
      evidence_items = raw_evidence if isinstance(raw_evidence, list) else []
      evidence = tuple(
        dict.fromkeys(
          str(item).strip()[:MAX_EVIDENCE_LENGTH]
          for item in evidence_items[:MAX_EVIDENCE_ITEMS]
          if isinstance(item, str) and item.strip()
        )
      )
      if confidence < self.min_confidence or not evidence:
        continue
      version = normalize_version(raw.get("version"))
      candidate = TechnologyEvidence(name, normalized, version, confidence, evidence)
      key = (normalized, version)
      existing = deduplicated.get(key)
      if existing is None or candidate.confidence > existing.confidence:
        deduplicated[key] = candidate
    return sorted(deduplicated.values(), key=lambda item: (item.normalized_name, item.version))


def _site_account_scope(site: ValidatedSite) -> tuple[uuid.UUID, bool]:
  if site.user_id:
    profile = getattr(site.user, "profile", None)
    if profile is None or not profile.account_id:
      raise ValueError("validated site owner has no native account UUID")
    return profile.account_id, False
  return site.id, True


def _enrichment_by_technology(rows: list[dict[str, Any]]) -> dict[tuple[str, str], dict[str, Any]]:
  enriched: dict[tuple[str, str], dict[str, Any]] = {}
  for row in rows:
    key = (
      normalize_technology_name(str(row.get("tech_name") or "")),
      normalize_version(row.get("version")),
    )
    if not key[0]:
      continue
    current = enriched.setdefault(key, {"cpe_2_3": "", "cve_ids": set()})
    if row.get("cpe_2_3"):
      current["cpe_2_3"] = str(row["cpe_2_3"])
    if row.get("cve_id"):
      current["cve_ids"].add(str(row["cve_id"]))
  return enriched


@sync_to_async
def _persist_observations(
  site: ValidatedSite,
  account_id: uuid.UUID,
  is_platform: bool,
  source_url: str,
  source: str,
  technologies: list[TechnologyEvidence],
  enriched: dict[tuple[str, str], dict[str, Any]],
) -> SiteTechnologyScanResult:
  cpe_matches = 0
  all_cves: set[str] = set()
  with transaction.atomic():
    for technology in technologies:
      match = enriched.get((technology.normalized_name, technology.version), {})
      cpe = str(match.get("cpe_2_3") or "")
      cve_ids = sorted(str(item) for item in match.get("cve_ids", set()))
      cpe_matches += int(bool(cpe))
      all_cves.update(cve_ids)
      WebTechnologyObservation.objects.update_or_create(
        validated_site=site,
        source=source,
        normalized_name=technology.normalized_name,
        version=technology.version,
        defaults={
          "account_id": account_id,
          "user": site.user,
          "is_platform": is_platform,
          "source_url": source_url,
          "technology_name": technology.name,
          "confidence": technology.confidence,
          "evidence": list(technology.evidence),
          "cpe_2_3": cpe,
          "cve_ids": cve_ids,
        },
      )

    now = datetime.now(UTC)
    OutboxEvent.objects.get_or_create(
      idempotency_key=(f"web-technology-enrichment:{source}:{site.id}:{now.date().isoformat()}"),
      defaults={
        "topic": "app-events",
        "key": str(account_id),
        "payload": {
          "version": FIRECRAWL_EVENT_VERSION,
          "event_type": "web_technology_inventory.updated",
          "account_id": str(account_id),
          "is_platform": is_platform,
          "validated_site_id": str(site.id),
          "domain": site.domain,
          "source": source,
          "observed_count": len(technologies),
          "cpe_match_count": cpe_matches,
          "cve_match_count": len(all_cves),
          "observed_at": now.isoformat(),
        },
      },
    )

  return SiteTechnologyScanResult(
    site_id=site.id,
    account_id=account_id,
    observed_count=len(technologies),
    cpe_match_count=cpe_matches,
    cve_match_count=len(all_cves),
  )


async def compare_and_persist_site_technologies(
  site: ValidatedSite,
  source_url: str,
  source: str,
  technologies: list[TechnologyEvidence],
) -> SiteTechnologyScanResult:
  """Route any evidence-backed detector through the shared CPE/CVE ledger."""
  account_id, is_platform = _site_account_scope(site)
  infra_batch = [
    {
      "account_id": str(account_id),
      "is_platform": is_platform,
      "url": source_url,
      "tech_name": technology.name,
      "version": technology.version,
      "source": source,
    }
    for technology in technologies
  ]
  ledger = await process_dual_stream_batch(infra_batch, []) if infra_batch else None
  rows = ledger.to_dicts() if ledger is not None and not ledger.is_empty() else []
  enriched = _enrichment_by_technology(rows)
  return await _persist_observations(
    site,
    account_id,
    is_platform,
    source_url,
    source,
    technologies,
    enriched,
  )


async def enrich_validated_site(
  site: ValidatedSite, client: FirecrawlTechnologyClient
) -> SiteTechnologyScanResult:
  domain = _normalized_domain(site.domain)
  source_url = await asyncio.to_thread(
    validate_public_site_url,
    f"https://{domain}/",
    domain,
  )
  technologies = await client.extract(source_url)
  return await compare_and_persist_site_technologies(
    site,
    source_url,
    WebTechnologyObservation.Source.FIRECRAWL,
    technologies,
  )


async def enrich_all_validated_sites(
  client: FirecrawlTechnologyClient | None = None,
  limit: int | None = None,
) -> list[SiteTechnologyScanResult]:
  if not settings.FIRECRAWL_ENABLED:
    logger.info("Firecrawl technology enrichment is disabled")
    return []
  if not settings.FIRECRAWL_API_KEY:
    raise FirecrawlTechnologyError("FIRECRAWL_ENABLED requires FIRECRAWL_API_KEY")

  resolved_client = client or FirecrawlTechnologyClient()
  configured_limit = limit if limit is not None else settings.FIRECRAWL_MAX_SITES_PER_RUN
  resolved_limit = max(0, min(configured_limit, MAX_SITES_PER_RUN))
  if resolved_limit == 0:
    return []
  sites = await sync_to_async(list)(
    ValidatedSite.objects.filter(is_verified=True)
    .select_related("user", "user__profile")
    .order_by("created_at")[:resolved_limit]
  )
  results: list[SiteTechnologyScanResult] = []
  for site in sites:
    try:
      results.append(await enrich_validated_site(site, resolved_client))
    except (FirecrawlTechnologyError, ValueError) as exc:
      logger.warning("Firecrawl enrichment skipped site %s: %s", site.id, exc)
  return results
