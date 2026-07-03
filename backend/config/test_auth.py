from typing import Any
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

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
