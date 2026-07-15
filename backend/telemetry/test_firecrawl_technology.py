import ipaddress
from typing import Any
from unittest.mock import AsyncMock, patch

import polars as pl
import pytest
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from monitor.models import OutboxEvent, UserProfile, ValidatedSite, WebTechnologyObservation

from telemetry.services.firecrawl_technology import (
  FirecrawlTechnologyClient,
  TechnologyEvidence,
  enrich_validated_site,
  validate_public_site_url,
)
from telemetry.tasks.asset_discovery import AssetDiscoveryScanner
from telemetry.vulnerability_ledger import ScannerServiceClient

User = get_user_model()


class _FakeResponse:
  status = 200

  def __init__(self, payload: dict[str, Any]) -> None:
    self.payload = payload

  async def __aenter__(self) -> "_FakeResponse":
    return self

  async def __aexit__(self, *args: Any) -> None:
    return None

  async def json(self) -> dict[str, Any]:
    return self.payload


class _FakeSession:
  def __init__(self, response_payload: dict[str, Any]) -> None:
    self.response_payload = response_payload
    self.calls: list[tuple[str, dict[str, Any]]] = []

  def post(self, url: str, *, json: dict[str, Any]) -> _FakeResponse:
    self.calls.append((url, json))
    return _FakeResponse(self.response_payload)


class _FakeFirecrawlClient:
  def __init__(self, technologies: list[TechnologyEvidence]) -> None:
    self.technologies = technologies

  async def extract(self, url: str) -> list[TechnologyEvidence]:
    assert url == "https://example.com/"
    return self.technologies


def test_firecrawl_parser_requires_evidence_and_deduplicates() -> None:
  client = FirecrawlTechnologyClient(
    api_key="test-key",  # pragma: allowlist secret
    base_url="https://api.firecrawl.dev",
    min_confidence=0.6,
  )
  result = client._parse(
    {
      "data": {
        "json": {
          "technologies": [
            {
              "name": "React",
              "version": "18.3.1",
              "confidence": 0.7,
              "evidence": ["script: /react.production.min.js"],
            },
            {
              "name": "React",
              "version": "18.3.1",
              "confidence": 0.95,
              "evidence": ["global: React.version=18.3.1"],
            },
            {
              "name": "Unknown CMS",
              "version": "unknown",
              "confidence": 0.99,
              "evidence": [],
            },
            {
              "name": "Low confidence CDN",
              "version": None,
              "confidence": 0.2,
              "evidence": ["header: server"],
            },
          ]
        }
      }
    }
  )

  assert result == [
    TechnologyEvidence(
      name="React",
      normalized_name="react",
      version="18.3.1",
      confidence=0.95,
      evidence=("global: React.version=18.3.1",),
    )
  ]


def test_public_site_validation_rejects_unverified_and_private_targets() -> None:
  public_address = ipaddress.ip_address("93.184.216.34")
  with patch(
    "telemetry.services.firecrawl_technology._resolved_public_addresses",
    return_value=(public_address,),
  ):
    assert validate_public_site_url("https://example.com/", "example.com") == "https://example.com/"
    with pytest.raises(ValueError, match="verified domain"):
      validate_public_site_url("https://attacker.example/", "example.com")
    credential_url = "https://user:secret@example.com/"  # pragma: allowlist secret
    with pytest.raises(ValueError, match="credentials"):
      validate_public_site_url(credential_url, "example.com")
    with pytest.raises(ValueError, match="port"):
      validate_public_site_url("https://example.com:8443/", "example.com")

  private_address = ipaddress.ip_address("127.0.0.1")
  with (
    patch(
      "telemetry.services.firecrawl_technology._resolved_public_addresses",
      return_value=(private_address,),
    ),
    pytest.raises(ValueError, match="non-public address"),
  ):
    validate_public_site_url("https://example.com/", "example.com")


def test_wappalyzer_evidence_uses_shared_normalized_inventory_shape() -> None:
  result = AssetDiscoveryScanner._technology_evidence(
    {
      "nginx": {"versions": ["1.25", "1.25"]},
      "Django": {"versions": []},
    }
  )

  assert result == [
    TechnologyEvidence(
      name="nginx",
      normalized_name="nginx",
      version="1.25",
      confidence=1.0,
      evidence=("Wappalyzer signature match",),
    ),
    TechnologyEvidence(
      name="Django",
      normalized_name="django",
      version="",
      confidence=1.0,
      evidence=("Wappalyzer signature match",),
    ),
  ]


