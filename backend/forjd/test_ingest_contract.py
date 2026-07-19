from __future__ import annotations

import base64
import hashlib
import json
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID, uuid4

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import Client, override_settings
from monitor.models import ForjdTenantMapping

from forjd.client import ForjdResponse
from forjd.limits import MAX_INGEST_BATCH_EVENTS, MAX_INGEST_BODY_BYTES

User = get_user_model()
SERVICE_TOKEN = "fjsvc_deadbeef_test-secret"  # pragma: allowlist secret


def _mapped_actor(username: str, role: str = "Operator") -> tuple[Any, UUID]:
  user = User.objects.create_user(username=username)
  user.profile.role = role
  user.profile.save(update_fields=["role"])
  tenant_id = uuid4()
  ForjdTenantMapping.objects.create(
    deml_account_id=user.profile.account_id,
    forjd_tenant_id=tenant_id,
  )
  return user, tenant_id


def _authorization(username: str) -> str:
  return f"Bearer mock-token-{username}-{username}@example.com"


def _sealed_event(tenant_id: UUID, index: int, ciphertext: bytes = b"sealed-event-body-1") -> dict:
  encoded_ciphertext = base64.b64encode(ciphertext).decode()
  return {
    "tenant_id": str(tenant_id),
    "client_event_id": f"contract-event-{index}",
    "content_type": "application/forjd-telemetry+v1",
    "event_type": "deml.metric",
    "schema_version": 1,
    "workflow_id": "deml_telemetry",
    "encryption": {"mode": "e2ee", "algo": "aes-256-gcm"},
    "envelope": {
      "algo": "aes-256-gcm",
      "key_id": "contract-key-1",
      "nonce": base64.b64encode(b"0123456789ab").decode(),
      "ciphertext": encoded_ciphertext,
      "ciphertext_sha256": hashlib.sha256(ciphertext).hexdigest(),
    },
    "metadata": {"source": "deml-web", "channel": "telemetry"},
  }


