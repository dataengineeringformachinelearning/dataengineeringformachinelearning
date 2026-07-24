import base64
import hashlib
from datetime import timedelta
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import pytest
from account.lifecycle import FORJD_TENANT_ERASE_BLOCKER
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import IntegrityError, connection, transaction
from django.test import Client, override_settings
from django.utils import timezone
from monitor.models import (
  APIKey,
  AuditLog,
  AuthHandoffToken,
  BrowserSession,
  BugReport,
  ForjdShadowReceipt,
  ForjdTenantAssociation,
  ForjdTenantMapping,
  UserLifecycleJob,
)

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
def test_firebase_uid_does_not_rebind_an_account_with_the_same_email() -> None:
  from account.lifecycle import ensure_user_from_firebase

  existing = User.objects.create_user(username="original-uid", email="shared@example.com")
  existing_account_id = existing.profile.account_id

  user, profile, created = ensure_user_from_firebase(
    {"uid": "different-uid", "email": "shared@example.com", "name": "Different User"}
  )

  existing.refresh_from_db()
  assert created is True
  assert user.pk != existing.pk
  assert user.username == "different-uid"
  assert profile.account_id != existing_account_id
  assert existing.username == "original-uid"


@pytest.mark.django_db
def test_firebase_identity_requires_a_uid() -> None:
  from account.lifecycle import ensure_user_from_firebase

  with pytest.raises(ValueError, match="UID"):
    ensure_user_from_firebase({"email": "missing-uid@example.com"})


@pytest.mark.django_db
def test_same_firebase_uid_keeps_one_account_when_email_changes() -> None:
  from account.lifecycle import ensure_user_from_firebase

  first_user, first_profile, first_created = ensure_user_from_firebase(
    {"uid": "stable-uid", "email": "first@example.com"}
  )
  second_user, second_profile, second_created = ensure_user_from_firebase(
    {"uid": "stable-uid", "email": "second@example.com"}
  )

  assert first_created is True
  assert second_created is False
  assert second_user.pk == first_user.pk
  assert second_profile.account_id == first_profile.account_id
  assert second_user.email == "second@example.com"


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
  mock_verify_token.assert_called_once_with("valid-token", check_revoked=True)


@pytest.mark.django_db
def test_get_current_user_unauthenticated(client: Client) -> None:
  response = client.get("/api/v1/auth/user")
  assert response.status_code == 401


@pytest.mark.django_db
def test_deml_api_key_authenticates_headless_request(client: Client, test_user: User) -> None:
  raw_key = "deml_abcd1234_0123456789abcdefghijklmnopqrstuvwxyz"
  api_key = APIKey(user=test_user, name="headless", prefix="abcd1234")
  api_key.set_key(raw_key)
  api_key.save()

  response = client.get("/api/v1/auth/user", HTTP_X_API_KEY=raw_key)

  assert response.status_code == 200
  assert response.json()["user_id"] == test_user.id


@pytest.mark.django_db
def test_inactive_user_api_key_is_rejected(client: Client, test_user: User) -> None:
  raw_key = "deml_deadbeef_0123456789abcdefghijklmnopqrstuvwxyz"
  api_key = APIKey(user=test_user, name="disabled-owner", prefix="deadbeef")
  api_key.set_key(raw_key)
  api_key.save()
  test_user.is_active = False
  test_user.save(update_fields=["is_active"])

  response = client.get("/api/v1/auth/user", HTTP_X_API_KEY=raw_key)

  assert response.status_code == 401
  assert response.json()["detail"] == "Invalid API key"


@pytest.mark.django_db
def test_inactive_firebase_user_is_rejected(
  client: Client,
  test_user: User,
  mock_verify_token: Any,
) -> None:
  test_user.is_active = False
  test_user.save(update_fields=["is_active"])

  response = client.get("/api/v1/auth/user", HTTP_AUTHORIZATION="Bearer valid-token")

  assert response.status_code == 401
  assert response.json()["detail"] == "Account disabled"
  mock_verify_token.assert_called_once_with("valid-token", check_revoked=True)


