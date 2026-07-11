"""Scope Google Analytics (GA4) intake to DEML-configured sites only.

Never pull every property in a Google account. Only properties linked via
StatusPage.google_analytics_id are eligible, and runReport results are filtered
to hostnames belonging to that user's MonitoredService URLs.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any, Final
from urllib.parse import urlparse

import requests
from django.contrib.auth.models import AbstractBaseUser

from monitor.models import MonitoredService, StatusPage

logger = logging.getLogger(__name__)

_MEASUREMENT_ID_RE: Final[re.Pattern[str]] = re.compile(r"^G-[A-Z0-9]+$", re.IGNORECASE)
_PROPERTY_ID_RE: Final[re.Pattern[str]] = re.compile(r"^(?:properties/)?(\d+)$")


@dataclass(frozen=True)
class Ga4SiteBinding:
  """One DEML status page → GA4 property + allowed hostnames."""

  status_page_id: str
  status_page_title: str
  measurement_id: str | None
  property_id: str
  hosts: frozenset[str]


def normalize_hostname(url_or_host: str) -> str | None:
  raw = (url_or_host or "").strip().lower()
  if not raw:
    return None
  if "://" not in raw:
    raw = f"https://{raw}"
  try:
    parsed = urlparse(raw)
  except ValueError:
    return None
  host = (parsed.hostname or "").strip(".").lower()
  return host or None


def hostname_aliases(host: str) -> set[str]:
  """Include www / bare apex variants for GA hostName matching."""
  h = host.strip(".").lower()
  if not h:
    return set()
  aliases = {h}
  if h.startswith("www."):
    aliases.add(h[4:])
  else:
    aliases.add(f"www.{h}")
  return aliases


def parse_ga_identifier(raw: str | None) -> tuple[str | None, str | None]:
  """Return (measurement_id, property_id) from a StatusPage.google_analytics_id value."""
  value = (raw or "").strip()
  if not value:
    return None, None
  if _MEASUREMENT_ID_RE.match(value):
    return value.upper(), None
  prop = _PROPERTY_ID_RE.match(value)
  if prop:
    return None, prop.group(1)
  return None, None


def user_site_hosts(user: AbstractBaseUser) -> set[str]:
  """All hostnames from the user's monitored services (DEML sites only)."""
  hosts: set[str] = set()
  urls = MonitoredService.objects.filter(
    status_page__user=user, status_page__is_platform=False
  ).values_list("url", flat=True)
  for url in urls:
    host = normalize_hostname(url)
    if host:
      hosts |= hostname_aliases(host)
  return hosts


def user_status_pages_with_ga(user: AbstractBaseUser) -> list[StatusPage]:
  return list(
    StatusPage.objects.filter(user=user, is_platform=False)
    .exclude(google_analytics_id__isnull=True)
    .exclude(google_analytics_id="")
    .prefetch_related("services")
  )


def hosts_for_status_page(page: StatusPage) -> set[str]:
  hosts: set[str] = set()
  for svc in page.services.all():
    host = normalize_hostname(svc.url)
    if host:
      hosts |= hostname_aliases(host)
  return hosts


def _admin_headers(access_token: str) -> dict[str, str]:
  return {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}


def list_accessible_property_ids(access_token: str, *, timeout: float = 15.0) -> list[str]:
  """Property numeric IDs the OAuth user can read (Admin API)."""
  url = "https://analyticsadmin.googleapis.com/v1beta/accountSummaries"
  property_ids: list[str] = []
  page_token: str | None = None
  while True:
    params: dict[str, str] = {"pageSize": "200"}
    if page_token:
      params["pageToken"] = page_token
    resp = requests.get(url, headers=_admin_headers(access_token), params=params, timeout=timeout)
    if resp.status_code != 200:
      logger.warning("GA Admin accountSummaries failed status=%s", resp.status_code)
      break
    data = resp.json() if resp.content else {}
    for account in data.get("accountSummaries", []):
      for prop in account.get("propertySummaries", []):
        name = prop.get("property") or ""
        # "properties/123456"
        if name.startswith("properties/"):
          property_ids.append(name.split("/", 1)[1])
    page_token = data.get("nextPageToken")
    if not page_token:
      break
  return property_ids