@pytest.mark.django_db
@override_settings(
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_READ_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_processing_status_is_tenant_bound_through_deml(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  username = "processingstatus"
  _user, tenant_id = _mapped_actor(username, role="Viewer")
  batch_id = uuid4()
  mock_proxy.return_value = ForjdResponse(
    status=200,
    body=json.dumps(
      {
        "ok": True,
        "batch": {
          "id": str(batch_id),
          "tenant_id": str(tenant_id),
          "status": "completed",
        },
      }
    ).encode(),
    content_type="application/json",
    headers={"X-Request-ID": "forjd-processing-0001"},
  )

  with override_settings(FORJD_TENANT_ID=str(tenant_id)):
    response = client.get(
      f"/api/v1/ingest/processing/{batch_id}",
      HTTP_AUTHORIZATION=_authorization(username),
    )

  assert response.status_code == 200
  assert response.json()["batch"]["status"] == "completed"
  assert response["X-FORJD-Request-ID"] == "forjd-processing-0001"
  call = mock_proxy.await_args
  assert call.args == ("GET", f"/api/v1/ingest/processing/{batch_id}")
  assert call.kwargs["query_string"] == f"tenant_id={tenant_id}"


@pytest.mark.django_db
@override_settings(FORJD_SERVICE_TOKEN=SERVICE_TOKEN, FORJD_READ_MODE="forjd")
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_processing_status_rejects_tenant_override(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  username = "processingoverride"
  _user, tenant_id = _mapped_actor(username, role="Viewer")

  with override_settings(FORJD_TENANT_ID=str(tenant_id)):
    response = client.get(
      f"/api/v1/ingest/processing/{uuid4()}?tenant_id={uuid4()}",
      HTTP_AUTHORIZATION=_authorization(username),
    )

  assert response.status_code == 403
  mock_proxy.assert_not_awaited()


@pytest.mark.django_db
@override_settings(
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_WRITE_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_native_batch_rejects_more_than_forjd_event_limit(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  username = "batchlimit"
  _user, tenant_id = _mapped_actor(username)
  payload = {
    "events": [_sealed_event(tenant_id, index) for index in range(MAX_INGEST_BATCH_EVENTS + 1)]
  }

  with override_settings(FORJD_TENANT_ID=str(tenant_id)):
    response = client.post(
      "/api/v1/ingest/events:batch",
      data=payload,
      content_type="application/json",
      HTTP_AUTHORIZATION=_authorization(username),
    )

  assert response.status_code == 422
  mock_proxy.assert_not_awaited()


@pytest.mark.django_db
@override_settings(
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_WRITE_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_native_ingest_accepts_valid_body_above_django_global_limit(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  username = "batchbodylimit"
  _user, tenant_id = _mapped_actor(username)
  ciphertext = b"A" * 600_000
  body = json.dumps(
    {"events": [_sealed_event(tenant_id, index, ciphertext) for index in range(4)]},
    separators=(",", ":"),
  ).encode()
  assert settings.DATA_UPLOAD_MAX_MEMORY_SIZE < len(body) < MAX_INGEST_BODY_BYTES
  mock_proxy.return_value = ForjdResponse(
    status=200,
    body=b'{"ok":true,"accepted":4}',
    content_type="application/json",
  )

  with override_settings(FORJD_TENANT_ID=str(tenant_id)):
    response = client.generic(
      "POST",
      "/api/v1/ingest/events:batch",
      data=body,
      content_type="application/json",
      HTTP_AUTHORIZATION=_authorization(username),
    )

  assert response.status_code == 200
  assert response.json()["accepted"] == 4
  assert len(mock_proxy.await_args.kwargs["body"]) > settings.DATA_UPLOAD_MAX_MEMORY_SIZE


@pytest.mark.django_db
@override_settings(
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_WRITE_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
)
@patch("forjd.api.ForjdClient.request_json", new_callable=AsyncMock)
def test_generated_ingest_alias_accepts_same_endpoint_scoped_body_limit(
  mock_request_json: AsyncMock,
  client: Client,
) -> None:
  username = "generatedbatchbodylimit"
  _user, tenant_id = _mapped_actor(username)
  ciphertext = b"B" * 600_000
  body = json.dumps(
    {"events": [_sealed_event(tenant_id, index, ciphertext) for index in range(4)]},
    separators=(",", ":"),
  ).encode()
  assert settings.DATA_UPLOAD_MAX_MEMORY_SIZE < len(body) < MAX_INGEST_BODY_BYTES
  mock_request_json.return_value = {"ok": True, "accepted": 4}

  with override_settings(FORJD_TENANT_ID=str(tenant_id)):
    response = client.generic(
      "POST",
      "/api/v1/forjd/ingest/events:batch",
      data=body,
      content_type="application/json",
      HTTP_AUTHORIZATION=_authorization(username),
    )

  assert response.status_code == 200
  assert response.json()["accepted"] == 4
  assert len(mock_request_json.await_args.kwargs["payload"]["events"]) == 4


@pytest.mark.django_db
@override_settings(
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_WRITE_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_native_ingest_rejects_body_above_forjd_hard_limit(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  username = "batchhardlimit"
  _user, tenant_id = _mapped_actor(username)
  body = b"{" + (b" " * MAX_INGEST_BODY_BYTES) + b"}"

  with override_settings(FORJD_TENANT_ID=str(tenant_id)):
    response = client.generic(
      "POST",
      "/api/v1/ingest/events:batch",
      data=body,
      content_type="application/json",
      HTTP_AUTHORIZATION=_authorization(username),
    )

  assert response.status_code == 413
  assert response.json() == {
    "detail": "Ingest request body exceeds the hard byte limit",
    "code": "ingest_body_too_large",
    "limit_bytes": MAX_INGEST_BODY_BYTES,
  }
  assert response["X-Max-Body-Bytes"] == str(MAX_INGEST_BODY_BYTES)
  mock_proxy.assert_not_awaited()