@pytest.mark.django_db
@override_settings(DEBUG=True)
def test_debug_mock_token_bypasses_firebase_verification(client: Client) -> None:
  with patch("firebase_admin.auth.verify_id_token") as verify:
    response = client.get(
      "/api/v1/auth/user",
      HTTP_AUTHORIZATION="Bearer mock-token-local-local@example.com",
    )

  assert response.status_code == 200
  assert response.json()["user"] == "Local"
  verify.assert_not_called()


@pytest.mark.django_db
def test_deml_api_key_bearer_scheme_is_unambiguous(client: Client, test_user: User) -> None:
  raw_key = "deml_1234abcd_0123456789abcdefghijklmnopqrstuvwxyz"
  api_key = APIKey(user=test_user, name="headless", prefix="1234abcd")
  api_key.set_key(raw_key)
  api_key.save()

  response = client.get("/api/v1/auth/user", HTTP_AUTHORIZATION=f"Bearer {raw_key}")

  assert response.status_code == 200
  assert response.json()["user_id"] == test_user.id


@pytest.mark.django_db
def test_legacy_api_key_remains_valid_via_explicit_header(client: Client, test_user: User) -> None:
  raw_key = "legacy01-existing-secret-value"
  api_key = APIKey(user=test_user, name="legacy", prefix="legacy01")
  api_key.set_key(raw_key)
  api_key.save()

  response = client.get("/api/v1/auth/user", HTTP_X_API_KEY=raw_key)

  assert response.status_code == 200
  assert response.json()["user_id"] == test_user.id


@pytest.mark.django_db
def test_invalid_api_key_fails_closed_without_firebase_fallback(client: Client) -> None:
  response = client.get(
    "/api/v1/auth/user",
    HTTP_X_API_KEY="deml_abcd1234_0123456789abcdefghijklmnopqrstuvwxyz",
  )

  assert response.status_code == 401
  assert response.json()["detail"] == "Invalid API key"


@pytest.mark.django_db
def test_api_key_cannot_manage_credentials_or_account(client: Client, test_user: User) -> None:
  raw_key = "deml_abcd1234_0123456789abcdefghijklmnopqrstuvwxyz"
  api_key = APIKey(user=test_user, name="headless", prefix="abcd1234")
  api_key.set_key(raw_key)
  api_key.save()

  response = client.get("/api/v1/auth/api-keys", HTTP_X_API_KEY=raw_key)

  assert response.status_code == 403
  assert "headless FORJD" in response.json()["detail"]


