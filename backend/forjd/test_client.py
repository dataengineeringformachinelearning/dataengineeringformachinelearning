from __future__ import annotations

import json
from typing import Any, Final
from unittest.mock import patch
from uuid import uuid4

import pytest
from django.test import override_settings

from forjd.client import ForjdClient, ForjdError

TENANT_ID: Final[str] = "2af44174-6332-4f37-8129-684ed84a87dc"
SERVICE_TOKEN: Final[str] = "fjsvc_deadbeef_test-secret"  # pragma: allowlist secret


class _FakeResponse:
  def __init__(self, body: bytes = b'{"ok": true}') -> None:
    self.status = 200
    self.body = body
    self.headers = {"Content-Type": "application/json"}

  async def __aenter__(self) -> _FakeResponse:
    return self

  async def __aexit__(self, *args: object) -> None:
    return None

  async def read(self) -> bytes:
    return self.body


class _FakeSession:
  def __init__(self) -> None:
    self.requests: list[dict[str, Any]] = []

  async def __aenter__(self) -> _FakeSession:
    return self

  async def __aexit__(self, *args: object) -> None:
    return None

  def request(
    self,
    method: str,
    url: str,
    *,
    data: bytes | None,
    headers: dict[str, str],
  ) -> _FakeResponse:
    self.requests.append(
      {
        "method": method,
        "url": url,
        "data": data,
        "headers": headers,
      }
    )
    return _FakeResponse()


@pytest.mark.asyncio
@override_settings(
  FORJD_API_URL="https://forjd.example",
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_TENANT_ID=TENANT_ID,
)
async def test_proxy_uses_opaque_bearer_token_and_optional_request_id() -> None:
  session = _FakeSession()
  payload = {"tenant_id": TENANT_ID, "ciphertext": "sealed"}

  with patch("forjd.client.aiohttp.ClientSession", return_value=session):
    response = await ForjdClient().proxy(
      "POST",
      "/api/v1/ingest",
      body=json.dumps(payload).encode(),
      request_id="629fb242-a45a-4bf1-b092-bd9599a02424",
    )

  assert response.status == 200
  assert len(session.requests) == 1
  request = session.requests[0]
  assert request["url"] == "https://forjd.example/api/v1/ingest"
  assert request["headers"]["Authorization"] == f"Bearer {SERVICE_TOKEN}"
  assert request["headers"]["X-Request-ID"] == "629fb242-a45a-4bf1-b092-bd9599a02424"
  assert not any(header.startswith("X-DEML-") for header in request["headers"])


@pytest.mark.asyncio
@override_settings(
  FORJD_API_URL="https://forjd.example",
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_TENANT_ID=TENANT_ID,
)
async def test_proxy_omits_request_id_when_not_provided() -> None:
  session = _FakeSession()

  with patch("forjd.client.aiohttp.ClientSession", return_value=session):
    await ForjdClient().proxy("GET", "/health")

  assert "X-Request-ID" not in session.requests[0]["headers"]
  assert "Content-Type" not in session.requests[0]["headers"]


@pytest.mark.asyncio
@override_settings(
  FORJD_API_URL="https://forjd.example",
  FORJD_SERVICE_TOKEN="",
  FORJD_TENANT_ID="",
)
async def test_public_proxy_requires_no_tenant_credentials_and_sends_no_authorization() -> None:
  session = _FakeSession()

  with patch("forjd.client.aiohttp.ClientSession", return_value=session):
    await ForjdClient(use_service_auth=False).proxy("GET", "/health")

  assert session.requests[0]["url"] == "https://forjd.example/health"
  assert "Authorization" not in session.requests[0]["headers"]


@pytest.mark.asyncio
@override_settings(
  FORJD_API_URL="https://forjd.example",
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_TENANT_ID=TENANT_ID,
)
async def test_ingest_rejects_cross_tenant_payload_without_network_call() -> None:
  session = _FakeSession()
  payload = {"tenant_id": str(uuid4()), "ciphertext": "sealed"}

  with (
    patch("forjd.client.aiohttp.ClientSession", return_value=session),
    pytest.raises(ForjdError) as error,
  ):
    await ForjdClient().ingest(payload)

  assert error.value.status == 403
  assert session.requests == []


@pytest.mark.asyncio
@override_settings(
  FORJD_API_URL="https://forjd.example",
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_TENANT_ID=TENANT_ID,
)
async def test_proxy_rejects_cross_tenant_query_without_network_call() -> None:
  session = _FakeSession()

  with (
    patch("forjd.client.aiohttp.ClientSession", return_value=session),
    pytest.raises(ForjdError) as error,
  ):
    await ForjdClient().proxy(
      "GET",
      "/api/v1/projections",
      query_string=f"tenant_id={uuid4()}&workflow_id=deml_telemetry",
    )

  assert error.value.status == 403
  assert session.requests == []


