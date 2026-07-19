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
  user.profile.role = "Operator"
  user.profile.tier = "Pro"
  user.profile.subscription_active = True
  user.profile.save(update_fields=["role", "tier", "subscription_active"])
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
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_projections_run_rewrites_product_local_workflow_id(
  mock_proxy: AsyncMock,
  client: Client,
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
    response = client.post(
      "/api/v1/projections/run",
      data={"tenant_id": str(tenant_id), "workflow_id": "deml_telemetry"},
      content_type="application/json",
      HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
    )

  assert response.status_code == 200
  forwarded = json.loads(mock_proxy.await_args.kwargs["body"])
  assert forwarded["workflow_id"] == "threat_telemetry"
  assert forwarded["tenant_id"] == str(tenant_id)


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
@override_settings(
  FORJD_CUTOVER_PHASE="2",
  FORJD_READ_MODE="forjd",
  FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
  FORJD_TENANT_ID="ded3e76a-64ca-44c9-aa90-cb6a4868fc4f",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_anonymous_status_services_require_published_page(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  """Anonymous service reads must not leak unpublished page detail."""
  pages_body = json.dumps(
    {
      "ok": True,
      "pages": [
        {
          "id": "page-draft",
          "slug": "draft-page",
          "title": "Draft",
          "is_published": False,
        },
        {
          "id": "page-public",
          "slug": "public-page",
          "title": "Public",
          "is_published": True,
        },
      ],
    }
  ).encode()
  services_body = json.dumps(
    {
      "ok": True,
      "services": [{"id": "svc-1", "name": "API", "status": "operational"}],
    }
  ).encode()

  async def _proxy(method: str, path: str, **_kwargs: object) -> ForjdResponse:
    if path == "/api/v1/status/pages":
      return ForjdResponse(status=200, body=pages_body, content_type="application/json")
    return ForjdResponse(status=200, body=services_body, content_type="application/json")

  mock_proxy.side_effect = _proxy

  denied = client.get("/api/v1/system-status/status_pages/page-draft/services")
  allowed = client.get("/api/v1/system-status/status_pages/page-public/services")

  assert denied.status_code == 404
  assert allowed.status_code == 200
  assert allowed.json()[0]["name"] == "API"
  assert mock_proxy.await_count == 3  # pages check (denied) + pages check + services


@pytest.mark.django_db
@override_settings(
  FORJD_CUTOVER_PHASE="2",
  FORJD_READ_MODE="forjd",
  FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
  FORJD_TENANT_ID="ded3e76a-64ca-44c9-aa90-cb6a4868fc4f",
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_anonymous_status_pages_list_returns_published_directory(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  """Explore directory must work without Firebase auth."""
  tenant_id = "ded3e76a-64ca-44c9-aa90-cb6a4868fc4f"
  mock_proxy.return_value = ForjdResponse(
    status=200,
    body=json.dumps(
      {
        "ok": True,
        "pages": [
          {
            "id": "page-public",
            "slug": "joealongi-dev",
            "title": "joealongi.dev",
            "description": "Personal site status",
            "is_published": True,
            "created_at": "2026-07-19T00:00:00Z",
          },
          {
            "id": "page-draft",
            "slug": "draft-page",
            "title": "Draft",
            "description": "",
            "is_published": False,
            "created_at": "2026-07-19T00:00:00Z",
          },
          {
            "id": "page-platform",
            "slug": "platform-status",
            "title": "Platform Status",
            "description": "",
            "is_published": True,
            "created_at": "2026-07-19T00:00:00Z",
          },
        ],
      }
    ).encode(),
    content_type="application/json",
  )

  response = client.get("/api/v1/system-status/status_pages")
  slash_response = client.get("/api/v1/system-status/status_pages/")

  assert response.status_code == 200
  assert slash_response.status_code == 200
  pages = response.json()
  assert {page["slug"] for page in pages} == {"joealongi-dev", "platform-status"}
  assert slash_response.json() == pages
  assert mock_proxy.await_args.args[:2] == ("GET", "/api/v1/status/pages")
  assert parse_qs(mock_proxy.await_args.kwargs["query_string"])["tenant_id"] == [tenant_id]


@pytest.mark.django_db
@patch("forjd.views.ForjdClient")
def test_public_status_page_unwraps_forjd_response_for_existing_angular_shape(
  mock_client: MagicMock,
  client: Client,
) -> None:
  mock_proxy = AsyncMock()
  mock_proxy.return_value = ForjdResponse(
    status=200,
    body=(
      b'{"ok":true,"page":{"id":"page-1","tenant_id":"ded3e76a-64ca-44c9-aa90-cb6a4868fc4f",'
      b'"slug":"public-page","title":"Public"}}'
    ),
    content_type="application/json",
  )
  mock_client.return_value.proxy = mock_proxy

  with override_settings(FORJD_SERVICE_TOKEN="", FORJD_TENANT_ID=""):
    response = client.get("/api/v1/system-status/status_pages/slug/public-page")

  assert response.status_code == 200
  assert response.json() == {
    "id": "page-1",
    "slug": "public-page",
    "title": "Public",
    "services": [],
    "incidents": [],
  }
  assert "tenant_id" not in response.json()
  mock_client.assert_called_once_with(use_service_auth=False)
  assert mock_proxy.await_args.args == ("GET", "/api/v1/status/pages/slug/public-page")


@pytest.mark.django_db
@patch("forjd.views.ForjdClient")
def test_public_status_page_reshapes_embedded_services_for_angular(
  mock_client: MagicMock,
  client: Client,
) -> None:
  """Anonymous visitors get Angular-shaped services/incidents inline."""
  mock_proxy = AsyncMock()
  mock_proxy.return_value = ForjdResponse(
    status=200,
    body=json.dumps(
      {
        "ok": True,
        "page": {
          "id": "page-1",
          "slug": "public-page",
          "title": "Public",
          "services": [
            {
              "id": "svc-1",
              "name": "deml.app",
              "status": "operational",
              "description": "Angular application",
              "sort_order": 1,
              "updated_at": "2026-07-19T00:00:00+00:00",
            }
          ],
          "incidents": [],
        },
      }
    ).encode(),
    content_type="application/json",
  )
  mock_client.return_value.proxy = mock_proxy

  with override_settings(FORJD_SERVICE_TOKEN="", FORJD_TENANT_ID=""):
    response = client.get("/api/v1/system-status/status_pages/slug/public-page")

  assert response.status_code == 200
  payload = response.json()
  assert payload["services"] == [
    {
      "id": "svc-1",
      "name": "deml.app",
      "url": "Angular application",
      "status_page_id": "page-1",
      "created_at": "2026-07-19T00:00:00+00:00",
      "status": "operational",
      "sla": None,
    }
  ]
  assert payload["incidents"] == []


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

  assert response.status_code == 503
  assert response.json()["code"] == "forjd_degraded"
  assert response.json()["source"] == "forjd"


@pytest.mark.django_db
@pytest.mark.parametrize(
  ("method", "path"),
  [
    ("get", "/api/v1/sessions"),
    ("post", "/api/v1/sessions"),
    ("delete", "/api/v1/sessions/session-1"),
    ("post", "/api/v1/replay"),
    ("get", "/api/v1/replay/dlq"),
    ("post", f"/api/v1/replay/dlq/{uuid4()}/retry"),
  ],
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_session_and_replay_routes_require_tenant_mapping(
  mock_proxy: AsyncMock,
  client: Client,
  method: str,
  path: str,
) -> None:
  """Wired adapters still fail closed without an account→FORJD tenant mapping."""
  user = User.objects.create_user(username="learner")
  user.profile.role = "Security Admin"
  user.profile.tier = "Pro"
  user.profile.subscription_active = True
  user.profile.save(update_fields=["role", "tier", "subscription_active"])

  response = getattr(client, method)(
    path,
    data={},
    content_type="application/json",
    HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
  )

  assert response.status_code == 503
  assert "credential" in response.json()["detail"].lower()
  mock_proxy.assert_not_awaited()


@pytest.mark.django_db
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_unmapped_domain_gets_fail_closed_in_steady_mode(
  mock_proxy: AsyncMock,
  client: Client,
) -> None:
  User.objects.create_user(username="learner")

  response = client.get(
    "/api/v1/agent/vulnerabilities",
    HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
  )
  status_response = client.get(
    "/api/v1/system-status/summary",
    HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
  )

  assert response.status_code == 503
  assert response.json()["code"] == "forjd_degraded"
  assert status_response.status_code == 501
  assert status_response.json()["code"] == "forjd_capability_unavailable"
  mock_proxy.assert_not_awaited()


@pytest.mark.django_db
@pytest.mark.parametrize(
  ("method", "path", "expected_status"),
  [
    ("get", "/api/v1/analytics/overview", 503),
    ("get", "/api/v1/exports/", 503),
    ("post", "/api/v1/analytics/aggregate", 403),
    ("post", "/api/v1/integrations/security-alert", 403),
  ],
)
@patch("forjd.views.ForjdClient.proxy", new_callable=AsyncMock)
def test_wired_domain_routes_gate_by_method_without_tenant_mapping(
  mock_proxy: AsyncMock,
  client: Client,
  method: str,
  path: str,
  expected_status: int,
) -> None:
  User.objects.create_user(username="learner")

  response = getattr(client, method)(
    path,
    data={},
    content_type="application/json",
    HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
  )

  assert response.status_code == expected_status
  if expected_status == 403:
    assert response.json()["code"] == "forjd_action_forbidden"
  mock_proxy.assert_not_awaited()
