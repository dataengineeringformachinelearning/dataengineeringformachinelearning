"""Contract tests for control-plane readiness soft FORJD wiring."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from django.test import Client, override_settings


@pytest.mark.django_db
@override_settings(
  FORJD_API_URL="https://forjd.example",
  FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",  # pragma: allowlist secret
  FORJD_TENANT_ID="2af44174-6332-4f37-8129-684ed84a87dc",
)
def test_ready_exposes_forjd_health_and_mode() -> None:
  mock_resp = MagicMock()
  mock_resp.status = 200
  mock_conn = MagicMock()
  mock_conn.getresponse.return_value = mock_resp

  with (
    patch("django.db.connection.ensure_connection"),
    patch("http.client.HTTPSConnection", return_value=mock_conn),
  ):
    response = Client().get("/api/v1/ready")

  assert response.status_code == 200
  body = response.json()
  assert body["status"] == "ready"
  assert body["forjd_health"] == "ok"
  assert body["mode"] == "full"


@pytest.mark.django_db
@override_settings(
  FORJD_API_URL="https://forjd.example",
  FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",  # pragma: allowlist secret
  FORJD_TENANT_ID="2af44174-6332-4f37-8129-684ed84a87dc",
)
def test_ready_soft_degrades_when_forjd_not_ready() -> None:
  mock_resp = MagicMock()
  mock_resp.status = 503
  mock_conn = MagicMock()
  mock_conn.getresponse.return_value = mock_resp

  with (
    patch("django.db.connection.ensure_connection"),
    patch("http.client.HTTPSConnection", return_value=mock_conn),
  ):
    response = Client().get("/api/v1/ready")

  assert response.status_code == 200
  body = response.json()
  assert body["forjd_health"] == "degraded"
  assert body["mode"] == "degraded"
