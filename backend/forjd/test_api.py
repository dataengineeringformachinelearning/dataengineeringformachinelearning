from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import pytest
from django.contrib.auth import get_user_model
from django.test import Client, override_settings
from monitor.models import ForjdTenantMapping

User = get_user_model()


def _event(tenant_id: UUID) -> dict[str, object]:
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
    "metadata": {
      "source": "deml-web",
      "channel": "telemetry",
      "product": "deml",
    },
  }


def _mapped_user(username: str = "learner") -> tuple[object, UUID]:
  user = User.objects.create_user(username=username)
  tenant_id = uuid4()
  ForjdTenantMapping.objects.create(
    deml_account_id=user.profile.account_id,
    forjd_tenant_id=tenant_id,
  )
  return user, tenant_id


@pytest.mark.django_db
@override_settings(FORJD_SERVICE_TOKEN="", FORJD_TENANT_ID="")
@patch("forjd.api.ForjdClient")
def test_public_health_uses_no_service_credentials(
  mock_client: MagicMock,
  client: Client,
) -> None:
  mock_health = AsyncMock(return_value={"status": "operational"})
  mock_client.return_value.health = mock_health

  response = client.get("/api/v1/forjd/health")

  assert response.status_code == 200
  mock_client.assert_called_once_with(use_service_auth=False)
  assert UUID(mock_health.await_args.kwargs["request_id"])


@pytest.mark.django_db
@patch("forjd.api.ForjdClient.ingest", new_callable=AsyncMock)
def test_ingest_rejects_cross_tenant_event(mock_ingest: AsyncMock, client: Client) -> None:
  _user, tenant_id = _mapped_user()

  with override_settings(
    FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
    FORJD_TENANT_ID=str(tenant_id),
  ):
    response = client.post(
      "/api/v1/forjd/ingest",
      data=_event(uuid4()),
      content_type="application/json",
      HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
    )

  assert response.status_code == 403
  mock_ingest.assert_not_awaited()


@pytest.mark.django_db
@patch("forjd.api.ForjdClient.ingest", new_callable=AsyncMock)
def test_ninja_ingest_rejects_cookie_session_without_firebase_bearer(
  mock_ingest: AsyncMock,
  client: Client,
) -> None:
  user, tenant_id = _mapped_user(username="session-only-ninja")
  client.force_login(user)

  with override_settings(
    FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
    FORJD_TENANT_ID=str(tenant_id),
  ):
    response = client.post(
      "/api/v1/forjd/ingest",
      data=_event(tenant_id),
      content_type="application/json",
    )

  assert response.status_code == 401
  mock_ingest.assert_not_awaited()


@pytest.mark.django_db
@patch("forjd.api.ForjdClient.ingest", new_callable=AsyncMock)
def test_ingest_forwards_only_mapped_sealed_telemetry(
  mock_ingest: AsyncMock,
  client: Client,
) -> None:
  _user, tenant_id = _mapped_user()
  mock_ingest.return_value = {"ok": True, "accepted": 1}

  with override_settings(
    FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
    FORJD_TENANT_ID=str(tenant_id),
  ):
    response = client.post(
      "/api/v1/forjd/ingest",
      data=_event(tenant_id),
      content_type="application/json",
      HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
    )

  assert response.status_code == 200
  assert response.json() == {"ok": True, "accepted": 1}
  forwarded_payload = mock_ingest.await_args.args[0]
  assert forwarded_payload["tenant_id"] == str(tenant_id)
  # Angular keeps deml_* wire names; BFF rewrites to universal FORJD ids.
  assert forwarded_payload["workflow_id"] == "threat_telemetry"
  assert forwarded_payload["event_type"] == "threat.metric"
  assert UUID(mock_ingest.await_args.kwargs["request_id"])


@pytest.mark.django_db
@pytest.mark.parametrize(
  "override",
  [
    {
      "content_type": "application/vnd.deml.learning-event+json;version=1",
      "event_type": "lesson.started",
      "workflow_id": "deml_learning_v1",
    },
    {"metadata": {"source": "deml-web", "learner_id": "plaintext-user-id"}},
    {"metadata": {"source": "deml-web", "labels": {"answer": "plaintext"}}},
    {"metadata": {"source": "deml-web", "tags": ["learner@example.com"]}},
    {"answer": "plaintext lesson answer"},
  ],
)
def test_ingest_rejects_unshipped_learning_and_plaintext_metadata(
  client: Client,
  override: dict[str, object],
) -> None:
  _user, tenant_id = _mapped_user()
  payload = {**_event(tenant_id), **override}

  with override_settings(
    FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
    FORJD_TENANT_ID=str(tenant_id),
  ):
    response = client.post(
      "/api/v1/forjd/ingest",
      data=payload,
      content_type="application/json",
      HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
    )

  assert response.status_code == 422


@pytest.mark.django_db
def test_ingest_fails_closed_without_tenant_mapping(client: Client) -> None:
  User.objects.create_user(username="learner")

  response = client.post(
    "/api/v1/forjd/ingest",
    data=_event(uuid4()),
    content_type="application/json",
    HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
  )

  assert response.status_code == 503


@pytest.mark.django_db
@pytest.mark.parametrize(
  ("field", "value"),
  [
    ("nonce", "dGVzdC1ub25jZQ=="),
    ("ciphertext", "not-valid-base64!!!!!!!!!"),
    ("ciphertext_sha256", "0" * 64),
  ],
)
def test_ingest_rejects_envelopes_forjd_would_reject(
  client: Client,
  field: str,
  value: str,
) -> None:
  _user, tenant_id = _mapped_user()
  payload = _event(tenant_id)
  envelope = payload["envelope"]
  assert isinstance(envelope, dict)
  envelope[field] = value

  with override_settings(
    FORJD_SERVICE_TOKEN="fjsvc_deadbeef_test-secret",
    FORJD_TENANT_ID=str(tenant_id),
  ):
    response = client.post(
      "/api/v1/forjd/ingest",
      data=payload,
      content_type="application/json",
      HTTP_AUTHORIZATION="Bearer mock-token-learner-learner@example.com",
    )

  assert response.status_code == 422
