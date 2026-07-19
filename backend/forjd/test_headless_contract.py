from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.test import Client, override_settings
from monitor.models import APIKey, ForjdTenantMapping

from forjd.client import ForjdResponse

User = get_user_model()
SERVICE_TOKEN = "fjsvc_deadbeef_test-secret"  # pragma: allowlist secret


def _mapped_actor(username: str, role: str) -> tuple[Any, str]:
  user = User.objects.create_user(username=username)
  user.profile.role = role
  # Headless contract writes exercise Pro-gated actions; grant Pro for binding tests.
  user.profile.tier = "Pro"
  user.profile.subscription_active = True
  user.profile.save(update_fields=["role", "tier", "subscription_active"])
  tenant_id = uuid4()
  ForjdTenantMapping.objects.create(
    deml_account_id=user.profile.account_id,
    forjd_tenant_id=tenant_id,
  )
  return user, str(tenant_id)


def _authorization(username: str) -> str:
  return f"Bearer mock-token-{username}-{username}@example.com"


@pytest.mark.django_db
@pytest.mark.parametrize(("received", "expected_status"), [("1.0", 200), ("2.0", 503)])
@override_settings(FORJD_REQUIRED_CONTRACT_VERSION="1.0")
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_capability_probe_enforces_contract_version(
  mock_proxy: AsyncMock,
  client: Client,
  received: str,
  expected_status: int,
) -> None:
  mock_proxy.return_value = ForjdResponse(
    status=200,
    body=json.dumps(
      {
        "contract_version": received,
        "service": "forjd",
        "service_version": "2026.7",
        "authentication": {"service_tokens": True},
        "capabilities": {"siem": True, "soar": True},
        "limits": {"max_page_size": 500},
        "reliability": {"request_id": True},
      }
    ).encode(),
    content_type="application/json",
    headers={"X-Request-ID": "forjd-probe-0001"},
  )
  mock_proxy.side_effect = [
    mock_proxy.return_value,
    ForjdResponse(
      status=200,
      body=b'{"status":"ready","checks":{"database":true}}',
      content_type="application/json",
      headers={"X-Request-ID": "forjd-ready-0001"},
    ),
  ]

  response = client.get("/api/v1/forjd/capabilities")

  assert response.status_code == expected_status
  assert response.json()["contract_version"] == received
  assert response["X-FORJD-Request-ID"] == "forjd-probe-0001"


