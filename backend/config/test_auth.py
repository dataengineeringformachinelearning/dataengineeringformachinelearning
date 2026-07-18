import base64
import hashlib
from typing import Any
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from account.lifecycle import FORJD_TENANT_ERASE_BLOCKER
from django.contrib.auth import get_user_model
from django.test import Client, override_settings
from monitor.models import APIKey, AuditLog, ForjdTenantMapping, UserLifecycleJob

User = get_user_model()


@pytest.fixture
def test_user(db: Any) -> User:
  return User.objects.create_user(
    username="authuser", password="secretpassword", email="auth@example.com"
  )


@pytest.fixture
def mock_verify_token() -> Any:
  with patch("firebase_admin.auth.verify_id_token") as mock:
    mock.return_value = {"uid": "authuser", "email": "auth@example.com", "name": "authuser"}
    yield mock


@pytest.mark.django_db
def test_register_health_probe(client: Client) -> None:
  response = client.get("/api/v1/auth/register")
  assert response.status_code == 200
  assert response.json()["status"] == "ok"


@pytest.mark.django_db
def test_control_plane_liveness(client: Client) -> None:
  response = client.get("/api/v1/health")
  assert response.status_code == 200
  assert response.json()["status"] == "ok"
  assert response.json()["role"] == "user-control-plane"


@pytest.mark.django_db
@override_settings(
  FORJD_API_URL="https://backend.forjd.co",
  FORJD_SERVICE_TOKEN="fjsvc_abcdefgh_test-secret",
  FORJD_TENANT_ID="00000000-0000-0000-0000-000000000001",
)
def test_control_plane_readiness(client: Client) -> None:
  response = client.get("/api/v1/ready")
  assert response.status_code == 200
  body = response.json()
  assert body["status"] == "ready"
  assert body["database"] == "ok"
  assert body["forjd_api_url"] == "https://backend.forjd.co"


@pytest.mark.django_db
def test_get_current_user_authenticated(
  client: Client, test_user: User, mock_verify_token: Any
) -> None:
  response = client.get("/api/v1/auth/user", HTTP_AUTHORIZATION="Bearer valid-token")
  assert response.status_code == 200
  assert response.json()["user"] == "authuser"


@pytest.mark.django_db
def test_get_current_user_unauthenticated(client: Client) -> None:
  response = client.get("/api/v1/auth/user")
  assert response.status_code == 401


@pytest.mark.django_db
def test_desktop_handoff_uses_pkce_and_restores_session(
  client: Client, test_user: User, mock_verify_token: Any
) -> None:
  verifier = "A" * 43
  challenge = (
    base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
  )
  generated = client.post(
    "/api/v1/auth/handoff/generate",
    data={"code_challenge": challenge, "client_name": "DEML Security Workbench"},
    content_type="application/json",
    HTTP_AUTHORIZATION="Bearer valid-token",
  )
  assert generated.status_code == 200
  code = generated.json()["token"]

  verified = client.post(
    "/api/v1/auth/handoff/verify",
    data={"token": code, "code_verifier": verifier},
    content_type="application/json",
  )
  assert verified.status_code == 200
  assert verified.json()["email"] == "auth@example.com"
  desktop_token = verified.json()["desktop_token"]

  restored = client.post(
    "/api/v1/auth/desktop/session",
    data={"desktop_token": desktop_token},
    content_type="application/json",
  )
  assert restored.status_code == 200
  assert restored.json()["user_id"] == test_user.id

  replay = client.post(
    "/api/v1/auth/handoff/verify",
    data={"token": code, "code_verifier": verifier},
    content_type="application/json",
  )
  assert replay.status_code == 401


