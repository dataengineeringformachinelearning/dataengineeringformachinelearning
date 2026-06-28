from typing import Any
from unittest.mock import patch

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import Client

User = get_user_model()


@pytest.fixture(autouse=True, scope="session")
def setup_test_db():
  settings.DATABASES = {
    "default": {
      "ENGINE": "django.db.backends.sqlite3",
      "NAME": ":memory:",
    }
  }


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
  pass


@pytest.fixture
def test_user(db: Any) -> User:
  return User.objects.create_user(
    username="testuser",
    password="password123",  # pragma: allowlist secret
    email="test@example.com",
  )


@pytest.fixture
def mock_verify_token() -> Any:
  with patch("firebase_admin.auth.verify_id_token") as mock:
    mock.return_value = {"uid": "testuser", "email": "test@example.com", "name": "testuser"}
    yield mock


@pytest.fixture
def authenticated_client(client: Client, test_user: User, mock_verify_token: Any) -> Any:
  original_request = client.request

  def new_request(*args, **kwargs):
    kwargs["HTTP_AUTHORIZATION"] = "Bearer valid-token"
    return original_request(*args, **kwargs)

  client.request = new_request
  yield client
  client.request = original_request