@pytest.mark.django_db
@override_settings(FORJD_REQUIRED_CONTRACT_VERSION="1.0")
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_capability_probe_does_not_report_ready_when_runtime_is_degraded(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  mock_proxy.side_effect = [
    ForjdResponse(
      status=200,
      body=b'{"contract_version":"1.0","service":"forjd","capabilities":{}}',
      content_type="application/json",
      headers={"X-Request-ID": "forjd-probe-0002"},
    ),
    ForjdResponse(
      status=503,
      body=b'{"status":"not_ready","checks":{"database":false}}',
      content_type="application/json",
      headers={"X-Request-ID": "forjd-ready-0002"},
    ),
  ]

  response = client.get("/api/v1/forjd/capabilities")

  assert response.status_code == 503
  assert response.json()["status"] == "degraded"
  assert response.json()["runtime"]["checks"]["database"] is False


@pytest.mark.django_db
@pytest.mark.parametrize(
  ("method", "path", "role", "upstream_path", "payload", "upstream_body"),
  [
    (
      "get",
      "/api/v1/analytics/incidents",
      "Viewer",
      "/api/v1/soc/cases",
      None,
      {"cases": [{"id": "case-1", "title": "Signal", "status": "open"}]},
    ),
    (
      "patch",
      "/api/v1/analytics/incidents/case-1",
      "Operator",
      "/api/v1/soc/cases/case-1",
      {"status": "False Positive"},
      {"case": {"id": "case-1", "title": "Signal", "status": "false_positive"}},
    ),
    (
      "get",
      "/api/v1/analytics/playbooks",
      "Viewer",
      "/api/v1/playbooks",
      None,
      {"playbooks": [{"id": "playbook-1", "name": "Contain", "is_active": True}]},
    ),
    (
      "patch",
      "/api/v1/analytics/playbooks/playbook-1",
      "Security Admin",
      "/api/v1/playbooks/playbook-1",
      {"is_active": False},
      {"playbook": {"id": "playbook-1", "name": "Contain", "is_active": False}},
    ),
    (
      "post",
      "/api/v1/analytics/playbooks/playbook-1/execute",
      "Operator",
      "/api/v1/playbooks/playbook-1/execute",
      {},
      {"run": {"id": "run-1", "status": "completed", "actions": [{"id": "a1"}]}},
    ),
    (
      "get",
      "/api/v1/analytics/playbook-runs",
      "Viewer",
      "/api/v1/playbooks/runs",
      None,
      {"runs": [{"id": "run-1", "playbook_id": "playbook-1", "status": "completed"}]},
    ),
    (
      "get",
      "/api/v1/siem/signals",
      "Viewer",
      "/api/v1/siem/signals",
      None,
      {"signals": [{"id": "signal-1", "severity": "high"}]},
    ),
    (
      "post",
      "/api/v1/agent/vulnerabilities",
      "Operator",
      "/api/v1/vulnerabilities",
      {"title": "CVE", "description": "test", "severity": "Critical"},
      {"vulnerability": {"id": "vuln-1", "title": "CVE", "severity": "critical"}},
    ),
  ],
)
@override_settings(
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_READ_MODE="forjd",
  FORJD_WRITE_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_headless_route_contracts_are_tenant_bound_and_typed(
  mock_proxy: AsyncMock,
  client: Client,
  method: str,
  path: str,
  role: str,
  upstream_path: str,
  payload: dict[str, object] | None,
  upstream_body: dict[str, object],
) -> None:
  username = f"contract{uuid4().hex[:8]}"
  _user, tenant_id = _mapped_actor(username, role)
  mock_proxy.return_value = ForjdResponse(
    status=200,
    body=json.dumps(upstream_body).encode(),
    content_type="application/json",
    headers={"X-Request-ID": "forjd-contract-0001"},
  )

  with override_settings(FORJD_TENANT_ID=tenant_id):
    response = getattr(client, method)(
      path,
      data=payload or {},
      content_type="application/json",
      HTTP_AUTHORIZATION=_authorization(username),
    )

  assert response.status_code == 200
  assert response["X-FORJD-Request-ID"] == "forjd-contract-0001"
  call = mock_proxy.await_args
  assert call.args == (method.upper(), upstream_path)
  if method == "get":
    assert f"tenant_id={tenant_id}" in call.kwargs["query_string"]
  else:
    outbound = json.loads(call.kwargs["body"])
    assert outbound["tenant_id"] == tenant_id


@pytest.mark.django_db
@override_settings(
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_READ_MODE="forjd",
  FORJD_WRITE_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_authorization_only_headless_write_does_not_require_csrf_cookie(
  mock_proxy: AsyncMock,
) -> None:
  """Bearer-authenticated automation must work with Django CSRF enforcement enabled."""
  username = "csrfheadless"
  _user, tenant_id = _mapped_actor(username, "Operator")
  mock_proxy.return_value = ForjdResponse(
    status=200,
    body=b'{"signal":{"id":"signal-1","severity":"high"}}',
    content_type="application/json",
    headers={"X-Request-ID": "forjd-csrf-0001"},
  )

  with override_settings(FORJD_TENANT_ID=tenant_id):
    response = Client(enforce_csrf_checks=True).post(
      "/api/v1/siem/signals",
      data={"source": "deml", "title": "Headless signal", "severity": "high"},
      content_type="application/json",
      HTTP_AUTHORIZATION=_authorization(username),
    )

  assert response.status_code == 200
  assert response.json()["id"] == "signal-1"
  assert response["X-FORJD-Request-ID"] == "forjd-csrf-0001"


@pytest.mark.django_db
@override_settings(
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_READ_MODE="forjd",
  FORJD_WRITE_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_api_key_headless_write_does_not_require_csrf_cookie(mock_proxy: AsyncMock) -> None:
  """Non-browser API keys remain a usable end-to-end headless control plane."""
  user, tenant_id = _mapped_actor("csrfapikey", "Operator")
  raw_key = "deml_cafe1234_0123456789abcdefghijklmnopqrstuvwxyz"
  api_key = APIKey(user=user, name="headless-csrf", prefix="cafe1234")
  api_key.set_key(raw_key)
  api_key.save()
  mock_proxy.return_value = ForjdResponse(
    status=200,
    body=b'{"signal":{"id":"signal-2","severity":"critical"}}',
    content_type="application/json",
    headers={"X-Request-ID": "forjd-csrf-0002"},
  )

  with override_settings(FORJD_TENANT_ID=tenant_id):
    response = Client(enforce_csrf_checks=True).post(
      "/api/v1/siem/signals",
      data={"source": "deml", "title": "API key signal", "severity": "critical"},
      content_type="application/json",
      HTTP_X_API_KEY=raw_key,
    )

  assert response.status_code == 200
  assert response.json()["id"] == "signal-2"
  assert response["X-FORJD-Request-ID"] == "forjd-csrf-0002"


@pytest.mark.django_db
@pytest.mark.parametrize(
  ("control", "payload", "expected_status", "upstream_status"),
  [
    (
      "ack",
      {
        "succeeded": True,
        "external_reference": "  ticket:SEC-42  ",
        "metadata": {"analyst_decision": "approved"},
      },
      200,
      200,
    ),
    ("retry", {}, 202, 202),
  ],
)
@override_settings(
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_WRITE_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_playbook_action_controls_are_tenant_bound_and_csrf_exempt(
  mock_proxy: AsyncMock,
  control: str,
  payload: dict[str, object],
  expected_status: int,
  upstream_status: int,
) -> None:
  username = f"action{control}"
  _user, tenant_id = _mapped_actor(username, "Operator")
  run_id = str(uuid4())
  action_result_id = str(uuid4())
  mock_proxy.return_value = ForjdResponse(
    status=upstream_status,
    body=json.dumps(
      {
        "ok": True,
        "queued": control == "retry",
        "run": {
          "id": run_id,
          "playbook_id": str(uuid4()),
          "status": "retrying" if control == "retry" else "succeeded",
          "actions": [
            {
              "id": action_result_id,
              "action_plan_key": "0000:webhook",
              "action_type": "webhook",
              "status": "retry_scheduled" if control == "retry" else "succeeded",
              "attempt": 2,
              "max_attempts": 5,
            }
          ],
        },
      }
    ).encode(),
    content_type="application/json",
    headers={"X-Request-ID": f"forjd-action-{control}-0001"},
  )

  with override_settings(FORJD_TENANT_ID=tenant_id):
    response = Client(enforce_csrf_checks=True).post(
      (f"/api/v1/analytics/playbook-runs/{run_id}/actions/{action_result_id}/{control}"),
      data=payload,
      content_type="application/json",
      HTTP_AUTHORIZATION=_authorization(username),
    )

  assert response.status_code == expected_status
  assert response["X-FORJD-Request-ID"] == f"forjd-action-{control}-0001"
  assert response.json()["run"]["actions"][0]["id"] == action_result_id
  if control == "retry":
    assert response.json()["queued"] is True
  call = mock_proxy.await_args
  assert call.args == (
    "POST",
    f"/api/v1/playbooks/runs/{run_id}/actions/{action_result_id}/{control}",
  )
  outbound = json.loads(call.kwargs["body"])
  assert outbound["tenant_id"] == tenant_id
  if control == "ack":
    assert outbound == {
      "tenant_id": tenant_id,
      "succeeded": True,
      "external_reference": "ticket:SEC-42",
      "metadata": {"analyst_decision": "approved"},
    }
  else:
    assert outbound == {"tenant_id": tenant_id}


@pytest.mark.django_db
@override_settings(
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_WRITE_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_playbook_retry_accepts_authorization_api_key_without_csrf(
  mock_proxy: AsyncMock,
) -> None:
  user, tenant_id = _mapped_actor("actionapikey", "Operator")
  raw_key = "deml_feed1234_0123456789abcdefghijklmnopqrstuvwxyz"
  api_key = APIKey(user=user, name="soar-control", prefix="feed1234")
  api_key.set_key(raw_key)
  api_key.save()
  run_id = str(uuid4())
  action_result_id = str(uuid4())
  mock_proxy.return_value = ForjdResponse(
    status=202,
    body=json.dumps(
      {
        "ok": True,
        "queued": True,
        "run": {"id": run_id, "status": "retrying", "actions": []},
      }
    ).encode(),
    content_type="application/json",
  )

  with override_settings(FORJD_TENANT_ID=tenant_id):
    response = Client(enforce_csrf_checks=True).post(
      (f"/api/v1/analytics/playbook-runs/{run_id}/actions/{action_result_id}/retry"),
      data={},
      content_type="application/json",
      HTTP_AUTHORIZATION=f"ApiKey {raw_key}",
    )

  assert response.status_code == 202
  assert json.loads(mock_proxy.await_args.kwargs["body"])["tenant_id"] == tenant_id


@pytest.mark.django_db
@override_settings(
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_WRITE_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_playbook_action_control_accepts_x_api_key_without_csrf(
  mock_proxy: AsyncMock,
) -> None:
  user, tenant_id = _mapped_actor("actionxapikey", "Operator")
  raw_key = "deml_c0de1234_0123456789abcdefghijklmnopqrstuvwxyz"
  api_key = APIKey(user=user, name="soar-control-x-header", prefix="c0de1234")
  api_key.set_key(raw_key)
  api_key.save()
  run_id = str(uuid4())
  action_result_id = str(uuid4())
  mock_proxy.return_value = ForjdResponse(
    status=202,
    body=json.dumps(
      {
        "ok": True,
        "queued": True,
        "run": {"id": run_id, "status": "retrying", "actions": []},
      }
    ).encode(),
    content_type="application/json",
  )

  with override_settings(FORJD_TENANT_ID=tenant_id):
    response = Client(enforce_csrf_checks=True).post(
      (f"/api/v1/analytics/playbook-runs/{run_id}/actions/{action_result_id}/retry"),
      data={},
      content_type="application/json",
      HTTP_X_API_KEY=raw_key,
    )

  assert response.status_code == 202
  assert json.loads(mock_proxy.await_args.kwargs["body"])["tenant_id"] == tenant_id


@pytest.mark.django_db
@pytest.mark.parametrize(
  "payload",
  [
    {},
    {"succeeded": "true"},
    {"succeeded": True, "metadata": []},
    {"succeeded": True, "metadata": {"score": float("nan")}},
    {"succeeded": True, "external_reference": 42},
    {"succeeded": True, "external_reference": "x" * 256},
    {"succeeded": True, "tenant_id": "00000000-0000-0000-0000-000000000001"},
    {"succeeded": True, "unexpected": "field"},
  ],
)
@override_settings(
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_WRITE_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_playbook_ack_rejects_non_allowlisted_or_invalid_payloads(
  mock_proxy: AsyncMock,
  client: Client,
  payload: dict[str, object],
) -> None:
  username = "actioninvalid"
  _user, tenant_id = _mapped_actor(username, "Operator")
  run_id = str(uuid4())
  action_result_id = str(uuid4())

  with override_settings(FORJD_TENANT_ID=tenant_id):
    response = client.post(
      f"/api/v1/analytics/playbook-runs/{run_id}/actions/{action_result_id}/ack",
      data=payload,
      content_type="application/json",
      HTTP_AUTHORIZATION=_authorization(username),
    )

  assert response.status_code == 422
  mock_proxy.assert_not_awaited()


@pytest.mark.django_db
@pytest.mark.parametrize(
  ("path_suffix", "payload"),
  [
    ("not-a-uuid/actions/00000000-0000-0000-0000-000000000001/retry", {}),
    (
      "00000000-0000-0000-0000-000000000001/actions/not-a-uuid/ack",
      {"succeeded": True},
    ),
    (
      "00000000-0000-0000-0000-000000000001/actions/"
      "00000000-0000-0000-0000-000000000002/retry?tenant_id="
      "00000000-0000-0000-0000-000000000003",
      {},
    ),
    (
      "00000000-0000-0000-0000-000000000001/actions/00000000-0000-0000-0000-000000000002/retry",
      {"tenant_id": "00000000-0000-0000-0000-000000000003"},
    ),
  ],
)
@override_settings(
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_WRITE_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_playbook_action_controls_reject_invalid_paths_and_tenant_injection(
  mock_proxy: AsyncMock,
  client: Client,
  path_suffix: str,
  payload: dict[str, object],
) -> None:
  username = "actionpath"
  _user, tenant_id = _mapped_actor(username, "Operator")

  with override_settings(FORJD_TENANT_ID=tenant_id):
    response = client.post(
      f"/api/v1/analytics/playbook-runs/{path_suffix}",
      data=payload,
      content_type="application/json",
      HTTP_AUTHORIZATION=_authorization(username),
    )

  assert response.status_code in {400, 422}
  mock_proxy.assert_not_awaited()


@pytest.mark.django_db
@override_settings(
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_WRITE_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_playbook_action_control_rejects_cookie_session_authentication(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  user, tenant_id = _mapped_actor("actioncookie", "Operator")
  client.force_login(user)
  run_id = str(uuid4())
  action_result_id = str(uuid4())

  with override_settings(FORJD_TENANT_ID=tenant_id):
    response = client.post(
      f"/api/v1/analytics/playbook-runs/{run_id}/actions/{action_result_id}/retry",
      data={},
      content_type="application/json",
    )

  assert response.status_code == 401
  mock_proxy.assert_not_awaited()


@pytest.mark.django_db
@pytest.mark.parametrize(
  ("role", "write_mode", "expected_status"),
  [("Viewer", "forjd", 403), ("Operator", "off", 503)],
)
@override_settings(FORJD_SERVICE_TOKEN=SERVICE_TOKEN, FORJD_CUTOVER_PHASE="")
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_playbook_action_control_enforces_rbac_and_write_gate(
  mock_proxy: AsyncMock,
  client: Client,
  role: str,
  write_mode: str,
  expected_status: int,
) -> None:
  username = f"actiongate{role.replace(' ', '').lower()}"
  _user, tenant_id = _mapped_actor(username, role)
  run_id = str(uuid4())
  action_result_id = str(uuid4())

  with override_settings(FORJD_TENANT_ID=tenant_id, FORJD_WRITE_MODE=write_mode):
    response = client.post(
      f"/api/v1/analytics/playbook-runs/{run_id}/actions/{action_result_id}/retry",
      data={},
      content_type="application/json",
      HTTP_AUTHORIZATION=_authorization(username),
    )

  assert response.status_code == expected_status
  mock_proxy.assert_not_awaited()


@pytest.mark.django_db
@override_settings(
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_WRITE_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_playbook_action_control_preserves_upstream_conflict(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  username = "actionconflict"
  _user, tenant_id = _mapped_actor(username, "Operator")
  run_id = str(uuid4())
  action_result_id = str(uuid4())
  mock_proxy.return_value = ForjdResponse(
    status=409,
    body=b'{"detail":"acknowledgement conflicts with the durable decision"}',
    content_type="application/json",
    headers={"X-Request-ID": "forjd-action-conflict-0001"},
  )

  with override_settings(FORJD_TENANT_ID=tenant_id):
    response = client.post(
      f"/api/v1/analytics/playbook-runs/{run_id}/actions/{action_result_id}/ack",
      data={"succeeded": False, "metadata": {}},
      content_type="application/json",
      HTTP_AUTHORIZATION=_authorization(username),
    )

  assert response.status_code == 409
  assert "conflicts" in response.json()["detail"]
  assert response["X-FORJD-Request-ID"] == "forjd-action-conflict-0001"


@pytest.mark.django_db
@override_settings(FORJD_READ_MODE="forjd", FORJD_CUTOVER_PHASE="")
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_steady_read_outage_is_typed_degraded_not_empty(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  username = "steadydegraded"
  _user, tenant_id = _mapped_actor(username, "Viewer")
  mock_proxy.return_value = ForjdResponse(
    status=503,
    body=b'{"detail":"database unavailable"}',
    content_type="application/json",
    headers={"X-Request-ID": "forjd-degraded-0001"},
  )

  with override_settings(FORJD_TENANT_ID=tenant_id, FORJD_SERVICE_TOKEN=SERVICE_TOKEN):
    response = client.get(
      "/api/v1/analytics/incidents",
      HTTP_AUTHORIZATION=_authorization(username),
    )

  assert response.status_code == 503
  assert response.json()["code"] == "forjd_degraded"
  assert response["X-FORJD-Request-ID"] == "forjd-degraded-0001"


@pytest.mark.django_db
@override_settings(
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_READ_MODE="forjd",
  FORJD_WRITE_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_export_create_detail_and_signed_download_are_tenant_bound(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  username = "exportcontract"
  _user, tenant_id = _mapped_actor(username, "Operator")
  job = {
    "id": "22222222-2222-2222-2222-222222222222",
    "tenant_id": tenant_id,
    "source_kind": "analytics",
    "format": "csv",
    "status": "completed",
    "byte_size": 42,
    "content_type": "text/csv; charset=utf-8",
    "attempts": 1,
    "download_ready": True,
  }
  mock_proxy.side_effect = [
    ForjdResponse(
      status=202,
      body=json.dumps({"ok": True, "job": {**job, "status": "queued"}}).encode(),
      content_type="application/json",
    ),
    ForjdResponse(
      status=200,
      body=json.dumps({"ok": True, "job": job}).encode(),
      content_type="application/json",
    ),
    ForjdResponse(
      status=200,
      body=json.dumps(
        {
          "url": "https://objects.example/signed",
          "filename_hint": "forjd-export.csv",
          "expires_in": 900,
          "checksum_sha256": "a" * 64,
          "byte_size": 42,
        }
      ).encode(),
      content_type="application/json",
    ),
  ]

  with override_settings(FORJD_TENANT_ID=tenant_id):
    created = client.post(
      "/api/v1/exports/",
      data={
        "kind": "analytics",
        "format": "csv",
        "days": 30,
        "idempotency_key": "export:test:0001",
      },
      content_type="application/json",
      HTTP_AUTHORIZATION=_authorization(username),
    )
    detail = client.get(
      f"/api/v1/exports/{job['id']}",
      HTTP_AUTHORIZATION=_authorization(username),
    )
    download = client.get(
      f"/api/v1/exports/{job['id']}/download",
      HTTP_AUTHORIZATION=_authorization(username),
    )

  assert created.status_code == 202
  assert detail.status_code == 200
  assert detail.json()["byte_size"] == 42
  assert download.status_code == 200
  assert download.json()["url"] == "https://objects.example/signed"
  create_call, detail_call, download_call = mock_proxy.await_args_list
  create_body = json.loads(create_call.kwargs["body"])
  assert create_body["tenant_id"] == tenant_id
  assert create_body["idempotency_key"] == "export:test:0001"
  assert create_body["limit"] == 10_000
  assert f"tenant_id={tenant_id}" in detail_call.kwargs["query_string"]
  assert f"tenant_id={tenant_id}" in download_call.kwargs["query_string"]


@pytest.mark.django_db
@override_settings(
  FORJD_SERVICE_TOKEN=SERVICE_TOKEN,
  FORJD_WRITE_MODE="forjd",
  FORJD_CUTOVER_PHASE="",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_pdf_export_adapter_uses_the_lossless_supported_limit(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  username = "exportpdfcontract"
  _user, tenant_id = _mapped_actor(username, "Operator")
  mock_proxy.return_value = ForjdResponse(
    status=202,
    body=json.dumps(
      {
        "ok": True,
        "job": {
          "id": str(uuid4()),
          "tenant_id": tenant_id,
          "format": "pdf",
          "status": "queued",
        },
      }
    ).encode(),
    content_type="application/json",
  )

  with override_settings(FORJD_TENANT_ID=tenant_id):
    response = client.post(
      "/api/v1/exports/",
      data={
        "kind": "analytics",
        "format": "pdf",
        "idempotency_key": "export:test:pdf1",
      },
      content_type="application/json",
      HTTP_AUTHORIZATION=_authorization(username),
    )

  assert response.status_code == 202
  create_body = json.loads(mock_proxy.await_args.kwargs["body"])
  assert create_body["limit"] == 1_000


@pytest.mark.django_db
@pytest.mark.parametrize(
  ("method", "path", "role"),
  [
    ("post", "/api/v1/projections/run", "Operator"),
    ("put", "/api/v1/system-status/status_pages/page-1", "Security Admin"),
    ("patch", "/api/v1/system-status/status_pages/page-1", "Security Admin"),
    ("delete", "/api/v1/system-status/status_pages/page-1", "Security Admin"),
  ],
)
@override_settings(FORJD_WRITE_MODE="off", FORJD_CUTOVER_PHASE="")
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_write_gate_covers_every_mutating_verb(
  mock_proxy: AsyncMock,
  client: Client,
  method: str,
  path: str,
  role: str,
) -> None:
  username = f"writegate{method}"
  _user, tenant_id = _mapped_actor(username, role)

  with override_settings(FORJD_TENANT_ID=tenant_id, FORJD_SERVICE_TOKEN=SERVICE_TOKEN):
    response = getattr(client, method)(
      path,
      data={},
      content_type="application/json",
      HTTP_AUTHORIZATION=_authorization(username),
    )

  assert response.status_code == 503
  assert response.json()["code"] == "forjd_writes_disabled"
  mock_proxy.assert_not_awaited()
