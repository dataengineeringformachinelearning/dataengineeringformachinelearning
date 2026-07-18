"""Cutover phase flags — dual-write shadow + dual-read Angular-stable fallbacks."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.test import Client, override_settings
from monitor.models import ForjdShadowReceipt, ForjdTenantMapping

from forjd.client import ForjdError, ForjdResponse
from forjd.cutover import empty_read_envelope, read_mode, write_mode

User = get_user_model()


def _mapped_user(username: str = "cutover") -> tuple[object, object]:
  user = User.objects.create_user(username=username)
  tenant_id = uuid4()
  ForjdTenantMapping.objects.create(
    deml_account_id=user.profile.account_id,
    forjd_tenant_id=tenant_id,
  )
  return user, tenant_id


def _sealed(tenant_id: object) -> dict[str, object]:
  return {
    "tenant_id": str(tenant_id),
    "client_event_id": "cutover-event-1",
    "content_type": "application/forjd-telemetry+v1",
    "event_type": "deml.metric",
    "schema_version": 1,
    "workflow_id": "deml_telemetry",
    "encryption": {"mode": "e2ee", "algo": "aes-256-gcm"},
    "envelope": {
      "algo": "aes-256-gcm",
      "key_id": "key-1",
      "nonce": "AAAAAAAAAAAAAAAA",
      "ciphertext": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      "ciphertext_sha256": "9d908ecfb6b256def8b49a7c504e6c889c4b0e41fe6ce3e01863dd7b61a20aa0",  # pragma: allowlist secret
    },
    "metadata": {"source": "deml-web", "channel": "telemetry"},
  }


@override_settings(FORJD_CUTOVER_PHASE="0")
def test_phase_zero_presets() -> None:
  assert write_mode() == "dual"
  assert read_mode() == "off"


@override_settings(FORJD_CUTOVER_PHASE="", FORJD_WRITE_MODE="forjd", FORJD_READ_MODE="forjd")
def test_explicit_modes_when_phase_unset() -> None:
  assert write_mode() == "forjd"
  assert read_mode() == "forjd"


def test_empty_read_envelope_shapes() -> None:
  assert "items" in empty_read_envelope("/api/v1/projections")
  assert "checkpoints" in empty_read_envelope("/api/v1/projections/checkpoints")


@pytest.mark.django_db
@override_settings(
  FORJD_CUTOVER_PHASE="0",
  FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
)
def test_phase_zero_projections_return_empty_without_forjd_call(client: Client) -> None:
  _user, tenant_id = _mapped_user()

  with (
    override_settings(FORJD_TENANT_ID=str(tenant_id)),
    patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock) as mock_proxy,
  ):
    response = client.get(
      "/api/v1/projections",
      HTTP_AUTHORIZATION="Bearer mock-token-cutover-cutover@example.com",
    )

  assert response.status_code == 200
  body = response.json()
  assert body["code"] == "forjd_read_fallback"
  assert body["items"] == []
  mock_proxy.assert_not_awaited()


@pytest.mark.django_db
@override_settings(
  FORJD_CUTOVER_PHASE="1",
  FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
)
def test_dual_read_falls_back_on_forjd_outage(client: Client) -> None:
  # mock-token-<uid>-<email> — uid must be a single hyphen segment (see middleware).
  _user, tenant_id = _mapped_user("dualread")

  with (
    override_settings(FORJD_TENANT_ID=str(tenant_id)),
    patch(
      "forjd.views.ForjdClient.proxy",
      new_callable=AsyncMock,
      side_effect=ForjdError(502, "FORJD is unavailable"),
    ),
  ):
    response = client.get(
      "/api/v1/projections",
      HTTP_AUTHORIZATION="Bearer mock-token-dualread-dualread@example.com",
    )

  assert response.status_code == 200
  assert response.json()["code"] == "forjd_read_fallback"


@pytest.mark.django_db
@override_settings(
  FORJD_CUTOVER_PHASE="0",
  FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
)
def test_dual_write_records_shadow_receipt(client: Client) -> None:
  _user, tenant_id = _mapped_user("dualwrite")

  with (
    override_settings(FORJD_TENANT_ID=str(tenant_id)),
    patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock) as mock_proxy,
  ):
    mock_proxy.return_value = ForjdResponse(
      status=200,
      body=b'{"ok":true,"accepted":1}',
      content_type="application/json",
    )
    response = client.post(
      "/api/v1/ingest",
      data=_sealed(tenant_id),
      content_type="application/json",
      HTTP_AUTHORIZATION="Bearer mock-token-dualwrite-dualwrite@example.com",
    )

  assert response.status_code == 200
  receipt = ForjdShadowReceipt.objects.get(client_event_id="cutover-event-1")
  assert receipt.forjd_ok is True
  assert receipt.ciphertext_sha256.startswith("9d90")
  forwarded = json.loads(mock_proxy.await_args.kwargs["body"])
  assert forwarded["workflow_id"] == "threat_telemetry"


@pytest.mark.django_db
@override_settings(
  FORJD_WRITE_MODE="off",
  FORJD_READ_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
  FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
)
def test_writes_disabled_returns_503(client: Client) -> None:
  _user, tenant_id = _mapped_user("writeoff")

  with (
    override_settings(FORJD_TENANT_ID=str(tenant_id)),
    patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock) as mock_proxy,
  ):
    response = client.post(
      "/api/v1/ingest",
      data=_sealed(tenant_id),
      content_type="application/json",
      HTTP_AUTHORIZATION="Bearer mock-token-writeoff-writeoff@example.com",
    )

  assert response.status_code == 503
  assert response.json()["code"] == "forjd_writes_disabled"
  mock_proxy.assert_not_awaited()