def test_api_key_integration_prefixes_are_path_boundary_safe() -> None:
  from config.middleware import _api_key_path_allowed

  assert _api_key_path_allowed("/api/v1/siem/signals") is True
  assert _api_key_path_allowed("/api/v1/siem-evil/signals") is False
  assert _api_key_path_allowed("/api/v1/exports-malicious") is False


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
  tenant_id = uuid4()
  ForjdTenantMapping.objects.create(
    deml_account_id=profile.account_id,
    forjd_tenant_id=tenant_id,
    service_token_secret_ref="env:FORJD_SERVICE_TOKEN",  # pragma: allowlist secret
  )
  APIKey.objects.create(
    user=test_user,
    name="key",
    prefix="delkey01",
    key_hash="x",
  )
  shadow = ForjdShadowReceipt.objects.create(
    deml_account_id=profile.account_id,
    forjd_tenant_id=tenant_id,
    client_event_id="deletion-shadow",
  )
  BrowserSession.objects.create(
    session_id="deletion-session",
    firebase_uid="authuser",
    user_id=test_user.pk,
    user_agent="identifying-agent",
    ip="203.0.113.10",
    expires_at=timezone.now() + timedelta(hours=1),
  )
  AuthHandoffToken.objects.create(
    token_hash="a" * 64,
    user_id=test_user.pk,
    expires_at=timezone.now() + timedelta(minutes=5),
  )
  BugReport.objects.create(
    user=test_user,
    account_id=profile.account_id,
    forjd_tenant_id=tenant_id,
    forjd_service_token_secret_ref="env:FORJD_SERVICE_TOKEN",
    submitted_by_pseudonym="acct:deletion-test",
    user_description="Delete this report body",
  )

  prepared_account_id = test_user.profile._meta.get_field("account_id").get_db_prep_value(
    profile.account_id,
    connection,
  )
  prepared_receipt_id = UserLifecycleJob._meta.get_field("id").get_db_prep_value(
    uuid4(),
    connection,
  )
  with connection.cursor() as cursor:
    cursor.execute(
      """
      INSERT INTO telemetry_ingest_receipts
        (id, topic, partition, offset, account_id, event_id, processed_at)
      VALUES (%s, %s, %s, %s, %s, %s, %s)
      """,
      [
        prepared_receipt_id,
        "legacy-delete",
        0,
        999,
        prepared_account_id,
        "legacy-event",
        timezone.now(),
      ],
    )

  erase_fn = MagicMock(return_value={"ok": True})
  mock_async_to_sync.return_value = erase_fn

  with override_settings(
    FORJD_API_URL="https://backend.forjd.co",
    FORJD_SERVICE_TOKEN="fjsvc_abcdefgh_secret",
    FORJD_TENANT_ID=str(tenant_id),
  ):
    response = client.delete("/api/v1/auth/delete-account", HTTP_AUTHORIZATION="Bearer valid-token")

  assert response.status_code == 200
  assert response.json()["completed"] is True
  assert not User.objects.filter(username="authuser").exists()
  mock_firebase_delete.assert_called_once()
  assert AuditLog.objects.filter(action="ACCOUNT_DELETED").exists()
  shadow.refresh_from_db()
  assert shadow.deml_account_id is None
  assert not BrowserSession.objects.filter(session_id="deletion-session").exists()
  assert not AuthHandoffToken.objects.filter(token_hash="a" * 64).exists()
  assert not BugReport.objects.filter(user_description="Delete this report body").exists()
  assert not ForjdTenantMapping.objects.filter(deml_account_id=profile.account_id).exists()
  assert not ForjdTenantAssociation.objects.filter(deml_account_id=profile.account_id).exists()
  with connection.cursor() as cursor:
    cursor.execute(
      "SELECT COUNT(*) FROM telemetry_ingest_receipts WHERE account_id = %s",
      [prepared_account_id],
    )
    assert cursor.fetchone()[0] == 0
  job = UserLifecycleJob.objects.get(account_id=profile.account_id)
  assert job.firebase_uid == ""
  assert job.user_email == ""
  assert job.user_id is None
  assert job.forjd_erased_tenant_ids == [str(tenant_id)]
  assert job.forjd_erase_targets == [
    {
      "tenant_id": str(tenant_id),
      "service_token_secret_ref": "env:FORJD_SERVICE_TOKEN",
    }
  ]


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
  api_key = APIKey.objects.create(
    user=test_user,
    name="delete-barrier",
    prefix="barrier1",
    key_hash="x",
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
  test_user.refresh_from_db()
  api_key.refresh_from_db()
  assert test_user.is_active is False
  assert api_key.is_active is False
  assert not ForjdTenantMapping.objects.get(deml_account_id=profile.account_id).is_active
  job = UserLifecycleJob.objects.get(user=test_user)
  assert job.state == UserLifecycleJob.State.FAILED
  assert job.next_attempt_at is not None


@pytest.mark.django_db
@patch("firebase_admin.auth.delete_user", side_effect=RuntimeError("firebase unavailable"))
@patch("account.lifecycle.async_to_sync")
def test_delete_account_does_not_complete_when_firebase_deletion_fails(
  mock_async_to_sync: MagicMock,
  _mock_firebase_delete: MagicMock,
  client: Client,
  test_user: User,
  mock_verify_token: Any,
) -> None:
  profile = test_user.profile
  ForjdTenantMapping.objects.create(
    deml_account_id=profile.account_id,
    forjd_tenant_id="00000000-0000-0000-0000-000000000001",
    service_token_secret_ref="env:FORJD_SERVICE_TOKEN",  # pragma: allowlist secret
  )
  mock_async_to_sync.return_value = MagicMock(return_value={"ok": True})

  with override_settings(
    FORJD_API_URL="https://backend.forjd.co",
    FORJD_SERVICE_TOKEN="fjsvc_abcdefgh_secret",
    FORJD_TENANT_ID="00000000-0000-0000-0000-000000000001",
  ):
    response = client.delete("/api/v1/auth/delete-account", HTTP_AUTHORIZATION="Bearer valid-token")

  assert response.status_code == 503
  assert User.objects.filter(pk=test_user.pk).exists()
  job = UserLifecycleJob.objects.get(account_id=profile.account_id)
  assert job.state == UserLifecycleJob.State.FAILED
  assert "forjd_erased" in job.steps_completed
  assert job.completed_at is None


@pytest.mark.django_db
@patch("firebase_admin.auth.delete_user")
def test_delete_account_retains_identity_when_subscription_cannot_be_cancelled(
  mock_firebase_delete: MagicMock,
  client: Client,
  test_user: User,
  mock_verify_token: Any,
) -> None:
  profile = test_user.profile
  profile.stripe_subscription_id = "sub_active"
  profile.save(update_fields=["stripe_subscription_id"])

  with override_settings(STRIPE_SECRET_KEY=""):
    response = client.delete(
      "/api/v1/auth/delete-account",
      HTTP_AUTHORIZATION="Bearer valid-token",
    )

  assert response.status_code == 503
  assert User.objects.filter(pk=test_user.pk).exists()
  profile.refresh_from_db()
  assert profile.stripe_subscription_id == "sub_active"
  job = UserLifecycleJob.objects.get(account_id=profile.account_id)
  assert job.state == UserLifecycleJob.State.FAILED
  mock_firebase_delete.assert_not_called()


@pytest.mark.django_db
@patch("firebase_admin.auth.delete_user")
def test_delete_account_cancels_every_active_customer_subscription(
  mock_firebase_delete: MagicMock,
  client: Client,
  test_user: User,
  mock_verify_token: Any,
) -> None:
  profile = test_user.profile
  profile.stripe_customer_id = "cus_all_subscriptions"
  profile.stripe_subscription_id = "sub_cached"
  profile.save(update_fields=["stripe_customer_id", "stripe_subscription_id"])
  page = MagicMock()
  page.auto_paging_iter.return_value = iter([{"id": "sub_other"}])

  with (
    override_settings(STRIPE_SECRET_KEY="sk_test_placeholder"),
    patch("stripe.Subscription.list", return_value=page) as list_subscriptions,
    patch("stripe.Subscription.cancel") as cancel_subscription,
  ):
    response = client.delete(
      "/api/v1/auth/delete-account",
      HTTP_AUTHORIZATION="Bearer valid-token",
    )

  assert response.status_code == 200
  list_subscriptions.assert_called_once_with(
    customer="cus_all_subscriptions",
    status="all",
    limit=100,
  )
  assert {call.args[0] for call in cancel_subscription.call_args_list} == {
    "sub_cached",
    "sub_other",
  }
  mock_firebase_delete.assert_called_once_with("authuser")


@pytest.mark.django_db
def test_running_deletion_job_cannot_be_double_claimed(test_user: User) -> None:
  from account.lifecycle import DELETION_IN_PROGRESS, execute_deletion_job

  job = UserLifecycleJob.objects.create(
    user=test_user,
    account_id=test_user.profile.account_id,
    state=UserLifecycleJob.State.RUNNING,
    last_error=DELETION_IN_PROGRESS,
  )
  with patch("account.lifecycle._erase_forjd_tenant") as erase:
    completed = execute_deletion_job(job)

  assert completed is False
  erase.assert_not_called()
  job.refresh_from_db()
  assert job.state == UserLifecycleJob.State.RUNNING


@pytest.mark.django_db
def test_account_has_only_one_nonterminal_deletion_job(test_user: User) -> None:
  UserLifecycleJob.objects.create(
    user=test_user,
    account_id=test_user.profile.account_id,
    state=UserLifecycleJob.State.DEAD_LETTER,
  )

  with pytest.raises(IntegrityError), transaction.atomic():
    UserLifecycleJob.objects.create(
      user=test_user,
      account_id=test_user.profile.account_id,
      state=UserLifecycleJob.State.PENDING,
    )


@pytest.mark.django_db
def test_stale_running_deletion_job_is_recoverable(test_user: User) -> None:
  from account.lifecycle import DELETION_JOB_LEASE, execute_deletion_job

  job = UserLifecycleJob.objects.create(
    user=test_user,
    account_id=test_user.profile.account_id,
    state=UserLifecycleJob.State.RUNNING,
    forjd_erase_targets=[
      {
        "tenant_id": "00000000-0000-0000-0000-000000000001",
        "service_token_secret_ref": "env:FORJD_SERVICE_TOKEN",
      }
    ],
  )
  UserLifecycleJob.objects.filter(pk=job.pk).update(
    updated_at=timezone.now() - DELETION_JOB_LEASE - timedelta(seconds=1)
  )

  def complete(claimed_job: UserLifecycleJob, lease_token: Any) -> None:
    UserLifecycleJob.objects.filter(pk=claimed_job.pk, lease_token=lease_token).update(
      state=UserLifecycleJob.State.COMPLETED,
      completed_at=timezone.now(),
      lease_token=None,
      lease_expires_at=None,
    )

  with (
    patch("account.lifecycle._erase_forjd_tenant", return_value=(True, "")) as erase,
    patch("account.lifecycle._teardown_local_identity", side_effect=complete) as teardown,
  ):
    completed = execute_deletion_job(job)

  assert completed is True
  erase.assert_called_once()
  teardown.assert_called_once()


@pytest.mark.django_db
def test_delete_account_unauthenticated(client: Client) -> None:
  response = client.delete("/api/v1/auth/delete-account")
  assert response.status_code == 401


@pytest.mark.django_db
def test_deletion_manifest_erases_every_historical_tenant(test_user: User) -> None:
  from account.lifecycle import request_account_deletion

  account_id = test_user.profile.account_id
  old_tenant = uuid4()
  current_tenant = uuid4()
  ForjdTenantAssociation.objects.create(
    deml_account_id=account_id,
    forjd_tenant_id=old_tenant,
    service_token_secret_ref="env:FORJD_SERVICE_TOKEN_CUSTOMER_A",
  )
  ForjdTenantMapping.objects.create(
    deml_account_id=account_id,
    forjd_tenant_id=current_tenant,
    service_token_secret_ref="env:FORJD_SERVICE_TOKEN_CUSTOMER_B",
  )

  def complete(job: UserLifecycleJob, lease_token: Any) -> None:
    UserLifecycleJob.objects.filter(pk=job.pk, lease_token=lease_token).update(
      state=UserLifecycleJob.State.COMPLETED,
      completed_at=timezone.now(),
      lease_token=None,
      lease_expires_at=None,
      firebase_uid="",
      user_email="",
    )

  with (
    patch("account.lifecycle._erase_forjd_tenant", return_value=(True, "")) as erase,
    patch("account.lifecycle._teardown_local_identity", side_effect=complete),
  ):
    job = request_account_deletion(test_user)

  assert job.state == UserLifecycleJob.State.COMPLETED
  assert {call.args[0]["tenant_id"] for call in erase.call_args_list} == {
    str(old_tenant),
    str(current_tenant),
  }
  assert set(job.forjd_erased_tenant_ids) == {str(old_tenant), str(current_tenant)}


@pytest.mark.django_db
def test_stale_lifecycle_worker_cannot_mutate_new_lease_or_completed_job(test_user: User) -> None:
  from account.lifecycle import _fail_job

  stale_token = uuid4()
  current_token = uuid4()
  job = UserLifecycleJob.objects.create(
    user=test_user,
    account_id=test_user.profile.account_id,
    state=UserLifecycleJob.State.RUNNING,
    lease_token=current_token,
    lease_expires_at=timezone.now() + timedelta(minutes=10),
    attempts=2,
    last_error="current-owner",
  )

  assert (
    _fail_job(
      job.id,
      stale_token,
      failure_code="StaleFailure",
      detail="stale worker",
    )
    is False
  )
  job.refresh_from_db()
  assert job.state == UserLifecycleJob.State.RUNNING
  assert job.lease_token == current_token
  assert job.last_error == "current-owner"

  UserLifecycleJob.objects.filter(pk=job.pk, lease_token=current_token).update(
    state=UserLifecycleJob.State.COMPLETED,
    lease_token=None,
    lease_expires_at=None,
    completed_at=timezone.now(),
  )
  assert (
    _fail_job(
      job.id,
      stale_token,
      failure_code="LateFailure",
      detail="must not regress",
    )
    is False
  )
  job.refresh_from_db()
  assert job.state == UserLifecycleJob.State.COMPLETED
  assert job.completed_at is not None


@pytest.mark.django_db
def test_lifecycle_dead_letter_backoff_and_operator_revive(test_user: User) -> None:
  from account.lifecycle import execute_deletion_job

  job = UserLifecycleJob.objects.create(
    user=test_user,
    account_id=test_user.profile.account_id,
    max_attempts=1,
    forjd_erase_targets=[
      {
        "tenant_id": str(uuid4()),
        "service_token_secret_ref": "env:FORJD_SERVICE_TOKEN_CUSTOMER_A",
      }
    ],
  )
  with patch(
    "account.lifecycle._erase_forjd_tenant",
    return_value=(False, "ForjdUnavailable"),
  ):
    assert execute_deletion_job(job) is False

  job.refresh_from_db()
  assert job.state == UserLifecycleJob.State.DEAD_LETTER
  assert job.attempts == 1
  assert job.failure_code == "ForjdUnavailable"
  assert job.next_attempt_at is None

  call_command("revive_lifecycle_job", str(job.id))
  job.refresh_from_db()
  assert job.state == UserLifecycleJob.State.PENDING
  assert job.attempts == 0
  assert job.next_attempt_at is not None


@pytest.mark.django_db
def test_lifecycle_reconciler_skips_not_due_poison_jobs(test_user: User) -> None:
  from account.lifecycle import process_pending_lifecycle_jobs

  deferred = UserLifecycleJob.objects.create(
    user=test_user,
    account_id=uuid4(),
    state=UserLifecycleJob.State.FAILED,
    next_attempt_at=timezone.now() + timedelta(hours=1),
  )
  ready = UserLifecycleJob.objects.create(
    user=test_user,
    account_id=test_user.profile.account_id,
    state=UserLifecycleJob.State.PENDING,
  )

  with patch("account.lifecycle.execute_deletion_job", return_value=True) as execute:
    assert process_pending_lifecycle_jobs(limit=1) == 1

  execute.assert_called_once()
  assert execute.call_args.args[0].pk == ready.pk
  assert execute.call_args.args[0].pk != deferred.pk


def test_forjd_erase_closes_loop_owned_connector() -> None:
  from account.lifecycle import _erase_forjd_tenant
  from forjd.tenancy import ForjdTenantCredential

  tenant_id = UUID("00000000-0000-0000-0000-000000000001")
  with (
    patch(
      "forjd.tenancy.resolve_forjd_snapshot_credential",
      return_value=ForjdTenantCredential(
        tenant_id=tenant_id,
        service_token="fjsvc_abcdefgh_test-secret",
      ),
    ),
    patch("forjd.client.ForjdClient") as client_class,
    patch("forjd.client.close_forjd_connector", new_callable=AsyncMock) as close,
  ):
    client_class.return_value.erase_tenant = AsyncMock(return_value={"ok": True})
    erased, error = _erase_forjd_tenant(
      {
        "tenant_id": str(tenant_id),
        "service_token_secret_ref": "env:FORJD_SERVICE_TOKEN",
      },
      uuid4(),
    )

  assert erased is True
  assert error == ""
  client_class.return_value.erase_tenant.assert_awaited_once_with(str(tenant_id))
  close.assert_awaited_once()
