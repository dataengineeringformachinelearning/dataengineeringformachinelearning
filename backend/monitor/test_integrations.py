"""Analytics integrations — sealed credentials, auth/role gating, OAuth state."""

from __future__ import annotations

import json
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.core import signing
from django.test import Client

from monitor.integrations import OAUTH_STATE_SALT, open_integration_credentials
from monitor.models import AnalyticsIntegration, AuditLog


# --- Fixtures (Firebase middleware honors mock bearer tokens under DEBUG) ---
def _make_user(username: str, role: str = "Operator") -> User:
  user = User.objects.create_user(username=username, email=f"{username}@example.com")
  user.profile.role = role
  user.profile.save(update_fields=["role"])
  return user


def _client_for(username: str) -> Client:
  return Client(HTTP_AUTHORIZATION=f"Bearer mock-token-{username}-{username}@example.com")


@pytest.fixture
def user(db) -> User:
  return _make_user("analyst")


@pytest.fixture
def auth_client(user: User) -> Client:
  return _client_for("analyst")


# --- Auth gating ---
@pytest.mark.django_db
def test_list_requires_auth() -> None:
  response = Client().get("/api/v1/system-status/integrations")
  assert response.status_code == 401


@pytest.mark.django_db
def test_clarity_save_requires_auth() -> None:
  response = Client().post(
    "/api/v1/system-status/integrations/clarity",
    data=json.dumps({"project_id": "p", "api_key": "k"}),
    content_type="application/json",
  )
  assert response.status_code == 401


@pytest.mark.django_db
def test_viewer_role_cannot_mutate() -> None:
  _make_user("watcher", role="Viewer")
  viewer_client = _client_for("watcher")
  save = viewer_client.post(
    "/api/v1/system-status/integrations/clarity",
    data=json.dumps({"project_id": "p", "api_key": "k"}),
    content_type="application/json",
  )
  assert save.status_code == 403
  # Reads stay open to Viewers (settings page shows connection status).
  listed = viewer_client.get("/api/v1/system-status/integrations")
  assert listed.status_code == 200
  assert listed.json() == []


# --- Keyed providers (Clarity / Cloudflare) ---
@pytest.mark.django_db
def test_clarity_save_seals_credentials(auth_client: Client, user: User) -> None:
  response = auth_client.post(
    "/api/v1/system-status/integrations/clarity",
    data=json.dumps({"project_id": "proj-1", "api_key": "clarity-key"}),
    content_type="application/json",
  )
  assert response.status_code == 200
  body = response.json()
  assert body["provider"] == "microsoft"
  assert body["active"] is True
  assert "api_key" not in body and "credentials" not in body

  integration = AnalyticsIntegration.objects.get(
    account_id=user.profile.account_id, provider="microsoft"
  )
  assert "clarity-key" not in integration.credentials_ciphertext
  assert open_integration_credentials(integration) == {
    "project_id": "proj-1",
    "api_key": "clarity-key",  # pragma: allowlist secret
  }
  assert AuditLog.objects.filter(
    action="ANALYTICS_INTEGRATION_CONNECTED", resource_id=str(integration.id)
  ).exists()


@pytest.mark.django_db
def test_cloudflare_save_upserts(auth_client: Client, user: User) -> None:
  for key in ("token-a", "token-b"):
    response = auth_client.post(
      "/api/v1/system-status/integrations/cloudflare",
      data=json.dumps({"project_id": "acct-1", "api_key": key}),
      content_type="application/json",
    )
    assert response.status_code == 200
  rows = AnalyticsIntegration.objects.filter(
    account_id=user.profile.account_id, provider="cloudflare"
  )
  assert rows.count() == 1
  credentials = open_integration_credentials(rows.get())
  assert credentials["api_key"] == "token-b"  # pragma: allowlist secret


