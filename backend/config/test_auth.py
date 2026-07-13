import base64
import hashlib
from typing import Any
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

User = get_user_model()


class FakeRedis:
  def __init__(self) -> None:
    self.values: dict[str, str] = {}

  def setex(self, key: str, _ttl: int, value: str) -> None:
    self.values[key] = value

  def get(self, key: str) -> str | None:
    return self.values.get(key)

  def delete(self, key: str) -> None:
    self.values.pop(key, None)


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
  redis = FakeRedis()
  with patch("utils.rate_limit.redis_client", redis):
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
  redis = FakeRedis()
  with patch("utils.rate_limit.redis_client", redis):
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
@patch("account.lifecycle.delete_firebase_user")
@patch("account.lifecycle.cancel_stripe_for_profile")
def test_delete_account_authenticated(
  _mock_stripe: Any,
  _mock_firebase: Any,
  client: Client,
  test_user: User,
  mock_verify_token: Any,
) -> None:
  response = client.delete("/api/v1/auth/delete-account", HTTP_AUTHORIZATION="Bearer valid-token")
  assert response.status_code == 200
  body = response.json()
  assert body["status"] in ("success", "accepted")
  assert body.get("completed") is True
  assert not User.objects.filter(username="authuser").exists()


@pytest.mark.django_db
def test_delete_account_unauthenticated(client: Client) -> None:
  response = client.delete("/api/v1/auth/delete-account")
  assert response.status_code == 401
