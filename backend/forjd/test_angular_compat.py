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
  deml_sla_latest,
  deml_status_incidents,
  deml_status_pages,
  deml_status_services,
  deml_temporal_forecast,
  deml_threat_report,
  deml_vulnerabilities,
  empty_analytics_overview,
  empty_capability_envelope,
  match_published_status_page,
  public_status_slug_candidates,
)
from forjd.client import ForjdError, ForjdResponse

User = get_user_model()


def test_deml_analytics_overview_maps_ces_fields() -> None:
  body = deml_analytics_overview(
    {
      "total_requests": 10,
      "active_incidents": 1,
      "threats_detected": 2,
      "unique_visitors": 4,
      "p99_latency_ms": 42.0,
      "uptime_pct": 99.5,
      "ces": {
        "ces_level": 80,
        "ces_threat": 10,
        "ces_sla": 90,
        "ces_stability": 85,
        "spiking_temporal_forecast": 12.5,
        "temporal_status": "ready",
        "temporal_backend": "norse_lif",
        "temporal_sample_count": 128,
        "temporal_scored_at": "2026-07-23T00:00:00Z",
        "uses_norse": True,
      },
      "time_series": [{"label": "10:00", "latency": 42.0, "requests": 10}],
      "uptime_series": [{"label": "10:00", "uptime": 99.5}],
      "threat_series": [{"label": "10:00", "count": 2}],
      "threat_severity": [{"severity": "Detected", "count": 2}],
      "origin_distribution": [{"region": "iad", "count": 5}],
      "http_statuses": [{"status": "2xx", "count": 9}],
      "endpoint_counts": [{"endpoint": "analytics.overview", "count": 3}],
    }
  )
  assert body["status"] == "success"
  assert body["degraded"] is False
  assert body["data"]["ces"]["level"] == 80
  assert body["data"]["ces"]["spiking_temporal_forecast"] == 12.5
  assert body["data"]["ces"]["temporal_status"] == "ready"
  assert body["data"]["ces"]["temporal_backend"] == "norse_lif"
  assert body["data"]["ces"]["temporal_sample_count"] == 128
  assert body["data"]["ces"]["uses_norse"] is True
  assert body["data"]["user_metrics"]["total_requests_24h"] == 10
  assert body["data"]["user_metrics"]["unique_visitors"] == 4
  assert body["data"]["user_metrics"]["time_series"][0]["latency"] == 42.0
  assert body["data"]["user_metrics"]["request_frequency"][0]["requests"] == 10
  assert body["data"]["user_metrics"]["uptime_series"][0]["uptime"] == 99.5
  assert body["data"]["user_metrics"]["security_alerts"][0]["count"] == 2
  assert body["data"]["user_metrics"]["threat_severity"][0]["count"] == 2
  assert body["data"]["user_metrics"]["origin_distribution"][0]["region"] == "iad"
  assert body["data"]["user_metrics"]["http_statuses"][0]["status"] == "2xx"
  assert body["data"]["user_metrics"]["endpoint_counts"][0]["endpoint"] == "analytics.overview"


def test_empty_analytics_overview_is_degraded_not_healthy() -> None:
  body = empty_analytics_overview()
  assert body["degraded"] is True
  assert body["code"] == "forjd_read_fallback"
  assert body["data"]["user_metrics"]["uptime_percent"] is None
  assert body["data"]["user_metrics"]["data_available"] is False
  assert body["data"]["ces"]["level"] == 0
  assert body["data"]["ces"]["spiking_temporal_forecast"] is None
  assert body["data"]["ces"]["temporal_status"] == "unavailable"


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


def test_public_status_slug_candidates_domain_and_stem() -> None:
  assert public_status_slug_candidates("joealongi.dev") == ["joealongi-dev", "joealongi"]
  assert public_status_slug_candidates("joealongi-dev") == ["joealongi-dev"]