@pytest.mark.django_db
def test_keyed_save_rejects_missing_fields(auth_client: Client) -> None:
  response = auth_client.post(
    "/api/v1/system-status/integrations/clarity",
    data=json.dumps({"project_id": "", "api_key": ""}),
    content_type="application/json",
  )
  assert response.status_code == 400


# --- List / delete (account isolation) ---
@pytest.mark.django_db
def test_list_and_delete_scoped_to_account(auth_client: Client, user: User) -> None:
  auth_client.post(
    "/api/v1/system-status/integrations/cloudflare",
    data=json.dumps({"project_id": "acct", "api_key": "k"}),
    content_type="application/json",
  )
  listed = auth_client.get("/api/v1/system-status/integrations").json()
  assert [row["provider"] for row in listed] == ["cloudflare"]

  _make_user("other")
  other_client = _client_for("other")
  assert other_client.get("/api/v1/system-status/integrations").json() == []
  denied = other_client.delete(f"/api/v1/system-status/integrations/{listed[0]['id']}")
  assert denied.status_code == 404

  deleted = auth_client.delete(f"/api/v1/system-status/integrations/{listed[0]['id']}")
  assert deleted.status_code == 200
  assert not AnalyticsIntegration.objects.filter(account_id=user.profile.account_id).exists()


@pytest.mark.django_db
def test_delete_rejects_malformed_id(auth_client: Client) -> None:
  response = auth_client.delete("/api/v1/system-status/integrations/not-a-uuid")
  assert response.status_code == 404


# --- Google OAuth ---
@pytest.mark.django_db
def test_google_auth_url_requires_configuration(auth_client: Client, settings) -> None:
  settings.GOOGLE_OAUTH_CLIENT_ID = ""
  response = auth_client.get("/api/v1/system-status/integrations/google/auth-url")
  assert response.status_code == 503


@pytest.mark.django_db
def test_google_auth_url_returns_signed_state(auth_client: Client, settings) -> None:
  settings.GOOGLE_OAUTH_CLIENT_ID = "client-123"
  settings.BACKEND_URL = "https://backend.deml.app"
  response = auth_client.get("/api/v1/system-status/integrations/google/auth-url")
  assert response.status_code == 200
  body = response.json()
  assert body["url"].startswith("https://accounts.google.com/o/oauth2/v2/auth?")
  assert "client-123" in body["url"]
  assert body["redirect_uri"].endswith("/api/v1/system-status/integrations/google/callback")


@pytest.mark.django_db
def test_google_callback_rejects_bad_state(client: Client, settings) -> None:
  settings.FRONTEND_URL = "https://deml.app"
  response = client.get(
    "/api/v1/system-status/integrations/google/callback",
    {"code": "abc", "state": "tampered"},
  )
  assert response.status_code == 302
  assert "status=failed" in response["Location"]


@pytest.mark.django_db
def test_google_callback_seals_tokens(client: Client, user: User, settings) -> None:
  settings.FRONTEND_URL = "https://deml.app"
  settings.GOOGLE_OAUTH_CLIENT_ID = "client-123"
  settings.GOOGLE_OAUTH_CLIENT_SECRET = "secret-456"  # pragma: allowlist secret
  state = signing.dumps({"uid": user.id}, salt=OAUTH_STATE_SALT)

  class FakeResponse:
    @staticmethod
    def json() -> dict[str, object]:
      return {"access_token": "ga-token", "refresh_token": "ga-refresh", "expires_in": 3600}

  with patch("monitor.integrations.requests.post", return_value=FakeResponse()) as mocked:
    response = client.get(
      "/api/v1/system-status/integrations/google/callback",
      {"code": "abc", "state": state},
    )
  assert mocked.called
  assert response.status_code == 302
  assert "status=success" in response["Location"]

  integration = AnalyticsIntegration.objects.get(
    account_id=user.profile.account_id, provider="google"
  )
  credentials = open_integration_credentials(integration)
  assert credentials["access_token"] == "ga-token"
  assert "ga-token" not in integration.credentials_ciphertext