@pytest.mark.asyncio
@override_settings(
  FORJD_API_URL="https://forjd.example",
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_TENANT_ID=TENANT_ID,
)
async def test_proxy_rejects_invalid_json_body_without_network_call() -> None:
  session = _FakeSession()

  with (
    patch("forjd.client.aiohttp.ClientSession", return_value=session),
    pytest.raises(ForjdError) as error,
  ):
    await ForjdClient().proxy(
      "POST",
      "/api/v1/projections/run",
      body=b"{not-json",
      content_type="application/json",
    )

  assert error.value.status == 400
  assert session.requests == []


@pytest.mark.asyncio
@pytest.mark.parametrize(
  "service_token",
  ["", "firebase-token", "fjsvc_", "fjsvc_short_secret", "fjsvc_12345678_", "fjsvc_bad\nvalue"],
)
@override_settings(FORJD_API_URL="https://forjd.example", FORJD_TENANT_ID=TENANT_ID)
async def test_proxy_rejects_missing_or_invalid_service_token(service_token: str) -> None:
  client = ForjdClient(service_token=service_token)

  with pytest.raises(ForjdError) as error:
    await client.proxy("GET", "/health")

  assert error.value.status == 503


@pytest.mark.asyncio
@override_settings(
  FORJD_API_URL="https://forjd.example",
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_TENANT_ID="",
)
async def test_proxy_rejects_missing_tenant_binding() -> None:
  with pytest.raises(ForjdError, match="FORJD_TENANT_ID is not configured") as error:
    await ForjdClient().proxy("GET", "/health")

  assert error.value.status == 503


@override_settings(FORJD_SERVICE_TOKEN=SERVICE_TOKEN, FORJD_TENANT_ID="invalid")
def test_constructor_rejects_invalid_tenant_binding() -> None:
  with pytest.raises(ForjdError, match="FORJD_TENANT_ID must be a valid UUID") as error:
    ForjdClient()

  assert error.value.status == 503


@pytest.mark.asyncio
@override_settings(
  FORJD_API_URL="https://forjd.example",
  FORJD_SERVICE_TOKEN="",
  FORJD_TENANT_ID="",
)
async def test_constructor_overrides_bind_per_tenant_credentials() -> None:
  session = _FakeSession()
  client = ForjdClient(tenant_id=TENANT_ID.upper(), service_token=SERVICE_TOKEN)

  with patch("forjd.client.aiohttp.ClientSession", return_value=session):
    await client.proxy("GET", "/api/v1/ingest/results", query_string=f"tenant_id={TENANT_ID}")

  assert client.tenant_id == TENANT_ID
  assert session.requests[0]["headers"]["Authorization"] == f"Bearer {SERVICE_TOKEN}"


@pytest.mark.asyncio
@override_settings(
  FORJD_API_URL="https://forjd.example",
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_TENANT_ID=TENANT_ID,
)
async def test_list_projections_binds_tenant_query() -> None:
  session = _FakeSession()

  with patch("forjd.client.aiohttp.ClientSession", return_value=session):
    await ForjdClient().list_projections(workflow_id="deml_telemetry", limit=25)

  assert len(session.requests) == 1
  assert session.requests[0]["method"] == "GET"
  assert session.requests[0]["url"].startswith("https://forjd.example/api/v1/projections?")
  assert f"tenant_id={TENANT_ID}" in session.requests[0]["url"]
  assert "workflow_id=threat_telemetry" in session.requests[0]["url"]
  assert session.requests[0]["headers"]["Authorization"] == f"Bearer {SERVICE_TOKEN}"


@pytest.mark.asyncio
@override_settings(
  FORJD_API_URL="https://forjd.example",
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_TENANT_ID=TENANT_ID,
)
async def test_erase_tenant_posts_confirm_and_uses_bound_tenant() -> None:
  session = _FakeSession()

  with patch("forjd.client.aiohttp.ClientSession", return_value=session):
    await ForjdClient().erase_tenant(TENANT_ID)

  assert len(session.requests) == 1
  request = session.requests[0]
  assert request["method"] == "POST"
  assert request["url"] == f"https://forjd.example/api/v1/tenants/{TENANT_ID}/erase"
  body = json.loads(request["data"].decode())
  assert body == {"confirm_tenant_id": TENANT_ID}


@pytest.mark.asyncio
@override_settings(
  FORJD_API_URL="https://forjd.example",
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_TENANT_ID=TENANT_ID,
)
async def test_erase_rejects_cross_tenant_confirm_without_network_call() -> None:
  session = _FakeSession()
  other = str(uuid4())

  with (
    patch("forjd.client.aiohttp.ClientSession", return_value=session),
    pytest.raises(ForjdError) as error,
  ):
    await ForjdClient().proxy(
      "POST",
      f"/api/v1/tenants/{TENANT_ID}/erase",
      body=json.dumps({"confirm_tenant_id": other}).encode(),
    )

  assert error.value.status == 403
  assert session.requests == []


def test_redact_forjd_secrets_strips_tokens() -> None:
  from forjd.client import redact_forjd_secrets

  raw = f"upstream said Bearer {SERVICE_TOKEN} and {SERVICE_TOKEN}"
  redacted = redact_forjd_secrets(raw)
  assert SERVICE_TOKEN not in redacted
  assert "fjsvc_[REDACTED]" in redacted
  assert "Bearer [REDACTED]" in redacted