@pytest.mark.django_db
def test_desktop_handoff_rejects_wrong_pkce(
  client: Client, test_user: User, mock_verify_token: Any
) -> None:
  verifier = "B" * 43
  challenge = (
    base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
  )
  generated = client.post(
    "/api/v1/auth/handoff/generate",
    data={"code_challenge": challenge, "client_name": "desktop"},
    content_type="application/json",
    HTTP_AUTHORIZATION="Bearer valid-token",
  )
  code = generated.json()["token"]
  rejected = client.post(
    "/api/v1/auth/handoff/verify",
    data={"token": code, "code_verifier": "C" * 43},
    content_type="application/json",
  )
  assert rejected.status_code == 401


@pytest.mark.django_db
@patch("firebase_admin.auth.delete_user")
@patch("account.lifecycle.async_to_sync")
def test_delete_account_completes_after_forjd_erase(
  mock_async_to_sync: MagicMock,
  mock_firebase_delete: MagicMock,
  client: Client,
  test_user: User,
  mock_verify_token: Any,
) -> None:
  profile = test_user.profile
  ForjdTenantMapping.objects.create(
    deml_account_id=profile.account_id,
    forjd_tenant_id=uuid4(),
    service_token_secret_ref="env:FORJD_SERVICE_TOKEN",  # pragma: allowlist secret
  )
  APIKey.objects.create(
    user=test_user,
    name="key",
    prefix="delkey01",
    key_hash="x",
  )

  erase_fn = MagicMock(return_value={"ok": True})
  mock_async_to_sync.return_value = erase_fn

  with override_settings(
    FORJD_API_URL="https://backend.forjd.co",
    FORJD_SERVICE_TOKEN="fjsvc_abcdefgh_secret",
    FORJD_TENANT_ID="00000000-0000-0000-0000-000000000001",
  ):
    # Force mapping tenant to match settings tenant for credential resolve.
    ForjdTenantMapping.objects.filter(deml_account_id=profile.account_id).update(
      forjd_tenant_id="00000000-0000-0000-0000-000000000001"
    )
    response = client.delete("/api/v1/auth/delete-account", HTTP_AUTHORIZATION="Bearer valid-token")

  assert response.status_code == 200
  assert response.json()["completed"] is True
  assert not User.objects.filter(username="authuser").exists()
  mock_firebase_delete.assert_called_once()
  assert AuditLog.objects.filter(action="ACCOUNT_DELETED").exists()


@pytest.mark.django_db
@patch("account.lifecycle.async_to_sync")
def test_delete_account_blocks_when_forjd_erase_fails(
  mock_async_to_sync: MagicMock,
  client: Client,
  test_user: User,
  mock_verify_token: Any,
) -> None:
  from forjd.client import ForjdError

  profile = test_user.profile
  ForjdTenantMapping.objects.create(
    deml_account_id=profile.account_id,
    forjd_tenant_id="00000000-0000-0000-0000-000000000001",
    service_token_secret_ref="env:FORJD_SERVICE_TOKEN",  # pragma: allowlist secret
  )

  def _raise(*_a: Any, **_k: Any) -> None:
    raise ForjdError(503, "erase unavailable")

  mock_async_to_sync.return_value = _raise

  with override_settings(
    FORJD_API_URL="https://backend.forjd.co",
    FORJD_SERVICE_TOKEN="fjsvc_abcdefgh_secret",
    FORJD_TENANT_ID="00000000-0000-0000-0000-000000000001",
  ):
    response = client.delete("/api/v1/auth/delete-account", HTTP_AUTHORIZATION="Bearer valid-token")

  assert response.status_code == 503
  assert (
    "erase" in response.json()["detail"].lower()
    or response.json()["detail"] == FORJD_TENANT_ERASE_BLOCKER
  )
  assert User.objects.filter(username="authuser").exists()
  job = UserLifecycleJob.objects.get(user=test_user)
  assert job.state == UserLifecycleJob.State.FAILED


@pytest.mark.django_db
def test_delete_account_unauthenticated(client: Client) -> None:
  response = client.delete("/api/v1/auth/delete-account")
  assert response.status_code == 401
