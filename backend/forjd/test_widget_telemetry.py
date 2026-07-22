"""Widget telemetry and new BFF adapters (endpoints / train / predict)."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from django.test import Client, override_settings


@pytest.mark.django_db
@override_settings(FORJD_WRITE_MODE="forjd", FORJD_READ_MODE="forjd")
def test_widget_telemetry_requires_slug() -> None:
  client = Client()
  response = client.post(
    "/api/v1/system-status/widget-telemetry",
    data=json.dumps({"response_time_ms": 120}),
    content_type="application/json",
  )
  assert response.status_code == 400


@pytest.mark.django_db
@override_settings(FORJD_WRITE_MODE="forjd", FORJD_READ_MODE="forjd")
def test_widget_telemetry_accepts_when_page_unmapped() -> None:
  client = Client()
  with patch("forjd.widget_telemetry._resolve_page_tenant", new=AsyncMock(return_value=None)):
    response = client.post(
      "/api/v1/system-status/widget-telemetry",
      data=json.dumps({"slug": "platform-status", "response_time_ms": 90}),
      content_type="application/json",
    )
  assert response.status_code == 202
  body = response.json()
  assert body["ok"] is True
  assert body["accepted"] is False


@pytest.mark.django_db
@override_settings(FORJD_WRITE_MODE="forjd", FORJD_READ_MODE="forjd")
def test_widget_telemetry_seals_when_mapped() -> None:
  tenant_id = uuid4()
  credential = MagicMock()
  credential.tenant_id = tenant_id
  credential.service_token = "fjsvc_abcd1234_test-secret"  # pragma: allowlist secret

  client = Client()
  with (
    patch("forjd.widget_telemetry._resolve_page_tenant", new=AsyncMock(return_value=tenant_id)),
    patch(
      "forjd.widget_telemetry._credential_for_tenant",
      new=AsyncMock(return_value=credential),
    ),
    patch(
      "forjd.widget_telemetry.send_widget_telemetry",
      new=AsyncMock(return_value={"ok": True, "event_id": "evt-1"}),
    ) as send,
  ):
    response = client.post(
      "/api/v1/system-status/widget-telemetry",
      data=json.dumps(
        {
          "slug": "demo-status",
          "response_time_ms": 210,
          "status_code": 200,
          "device_id": "w-test",
        }
      ),
      content_type="application/json",
    )
  assert response.status_code == 202
  body = response.json()
  assert body["accepted"] is True
  send.assert_awaited_once()


def test_deml_discovered_endpoints_shape() -> None:
  from forjd.angular_compat import deml_discovered_endpoints

  rows = deml_discovered_endpoints(
    {
      "endpoints": [
        {
          "id": "e1",
          "url": "https://example.com/health",
          "is_active": True,
          "created_at": "2026-07-21T00:00:00Z",
        }
      ]
    }
  )
  assert len(rows) == 1
  assert rows[0]["url"] == "https://example.com/health"
  assert rows[0]["is_active"] is True


def test_analytics_overview_merges_control_plane() -> None:
  from forjd.angular_compat import deml_analytics_overview

  body = deml_analytics_overview(
    {
      "total_requests": 10,
      "active_incidents": 0,
      "threats_detected": 1,
      "unique_visitors": 3,
      "p99_latency_ms": 12.5,
      "uptime_pct": 99.9,
      "data_available": True,
      "origin_distribution": [{"region": "iad", "count": 4}],
      "http_statuses": [{"status": "2xx", "count": 8}],
      "endpoint_counts": [{"endpoint": "status.widget", "count": 5}],
      "honeypot_score": 12.5,
      "deml_control_plane": {
        "cookie_consents": {"analytical": 2, "marketing": 1},
        "active_providers": ["google"],
        "widget_interactions": 3,
        "api_usage": {"usage_current_minute": 0, "quota_per_minute": 60},
      },
      "ces": {
        "ces_level": 80,
        "ces_threat": 10,
        "ces_sla": 99,
        "ces_stability": 90,
        "spiking_temporal_forecast": 5,
      },
      "time_series": [],
      "uptime_series": [],
      "threat_series": [],
      "threat_severity": [],
    }
  )
  metrics = body["data"]["user_metrics"]
  assert metrics["origin_distribution"][0]["region"] == "iad"
  assert metrics["cookie_consents"]["analytical"] == 2
  assert metrics["active_providers"] == ["google"]
  assert body["data"]["honeypot_score"] == 12.5