def measurement_ids_for_property(
  access_token: str, property_id: str, *, timeout: float = 15.0
) -> list[str]:
  """Web stream measurement IDs (G-…) on a GA4 property."""
  url = f"https://analyticsadmin.googleapis.com/v1beta/properties/{property_id}/dataStreams"
  resp = requests.get(url, headers=_admin_headers(access_token), timeout=timeout)
  if resp.status_code != 200:
    logger.warning(
      "GA Admin dataStreams failed property=%s status=%s", property_id, resp.status_code
    )
    return []
  ids: list[str] = []
  for stream in (resp.json() if resp.content else {}).get("dataStreams", []):
    web = stream.get("webStreamData") or {}
    mid = (web.get("measurementId") or "").strip().upper()
    if mid:
      ids.append(mid)
  return ids


def resolve_property_id_for_measurement(
  access_token: str,
  measurement_id: str,
  *,
  candidate_property_ids: list[str] | None = None,
  timeout: float = 15.0,
) -> str | None:
  """Map G-XXXX to a property id; only scan properties the user can access."""
  target = measurement_id.strip().upper()
  props = candidate_property_ids or list_accessible_property_ids(access_token, timeout=timeout)
  for prop_id in props:
    mids = measurement_ids_for_property(access_token, prop_id, timeout=timeout)
    if target in mids:
      return prop_id
  return None


def build_site_bindings(
  user: AbstractBaseUser,
  access_token: str,
  *,
  timeout: float = 15.0,
) -> list[Ga4SiteBinding]:
  """Bindings for GA sync: only pages with GA id + at least one monitored host."""
  pages = user_status_pages_with_ga(user)
  if not pages:
    logger.info("GA4 scope: user has no status pages with google_analytics_id")
    return []

  accessible: list[str] | None = None
  bindings: list[Ga4SiteBinding] = []

  for page in pages:
    hosts = hosts_for_status_page(page)
    if not hosts:
      logger.info(
        "GA4 scope: skip page slug=%s — no MonitoredService hosts to filter on",
        page.slug,
      )
      continue

    measurement_id, property_id = parse_ga_identifier(page.google_analytics_id)
    if not property_id and measurement_id:
      if accessible is None:
        accessible = list_accessible_property_ids(access_token, timeout=timeout)
      property_id = resolve_property_id_for_measurement(
        access_token,
        measurement_id,
        candidate_property_ids=accessible,
        timeout=timeout,
      )
      if not property_id:
        logger.warning(
          "GA4 scope: could not resolve property for measurement_id=%s page=%s",
          measurement_id,
          page.slug,
        )
        continue
    if not property_id:
      logger.info("GA4 scope: skip page slug=%s — invalid google_analytics_id", page.slug)
      continue

    bindings.append(
      Ga4SiteBinding(
        status_page_id=str(page.id),
        status_page_title=page.title,
        measurement_id=measurement_id,
        property_id=property_id,
        hosts=frozenset(hosts),
      )
    )

  return bindings


def ga4_hostname_filter(hosts: set[str] | frozenset[str]) -> dict[str, Any] | None:
  """GA4 Data API dimensionFilter for hostName in-list."""
  values = sorted({h for h in hosts if h})
  if not values:
    return None
  return {
    "filter": {
      "fieldName": "hostName",
      "inListFilter": {"values": values, "caseSensitive": False},
    }
  }


def credentials_scope_snapshot(bindings: list[Ga4SiteBinding]) -> list[dict[str, Any]]:
  """Serializable snapshot stored on AnalyticsIntegration.credentials for ops visibility."""
  return [
    {
      "status_page_id": b.status_page_id,
      "title": b.status_page_title,
      "measurement_id": b.measurement_id,
      "property_id": b.property_id,
      "hosts": sorted(b.hosts),
    }
    for b in bindings
  ]