def test_match_published_status_page_unique_prefix() -> None:
  pages = [
    {"id": "1", "slug": "joealongi-dev", "title": "joealongi.dev", "is_published": True},
    {"id": "2", "slug": "platform-status", "title": "Platform", "is_published": True},
  ]
  assert match_published_status_page(pages, identifier="joealongi")["slug"] == "joealongi-dev"
  assert match_published_status_page(pages, identifier="missing") is None


def test_deml_status_page_passes_through_uptime_history() -> None:
  from forjd.angular_compat import deml_status_page

  page = deml_status_page(
    {
      "id": "p1",
      "title": "Ops",
      "slug": "ops",
      "description": "",
      "is_published": True,
      "created_at": "2026-07-18T00:00:00Z",
      "overall_uptime": 99.5,
      "cumulative_sla": 99.5,
      "p99_latency": 12.5,
      "total_requests": 42,
      "spiking_temporal_forecast": 0,
      "temporal_status": "ready",
      "temporal_backend": "gru_mlp",
      "temporal_sample_count": 64,
      "temporal_scored_at": "2026-07-23T00:00:00Z",
      "uptime_history": [
        {"date": "2026-07-18", "status": "up", "uptime": 100},
        {"date": "2026-07-19", "status": "no_data", "uptime": None},
      ],
    },
    deml_user_id=None,
  )
  assert page["overall_uptime"] == 99.5
  assert page["p99_latency"] == 12.5
  assert page["total_requests"] == 42
  assert page["spiking_temporal_forecast"] == 0
  assert page["temporal_status"] == "ready"
  assert page["temporal_backend"] == "gru_mlp"
  assert page["temporal_sample_count"] == 64
  assert page["temporal_scored_at"] == "2026-07-23T00:00:00Z"
  assert page["uptime_history"] == [
    {"date": "2026-07-18", "status": "up", "uptime": 100.0},
    {"date": "2026-07-19", "status": "no_data", "uptime": None},
  ]


def test_deml_status_services_passes_through_sla_and_history() -> None:
  rows = deml_status_services(
    {
      "services": [
        {
          "id": "s1",
          "name": "Site",
          "status": "operational",
          "description": "https://example.com",
          "sla": 99.9,
          "p99_latency": 14,
          "uptime_history": [{"date": "2026-07-18", "status": "up", "uptime": 100}],
        }
      ]
    }
  )
  assert rows[0]["sla"] == 99.9
  assert rows[0]["p99_latency"] == 14.0
  assert rows[0]["uptime_history"][0]["status"] == "up"


def test_deml_status_services_maps_forjd_enums_to_legacy_labels() -> None:
  rows = deml_status_services(
    {
      "services": [
        {"id": "s1", "name": "Site", "status": "operational"},
        {"id": "s2", "name": "API", "status": "degraded"},
        {"id": "s3", "name": "Edge", "status": "partial_outage"},
        {"id": "s4", "name": "Core", "status": "major_outage"},
        {"id": "s5", "name": "Jobs", "status": "maintenance"},
        {"id": "s6", "name": "Legacy", "status": "Outage"},
      ]
    }
  )
  assert [row["status"] for row in rows] == [
    "Operational",
    "Degraded",
    "Degraded",
    "Outage",
    "Maintenance",
    "Outage",
  ]


def test_deml_status_incidents_title_cases_statuses() -> None:
  rows = deml_status_incidents(
    {
      "incidents": [
        {"id": "i1", "title": "A", "status": "resolved", "started_at": "2026-07-18T00:00:00Z"},
        {"id": "i2", "title": "B", "status": "investigating", "started_at": None},
        {"id": "i3", "title": "C", "status": None, "started_at": None},
      ]
    }
  )
  assert [row["status"] for row in rows] == ["Resolved", "Investigating", "Investigating"]


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


