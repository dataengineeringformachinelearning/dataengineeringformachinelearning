"""Tests for the SSE live-updates lane (/api/v1/analytics/live)."""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.test import Client, override_settings
from monitor.models import ForjdTenantMapping

from forjd.client import ForjdResponse

User = get_user_model()
SERVICE_TOKEN = "fjsvc_deadbeef_test-secret"  # pragma: allowlist secret
LIVE_PATH = "/api/v1/analytics/live"


# --- Helpers ---
def _mapped_actor(username: str) -> tuple[Any, str]:
  user = User.objects.create_user(username=username)
  user.profile.role = "Viewer"
  user.profile.save(update_fields=["role"])
  tenant_id = uuid4()
  ForjdTenantMapping.objects.create(
    deml_account_id=user.profile.account_id,
    forjd_tenant_id=tenant_id,
  )
  return user, str(tenant_id)


def _authorization(username: str) -> str:
  return f"Bearer mock-token-{username}-{username}@example.com"


def _projection_response(created_ats: list[str]) -> ForjdResponse:
  return ForjdResponse(
    status=200,
    body=json.dumps(
      {"ok": True, "projections": [{"id": str(uuid4()), "created_at": ts} for ts in created_ats]}
    ).encode(),
    content_type="application/json",
    headers={"X-Request-ID": "forjd-live-0001"},
  )


def _consume(response: Any) -> str:
  from asgiref.sync import async_to_sync

  async def _collect() -> bytes:
    return b"".join([chunk async for chunk in response.streaming_content])

  return async_to_sync(_collect)().decode()


# --- Auth and gating ---
@pytest.mark.django_db
def test_live_stream_requires_authentication(client: Client) -> None:
  response = client.get(LIVE_PATH)
  assert response.status_code in (401, 403)


@pytest.mark.django_db
@override_settings(FORJD_SERVICE_TOKEN=SERVICE_TOKEN, FORJD_READ_MODE="off")
def test_live_stream_fails_closed_when_reads_disabled(client: Client) -> None:
  username = f"live{uuid4().hex[:8]}"
  _user, tenant_id = _mapped_actor(username)
  with override_settings(FORJD_TENANT_ID=tenant_id):
    response = client.get(LIVE_PATH, HTTP_AUTHORIZATION=_authorization(username))
  assert response.status_code == 503
  assert json.loads(response.content)["code"] == "forjd_reads_disabled"


@pytest.mark.django_db
@override_settings(FORJD_SERVICE_TOKEN=SERVICE_TOKEN, DEML_LIVE_UPDATES_ENABLED=False)
def test_live_stream_can_be_disabled(client: Client) -> None:
  username = f"live{uuid4().hex[:8]}"
  _user, tenant_id = _mapped_actor(username)
  with override_settings(FORJD_TENANT_ID=tenant_id):
    response = client.get(LIVE_PATH, HTTP_AUTHORIZATION=_authorization(username))
  assert response.status_code == 503
  assert json.loads(response.content)["code"] == "live_updates_disabled"


@pytest.mark.django_db
def test_live_stream_rejects_non_get(client: Client) -> None:
  response = client.post(LIVE_PATH)
  assert response.status_code == 405


# --- Stream behavior (bounded, cursor-driven, payload-free) ---
@pytest.mark.django_db
@override_settings(FORJD_SERVICE_TOKEN=SERVICE_TOKEN, FORJD_READ_MODE="forjd")
@patch("forjd.live._max_stream_seconds", return_value=0.2)
@patch("forjd.live._poll_seconds", return_value=0.01)
@patch("forjd.live.ForjdClient.proxy", new_callable=AsyncMock)
def test_live_stream_emits_ready_and_projection_events(
  mock_proxy: AsyncMock,
  _poll: Any,
  _max: Any,
  client: Client,
) -> None:
  username = f"live{uuid4().hex[:8]}"
  _user, tenant_id = _mapped_actor(username)

  responses = [
    _projection_response(["2026-07-19T00:00:00+00:00"]),  # initial DESC high-water mark
    _projection_response(["2026-07-19T00:00:05+00:00", "2026-07-19T00:00:07+00:00"]),
  ]

  async def _side_effect(*_args: Any, **_kwargs: Any) -> ForjdResponse:
    if responses:
      return responses.pop(0)
    return _projection_response([])

  mock_proxy.side_effect = _side_effect

  with override_settings(FORJD_TENANT_ID=tenant_id):
    response = client.get(LIVE_PATH, HTTP_AUTHORIZATION=_authorization(username))
    assert response.status_code == 200
    assert response["Content-Type"] == "text/event-stream"
    body = _consume(response)

  assert "event: ready" in body
  assert "event: projections" in body
  assert '"count":2' in body
  # Cursor advanced to the newest ASC row.
  assert "2026-07-19T00:00:07+00:00" in body
  assert "event: end" in body
  # The stream never carries projection payloads or credentials.
  assert "fjsvc_" not in body
  assert '"projections":[' not in body

  # Every upstream poll was tenant-bound.
  for call in mock_proxy.await_args_list:
    assert f"tenant_id={tenant_id}" in call.kwargs["query_string"]


@pytest.mark.django_db
@override_settings(FORJD_SERVICE_TOKEN=SERVICE_TOKEN, FORJD_READ_MODE="forjd")
@patch("forjd.live.ForjdClient.proxy", new_callable=AsyncMock)
def test_live_stream_degrades_typed_on_upstream_failure(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  username = f"live{uuid4().hex[:8]}"
  _user, tenant_id = _mapped_actor(username)
  mock_proxy.return_value = ForjdResponse(
    status=503,
    body=b'{"detail":"unavailable"}',
    content_type="application/json",
    headers={},
  )

  with override_settings(FORJD_TENANT_ID=tenant_id):
    response = client.get(LIVE_PATH, HTTP_AUTHORIZATION=_authorization(username))
    assert response.status_code == 200
    body = _consume(response)

  assert "event: degraded" in body
  assert '"code":"forjd_degraded"' in body


@pytest.mark.django_db
@override_settings(FORJD_SERVICE_TOKEN=SERVICE_TOKEN, FORJD_READ_MODE="forjd")
@patch("forjd.live._credential_for_request", new_callable=AsyncMock)
def test_live_stream_maps_auth_failures_distinctly_from_degraded(
  mock_credential: AsyncMock,
  client: Client,
) -> None:
  """Auth/policy denials must not be labeled forjd_degraded (Angular UX)."""
  from forjd.views import AdapterError

  username = f"live{uuid4().hex[:8]}"
  _user, tenant_id = _mapped_actor(username)
  mock_credential.side_effect = AdapterError(403, "role not authorized")

  with override_settings(FORJD_TENANT_ID=tenant_id):
    response = client.get(LIVE_PATH, HTTP_AUTHORIZATION=_authorization(username))

  assert response.status_code == 403
  payload = json.loads(response.content)
  assert payload.get("code") == "forjd_forbidden"
  assert payload.get("code") != "forjd_degraded"
