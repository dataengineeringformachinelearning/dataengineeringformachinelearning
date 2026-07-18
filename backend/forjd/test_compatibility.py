import json
from unittest.mock import AsyncMock, MagicMock, patch
from urllib.parse import parse_qs
from uuid import UUID, uuid4

import pytest
from django.contrib.auth import get_user_model
from django.test import Client, override_settings
from monitor.models import ForjdTenantMapping

from forjd.client import ForjdResponse

User = get_user_model()


def _mapped_user(username: str = "learner") -> UUID:
  user = User.objects.create_user(username=username)
  tenant_id = uuid4()
  ForjdTenantMapping.objects.create(
    deml_account_id=user.profile.account_id,
    forjd_tenant_id=tenant_id,
  )
  return tenant_id


def _sealed_event(tenant_id: UUID) -> dict[str, object]:
  return {
    "tenant_id": str(tenant_id),
    "client_event_id": "metric-event-1",
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


@pytest.mark.django_db
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_private_native_route_requires_authentication(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  response = client.get("/api/v1/projections")

  assert response.status_code == 401
  mock_proxy.assert_not_awaited()


@pytest.mark.django_db
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_private_native_route_rejects_cookie_session_without_firebase_bearer(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  user = User.objects.create_user(username="session-only")
  client.force_login(user)

  response = client.get("/api/v1/projections")

  assert response.status_code == 401
  mock_proxy.assert_not_awaited()


@pytest.mark.django_db
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_authenticated_adapter_uses_native_path_and_mapped_tenant(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  tenant_id = _mapped_user()
  mock_proxy.return_value = ForjdResponse(
    status=200,
    body=b'{"value": 42}',
    content_type="application/json",
  )

  with override_settings(
    FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
    FORJD_TENANT_ID=str(tenant_id),
  ):
    response = client.get(
      "/api/v1/projections?workflow_id=deml_telemetry&limit=25",
      HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
    )

  assert response.status_code == 200
  assert response.json() == {"value": 42}
  call = mock_proxy.await_args
  assert call.args == ("GET", "/api/v1/projections")
  assert parse_qs(call.kwargs["query_string"]) == {
    "workflow_id": ["threat_telemetry"],
    "limit": ["25"],
    "tenant_id": [str(tenant_id)],
  }
  assert UUID(call.kwargs["request_id"])
  assert "actor_headers" not in call.kwargs


@pytest.mark.django_db
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_adapter_rejects_cross_tenant_query(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  tenant_id = _mapped_user()

  with override_settings(
    FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
    FORJD_TENANT_ID=str(tenant_id),
  ):
    response = client.get(
      f"/api/v1/projections?tenant_id={uuid4()}",
      HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
    )

  assert response.status_code == 403
  mock_proxy.assert_not_awaited()


@pytest.mark.django_db
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_stable_ingest_path_forwards_only_valid_sealed_telemetry(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  tenant_id = _mapped_user()
  mock_proxy.return_value = ForjdResponse(
    status=200,
    body=b'{"ok": true, "accepted": 1}',
    content_type="application/json",
  )

  with override_settings(
    FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
    FORJD_TENANT_ID=str(tenant_id),
  ):
    response = client.post(
      "/api/v1/ingest",
      data=_sealed_event(tenant_id),
      content_type="application/json",
      HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
    )

  assert response.status_code == 200
  call = mock_proxy.await_args
  assert call.args == ("POST", "/api/v1/ingest")
  forwarded = json.loads(call.kwargs["body"])
  assert forwarded["tenant_id"] == str(tenant_id)
  assert forwarded["workflow_id"] == "threat_telemetry"
  assert forwarded["event_type"] == "threat.metric"
  assert "actor_headers" not in call.kwargs


@pytest.mark.django_db
@pytest.mark.parametrize("path", ["/api/v1/ingest", "/api/v1/ingest/events"])
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_stable_ingest_path_rejects_unshipped_learning_contract(
  mock_proxy: AsyncMock,
  client: Client,
  path: str,
) -> None:
  tenant_id = _mapped_user()
  payload = {
    **_sealed_event(tenant_id),
    "content_type": "application/vnd.deml.learning-event+json;version=1",
    "event_type": "lesson.started",
    "workflow_id": "deml_learning_v1",
  }

  with override_settings(
    FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
    FORJD_TENANT_ID=str(tenant_id),
  ):
    response = client.post(
      path,
      data=payload,
      content_type="application/json",
      HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
    )

  assert response.status_code == 422
  mock_proxy.assert_not_awaited()


@pytest.mark.django_db
@pytest.mark.parametrize(
  ("path", "target_path"),
  [
    ("/api/v1/system-status/health", "/health"),
    ("/api/v1/system-status/ready", "/ready"),
  ],
)
@patch("forjd.views.ForjdClient")
def test_public_probes_use_shipped_forjd_paths_without_tenant_credentials(
  mock_client: MagicMock,
  client: Client,
  path: str,
  target_path: str,
) -> None:
  mock_proxy = AsyncMock()
  mock_proxy.return_value = ForjdResponse(
    status=200,
    body=b'{"status": "operational"}',
    content_type="application/json",
  )
  mock_client.return_value.proxy = mock_proxy

  with override_settings(FORJD_SERVICE_TOKEN="", FORJD_TENANT_ID=""):
    response = client.get(path)

  assert response.status_code == 200
  mock_client.assert_called_once_with(use_service_auth=False)
  assert mock_proxy.await_args.args == ("GET", target_path)


@pytest.mark.django_db
@patch("forjd.views.ForjdClient")
def test_public_status_page_unwraps_forjd_response_for_existing_angular_shape(
  mock_client: MagicMock,
  client: Client,
) -> None:
  mock_proxy = AsyncMock()
  mock_proxy.return_value = ForjdResponse(
    status=200,
    body=b'{"ok":true,"page":{"id":"page-1","slug":"public-page","title":"Public"}}',
    content_type="application/json",
  )
  mock_client.return_value.proxy = mock_proxy

  with override_settings(FORJD_SERVICE_TOKEN="", FORJD_TENANT_ID=""):
    response = client.get("/api/v1/system-status/status_pages/slug/public-page")

  assert response.status_code == 200
  assert response.json() == {"id": "page-1", "slug": "public-page", "title": "Public"}
  mock_client.assert_called_once_with(use_service_auth=False)
  assert mock_proxy.await_args.args == ("GET", "/api/v1/status/pages/slug/public-page")


@pytest.mark.django_db
@patch("forjd.views.ForjdClient")
def test_public_status_page_rejects_invalid_forjd_response(
  mock_client: MagicMock,
  client: Client,
) -> None:
  mock_proxy = AsyncMock()
  mock_proxy.return_value = ForjdResponse(
    status=200,
    body=b'{"ok":true}',
    content_type="application/json",
  )
  mock_client.return_value.proxy = mock_proxy

  response = client.get("/api/v1/system-status/status_pages/slug/public-page")

  assert response.status_code == 502
  assert response.json()["source"] == "forjd"


@pytest.mark.django_db
@pytest.mark.parametrize(
  ("method", "path", "target_path"),
  [
    ("get", "/api/v1/sessions", "/api/v1/sessions"),
    ("post", "/api/v1/sessions", "/api/v1/sessions"),
    ("delete", "/api/v1/sessions/session-1", "/api/v1/sessions/session-1"),
    ("post", "/api/v1/replay", "/api/v1/replay"),
    ("get", "/api/v1/replay/dlq", "/api/v1/replay/dlq"),
  ],
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_session_and_replay_routes_proxy_with_service_token(
  mock_proxy: AsyncMock,
  client: Client,
  method: str,
  path: str,
  target_path: str,
) -> None:
  tenant_id = _mapped_user()
  mock_proxy.return_value = ForjdResponse(
    status=200,
    body=b'{"ok": true}',
    content_type="application/json",
  )

  with override_settings(
    FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
    FORJD_TENANT_ID=str(tenant_id),
  ):
    auth = {"HTTP_AUTHORIZATION": "Bearer mock-token-learner-learner@example.com"}
    if method == "post":
      payload = (
        {
          "tenant_id": str(tenant_id),
          "session_id": "device-1",
          "identity_public_key": "x" * 44,
        }
        if path == "/api/v1/sessions"
        else {"tenant_id": str(tenant_id)}
      )
      response = client.post(path, data=payload, content_type="application/json", **auth)
    elif method == "delete":
      response = client.delete(path, **auth)
    else:
      response = client.get(path, **auth)

  assert response.status_code == 200
  assert mock_proxy.await_args.args == (method.upper(), target_path)


@pytest.mark.django_db
@patch("forjd.views.ForjdClient.analytics_overview", new_callable=AsyncMock)
def test_analytics_overview_maps_forjd_response_for_angular(
  mock_overview: AsyncMock,
  client: Client,
) -> None:
  tenant_id = _mapped_user()
  mock_overview.return_value = {
    "ok": True,
    "window_hours": 24,
    "total_requests": 10,
    "threats_detected": 1,
    "active_incidents": 2,
    "p99_latency_ms": 120.5,
    "uptime_pct": 99.0,
    "status": "operational",
    "ces": {
      "ces_threat": 20.0,
      "ces_sla": 99.0,
      "ces_stability": 80.0,
      "ces_level": 85.0,
    },
  }

  with override_settings(
    FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
    FORJD_TENANT_ID=str(tenant_id),
  ):
    response = client.get(
      "/api/v1/analytics/overview",
      HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
    )

  assert response.status_code == 200
  body = response.json()
  assert body["status"] == "success"
  assert body["data"]["ces"]["level"] == 85.0
  assert body["data"]["user_metrics"]["total_requests_24h"] == 10
  assert body["data"]["user_metrics"]["active_incidents"] == 2


@pytest.mark.django_db
@patch("forjd.views.ForjdClient.list_status_pages", new_callable=AsyncMock)
def test_status_pages_list_unwraps_forjd_pages_for_angular(
  mock_list: AsyncMock,
  client: Client,
) -> None:
  tenant_id = _mapped_user()
  mock_list.return_value = {
    "ok": True,
    "pages": [
      {
        "id": "page-1",
        "title": "Prod",
        "slug": "prod",
        "description": "",
        "is_published": True,
        "created_at": "2026-07-18T00:00:00+00:00",
      }
    ],
  }

  with override_settings(
    FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
    FORJD_TENANT_ID=str(tenant_id),
  ):
    response = client.get(
      "/api/v1/system-status/status_pages",
      HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
    )

  assert response.status_code == 200
  assert response.json() == [
    {
      "id": "page-1",
      "title": "Prod",
      "slug": "prod",
      "description": "",
      "is_published": True,
      "created_at": "2026-07-18T00:00:00+00:00",
      "user_id": None,
    }
  ]


@pytest.mark.django_db
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_unshipped_compatibility_and_agent_routes_fail_closed(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  User.objects.create_user(username="learner")

  response = client.get(
    "/api/v1/agent/vulnerabilities",
    HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
  )
  status_response = client.get("/api/v1/system-status/summary")

  assert response.status_code == 501
  assert response.json()["code"] == "forjd_capability_unavailable"
  assert status_response.status_code == 501
  mock_proxy.assert_not_awaited()


@pytest.mark.django_db
@pytest.mark.parametrize(
  ("method", "path"),
  [
    ("post", "/api/v1/analytics/aggregate"),
    ("get", "/api/v1/exports/"),
    ("post", "/api/v1/integrations/security-alert"),
  ],
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_unmapped_domain_routes_fail_closed(
  mock_proxy: AsyncMock,
  client: Client,
  method: str,
  path: str,
) -> None:
  User.objects.create_user(username="learner")

  response = getattr(client, method)(
    path,
    data={},
    content_type="application/json",
    HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
  )

  assert response.status_code == 501
  assert response.json()["code"] == "forjd_capability_unavailable"
  mock_proxy.assert_not_awaited()