def test_deml_sla_latest_shapes_training_response() -> None:
  body = deml_sla_latest(
    {
      "ces": {"ces_sla": 99.5, "predicted_sla": 97.25},
      "uptime_pct": 98.0,
    }
  )
  assert body == {"status": "success", "average_sla": 97.25, "created_at": None}
  current_only = deml_sla_latest({"ces": {"ces_sla": 99.5}, "uptime_pct": 98.0})
  assert current_only["average_sla"] is None
  fallback = deml_sla_latest({"average_sla": 96.0})
  assert fallback["average_sla"] == 96.0
  empty = deml_sla_latest({})
  assert empty["average_sla"] is None


def test_deml_temporal_forecast_shapes_gauge_response() -> None:
  body = deml_temporal_forecast(
    {
      "ces": {
        "spiking_temporal_forecast": 0,
        "temporal_status": "ready",
        "temporal_backend": "gru_mlp",
        "temporal_sample_count": 128,
        "temporal_scored_at": "2026-07-23T00:00:00Z",
        "uses_norse": False,
      }
    }
  )
  assert body["status"] == "success"
  assert body["spiking_temporal_forecast"] == 0
  assert body["temporal_status"] == "ready"
  assert body["temporal_backend"] == "gru_mlp"
  assert body["temporal_sample_count"] == 128
  assert body["uses_norse"] is False
  empty = deml_temporal_forecast({})
  assert empty["spiking_temporal_forecast"] is None
  assert empty["uses_norse"] is None
  malformed = deml_temporal_forecast(
    {
      "ces": {
        "spiking_temporal_forecast": True,
        "temporal_status": {"unexpected": "object"},
        "temporal_sample_count": -1,
      }
    }
  )
  assert malformed["spiking_temporal_forecast"] is None
  assert malformed["temporal_status"] is None
  assert malformed["temporal_sample_count"] is None


def test_legacy_temporal_zero_remains_unqualified() -> None:
  body = deml_temporal_forecast({"ces": {"spiking_temporal_forecast": 0, "uses_norse": False}})
  assert body["spiking_temporal_forecast"] == 0
  assert body["uses_norse"] is False
  assert body["temporal_status"] is None
  assert body["temporal_backend"] is None
  assert body["temporal_sample_count"] is None
  assert body["temporal_scored_at"] is None


def test_deml_status_page_coerces_legacy_bare_zero_forecast() -> None:
  from forjd.angular_compat import deml_status_page

  page = deml_status_page(
    {
      "id": "p1",
      "title": "joealongi.dev",
      "slug": "joealongi-dev",
      "description": "Public status for joealongi.dev and related services.",
      "is_published": True,
      "created_at": "2026-07-19T00:00:00Z",
      "spiking_temporal_forecast": 0.0,
      "uses_norse": False,
      "threat_anomaly_score": 0.62,
      "threat_suspicious_ratio": 0.32,
    },
    deml_user_id=None,
  )
  assert page["spiking_temporal_forecast"] is None
  assert page["temporal_status"] == "insufficient_data"
  assert page["temporal_backend"] is None
  assert page["temporal_sample_count"] == 0
  assert page["uses_norse"] is False
  assert page["threat_anomaly_score"] == 0.62
  assert page["threat_suspicious_ratio"] == 0.32


def test_deml_threat_report_from_scores() -> None:
  body = deml_threat_report(
    {
      "scores": [
        {"score": 0.9, "is_anomaly": True, "created_at": "2026-07-19T00:00:00Z"},
        {"score": 0.1, "is_anomaly": False, "created_at": "2026-07-18T00:00:00Z"},
      ]
    }
  )
  assert body["anomaly_score"] == 0.9
  assert body["suspicious_ratio"] == 0.5
  assert body["created_at"] == "2026-07-19T00:00:00Z"
  empty = deml_threat_report({})
  assert empty["status"] == "success"
  assert empty["anomaly_score"] is None
  assert "message" in empty


def test_deml_threat_report_does_not_invent_zero_for_null_scores() -> None:
  body = deml_threat_report(
    {
      "scores": [
        {"score": None, "is_anomaly": False, "created_at": "2026-07-19T00:00:00Z"},
      ]
    }
  )
  assert body["anomaly_score"] is None
  assert body["suspicious_ratio"] == 0


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