@pytest.mark.asyncio
async def test_scanner_client_uses_tenant_contract_and_keeps_clean_cpe() -> None:
  session = _FakeSession(
    {
      "tenant_id": "a22f4a2b-f27d-4ae7-bff0-f8139a3a6403",
      "cpe_2_3": "cpe:2.3:a:nginx:nginx:1.25:*:*:*:*:*:*:*",
      "vulnerabilities": [],
    }
  )
  client = ScannerServiceClient(base_url="https://scanner.example")

  result = await client._scan_infra(
    session,  # type: ignore[arg-type]
    "a22f4a2b-f27d-4ae7-bff0-f8139a3a6403",
    "nginx",
    "1.25",
  )

  assert session.calls == [
    (
      "https://scanner.example/scan/infrastructure",
      {
        "tenant_id": "a22f4a2b-f27d-4ae7-bff0-f8139a3a6403",
        "tech_name": "nginx",
        "version": "1.25",
      },
    )
  ]
  assert result[0]["cpe_2_3"] == "cpe:2.3:a:nginx:nginx:1.25:*:*:*:*:*:*:*"
  assert result[0]["cve_id"] is None


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_enrichment_persists_account_scoped_cpe_and_cves(db: Any) -> None:
  user = await sync_to_async(User.objects.create_user)(username="firecrawl-user")
  profile = await sync_to_async(UserProfile.objects.create)(user=user)
  site = await sync_to_async(ValidatedSite.objects.create)(
    user=user,
    domain="example.com",
    is_verified=True,
  )
  technologies = [
    TechnologyEvidence(
      name="nginx",
      normalized_name="nginx",
      version="1.25",
      confidence=0.93,
      evidence=("header: server=nginx/1.25",),
    )
  ]
  ledger = pl.DataFrame(
    [
      {
        "account_id": str(profile.account_id),
        "is_platform": False,
        "source": "firecrawl",
        "url": "https://example.com/",
        "tech_name": "nginx",
        "version": "1.25",
        "cpe_2_3": "cpe:2.3:a:nginx:nginx:1.25:*:*:*:*:*:*:*",
        "cve_id": "CVE-2026-1234",
        "cvss_score": 8.1,
        "description": "Test CVE",
        "remediation": "Upgrade",
      }
    ]
  )

  with (
    patch(
      "telemetry.services.firecrawl_technology._resolved_public_addresses",
      return_value=(ipaddress.ip_address("93.184.216.34"),),
    ),
    patch(
      "telemetry.services.firecrawl_technology.process_dual_stream_batch",
      new=AsyncMock(return_value=ledger),
    ) as scanner,
  ):
    result = await enrich_validated_site(site, _FakeFirecrawlClient(technologies))

  observation = await sync_to_async(WebTechnologyObservation.objects.get)(validated_site=site)
  outbox = await sync_to_async(OutboxEvent.objects.get)(
    idempotency_key__startswith=f"web-technology-enrichment:firecrawl:{site.id}:"
  )

  assert result.account_id == profile.account_id
  assert result.cpe_match_count == 1
  assert result.cve_match_count == 1
  assert observation.user_id == user.id
  assert observation.account_id == profile.account_id
  assert observation.cpe_2_3 == "cpe:2.3:a:nginx:nginx:1.25:*:*:*:*:*:*:*"
  assert observation.cve_ids == ["CVE-2026-1234"]
  assert outbox.payload["cve_match_count"] == 1
  scanner.assert_awaited_once()


@pytest.mark.django_db
def test_web_technology_api_is_account_scoped(
  authenticated_client: Any, test_user: Any, db: Any
) -> None:
  profile, _ = UserProfile.objects.get_or_create(user=test_user)
  site = ValidatedSite.objects.create(user=test_user, domain="owned.example")
  WebTechnologyObservation.objects.create(
    account_id=profile.account_id,
    user=test_user,
    validated_site=site,
    source=WebTechnologyObservation.Source.FIRECRAWL,
    source_url="https://owned.example/",
    technology_name="Django",
    normalized_name="django",
    version="5.2",
    confidence=0.9,
    evidence=["cookie: csrftoken"],
  )

  other_user = User.objects.create_user(username="other-firecrawl-user")
  other_profile = UserProfile.objects.create(user=other_user)
  other_site = ValidatedSite.objects.create(user=other_user, domain="other.example")
  WebTechnologyObservation.objects.create(
    account_id=other_profile.account_id,
    user=other_user,
    validated_site=other_site,
    source=WebTechnologyObservation.Source.FIRECRAWL,
    source_url="https://other.example/",
    technology_name="Rails",
    normalized_name="rails",
    confidence=0.9,
    evidence=["header: x-runtime"],
  )

  response = authenticated_client.get("/api/v1/system-status/web-technologies")

  assert response.status_code == 200
  payload = response.json()
  assert len(payload) == 1
  assert payload[0]["domain"] == "owned.example"
  assert payload[0]["technology_name"] == "Django"
