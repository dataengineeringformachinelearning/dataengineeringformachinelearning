"""Angular response-shape mappers for FORJD-backed BFF routes."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.test import Client, override_settings
from monitor.models import ForjdTenantMapping

from forjd.angular_compat import (
  deml_analytics_overview,
  deml_export_jobs,
  deml_ml_latest,
  deml_playbook_action_result,
  deml_playbook_runs,
  deml_status_pages,
  deml_vulnerabilities,
  empty_capability_envelope,
)
from forjd.client import ForjdError, ForjdResponse

User = get_user_model()


def test_deml_analytics_overview_maps_ces_fields() -> None:
  body = deml_analytics_overview(
    {
      "total_requests": 10,
      "active_incidents": 1,
      "p99_latency_ms": 42.0,
      "uptime_pct": 99.5,
      "ces": {
        "ces_level": 80,
        "ces_threat": 10,
        "ces_sla": 90,
        "ces_stability": 85,
      },
    }
  )
  assert body["status"] == "success"
  assert body["data"]["ces"]["level"] == 80
  assert body["data"]["user_metrics"]["total_requests_24h"] == 10


def test_deml_status_pages_sets_deml_user_id() -> None:
  pages = deml_status_pages(
    {
      "pages": [
        {
          "id": "p1",
          "title": "Ops",
          "slug": "ops",
          "description": "",
          "is_published": True,
          "created_at": "2026-07-18T00:00:00Z",
        }
      ]
    },
    deml_user_id=7,
  )
  assert pages[0]["user_id"] == 7
  assert pages[0]["slug"] == "ops"


def test_empty_capability_get_envelopes() -> None:
  assert empty_capability_envelope("system-status", "/api/v1/system-status/endpoints") == []
  tenants = empty_capability_envelope("analytics", "/api/v1/analytics/tenants")
  assert tenants["status"] == "success"
  assert tenants["degraded"] is True
  unavailable = empty_capability_envelope("unknown-cap", "/api/v1/unknown")
  assert unavailable["code"] == "forjd_capability_unavailable"
  assert unavailable["degraded"] is True
  assert empty_capability_envelope("ml", "/api/v1/ml/models") == []


def test_deml_vulnerabilities_maps_array() -> None:
  rows = deml_vulnerabilities(
    {
      "vulnerabilities": [
        {
          "id": "v1",
          "title": "CVE test",
          "severity": "high",
          "status": "open",
          "tenant_id": "t1",
          "created_at": "2026-07-18T00:00:00Z",
        }
      ]
    }
  )
  assert rows[0]["id"] == "v1"
  assert rows[0]["severity"] == "High"
  assert rows[0]["customer_id"] == "t1"


def test_deml_export_jobs_and_ml_latest() -> None:
  jobs = deml_export_jobs(
    {"jobs": [{"id": "e1", "status": "completed", "format": "csv", "object_key": "k"}]}
  )
  assert jobs[0]["download_ready"] is True
  scores = deml_ml_latest({"scores": [{"id": "s1", "model_id": "m1", "score": 0.9}]})
  assert isinstance(scores, list)
  assert len(scores) >= 1


def test_deml_playbook_runs_preserves_safe_action_results() -> None:
  runs = deml_playbook_runs(
    {
      "runs": [
        {
          "id": "run-1",
          "playbook_id": "playbook-1",
          "status": "retrying",
          "created_at": "2026-07-19T12:00:00Z",
          "actions": [
            {
              "id": "action-result-1",
              "action_plan_key": "0000:webhook",
              "playbook_action_id": "action-1",
              "action_type": "webhook",
              "status": "retry_scheduled",
              "attempt": 2,
              "max_attempts": 5,
              "status_code": 503,
              "error_code": "upstream_error",
              "external_reference": None,
              "metadata": {"retry_after_seconds": 30},
              "next_attempt_at": "2026-07-19T12:00:30Z",
              "last_attempt_at": "2026-07-19T12:00:00Z",
              "created_at": "2026-07-19T11:59:00Z",
              "updated_at": "2026-07-19T12:00:00Z",
              "completed_at": None,
              "configuration_snapshot": {"url": "https://hooks.example"},
              "lease_owner": "worker-secret",
              "lease_expires_at": "2026-07-19T12:00:30Z",
            }
          ],
        }
      ]
    }
  )

  assert runs[0]["actions_run"] == 1
  assert runs[0]["status"] == "Retrying"
  action = runs[0]["actions"][0]
  assert action["action_plan_key"] == "0000:webhook"
  assert action["status"] == "retry_scheduled"
  assert action["attempt"] == 2
  assert action["max_attempts"] == 5
  assert action["next_attempt_at"] == "2026-07-19T12:00:30Z"
  assert action["metadata"] == {"retry_after_seconds": 30}
  assert "configuration_snapshot" not in action
  assert "lease_owner" not in action
  assert "lease_expires_at" not in action


def test_deml_control_plane_action_preserves_only_safe_configuration() -> None:
  action = deml_playbook_action_result(
    {
      "id": "action-result-2",
      "action_type": "block_ip",
      "status": "awaiting_ack",
      "configuration": {
        "provider_ref": "edge-waf",
        "duration_seconds": 3600,
        "unexpected": "drop-me",
      },
    }
  )
  assert action["configuration"] == {
    "provider_ref": "edge-waf",
    "duration_seconds": 3600,
  }


@pytest.mark.django_db
@override_settings(
  FORJD_CUTOVER_PHASE="1",
  FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
)
def test_analytics_overview_proxy_maps_forjd(client: Client) -> None:
  user = User.objects.create_user(username="overview")
  tenant_id = uuid4()
  ForjdTenantMapping.objects.create(
    deml_account_id=user.profile.account_id,
    forjd_tenant_id=tenant_id,
  )
  upstream = {
    "ok": True,
    "total_requests": 3,
    "active_incidents": 0,
    "p99_latency_ms": 12,
    "uptime_pct": 100,
    "ces": {"ces_level": 50, "ces_threat": 1, "ces_sla": 90, "ces_stability": 80},
  }
  with (
    override_settings(FORJD_TENANT_ID=str(tenant_id)),
    patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock) as mock_proxy,
  ):
    mock_proxy.return_value = ForjdResponse(
      status=200,
      body=__import__("json").dumps(upstream).encode(),
      content_type="application/json",
    )
    response = client.get(
      "/api/v1/analytics/overview",
      HTTP_AUTHORIZATION="Bearer mock-token-overview-overview@example.com",
    )
  assert response.status_code == 200
  assert response.json()["status"] == "success"
  assert response.json()["data"]["ces"]["level"] == 50


@pytest.mark.django_db
@override_settings(
  FORJD_CUTOVER_PHASE="0",
  FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
)
def test_unsupported_get_returns_empty_not_501(client: Client) -> None:
  user = User.objects.create_user(username="emptyget")
  tenant_id = uuid4()
  ForjdTenantMapping.objects.create(
    deml_account_id=user.profile.account_id,
    forjd_tenant_id=tenant_id,
  )
  with override_settings(FORJD_TENANT_ID=str(tenant_id)):
    response = client.get(
      "/api/v1/system-status/endpoints",
      HTTP_AUTHORIZATION="Bearer mock-token-emptyget-emptyget@example.com",
    )
  assert response.status_code == 200
  assert response.json() == []


@pytest.mark.django_db
@override_settings(
  FORJD_CUTOVER_PHASE="1",
  FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
)
def test_status_pages_list_fallback_on_outage(client: Client) -> None:
  user = User.objects.create_user(username="pages")
  tenant_id = uuid4()
  ForjdTenantMapping.objects.create(
    deml_account_id=user.profile.account_id,
    forjd_tenant_id=tenant_id,
  )
  with (
    override_settings(FORJD_TENANT_ID=str(tenant_id)),
    patch(
      "forjd.views.ForjdClient.proxy",
      new_callable=AsyncMock,
      side_effect=ForjdError(503, "down"),
    ),
  ):
    response = client.get(
      "/api/v1/system-status/status_pages",
      HTTP_AUTHORIZATION="Bearer mock-token-pages-pages@example.com",
    )
  assert response.status_code == 200
  assert response.json() == []


@pytest.mark.django_db
@override_settings(
  FORJD_CUTOVER_PHASE="1",
  FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
)
def test_vulnerabilities_proxy_maps_forjd(client: Client) -> None:
  user = User.objects.create_user(username="vulns")
  tenant_id = uuid4()
  ForjdTenantMapping.objects.create(
    deml_account_id=user.profile.account_id,
    forjd_tenant_id=tenant_id,
  )
  upstream = {
    "ok": True,
    "vulnerabilities": [
      {
        "id": "v9",
        "title": "OpenSSL",
        "severity": "critical",
        "status": "triage",
        "tenant_id": str(tenant_id),
        "created_at": "2026-07-18T00:00:00Z",
      }
    ],
  }
  with (
    override_settings(FORJD_TENANT_ID=str(tenant_id)),
    patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock) as mock_proxy,
  ):
    mock_proxy.return_value = ForjdResponse(
      status=200,
      body=__import__("json").dumps(upstream).encode(),
      content_type="application/json",
    )
    response = client.get(
      "/api/v1/agent/vulnerabilities",
      HTTP_AUTHORIZATION="Bearer mock-token-vulns-vulns@example.com",
    )
  assert response.status_code == 200
  assert response.json()[0]["title"] == "OpenSSL"
