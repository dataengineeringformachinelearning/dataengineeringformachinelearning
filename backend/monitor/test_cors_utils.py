from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client, override_settings

from monitor.cors_utils import is_domain_registered
from monitor.models import ValidatedSite

User = get_user_model()


@pytest.mark.django_db
@override_settings(CORS_ALLOWED_ORIGINS=[])
def test_verified_registered_domain_is_allowed_dynamically(client: Client) -> None:
  cache.clear()
  user = User.objects.create_user(username="cors-owner")
  ValidatedSite.objects.create(user=user, domain="customer.example", is_verified=True)

  response = client.options(
    "/api/v1/auth/user",
    HTTP_ORIGIN="https://customer.example",
    HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
  )

  assert response.headers["Access-Control-Allow-Origin"] == "https://customer.example"


@pytest.mark.django_db
@pytest.mark.parametrize(
  "origin",
  [
    "",
    "customer.example",
    "ftp://customer.example",
    "https://unregistered.example",
  ],
)
def test_unregistered_or_invalid_origin_fails_closed(origin: str) -> None:
  cache.clear()
  assert is_domain_registered(origin) is False


@pytest.mark.django_db
@override_settings(CORS_ALLOWED_ORIGINS=[])
@pytest.mark.parametrize(
  "origin",
  [
    "https://deml.app",
    "https://www.deml.app",
    "http://localhost:4200",
  ],
)
def test_platform_origins_are_always_allowed(origin: str) -> None:
  cache.clear()
  assert is_domain_registered(origin) is True


@pytest.mark.django_db
def test_unverified_domain_fails_closed() -> None:
  cache.clear()
  user = User.objects.create_user(username="unverified-owner")
  ValidatedSite.objects.create(user=user, domain="pending.example", is_verified=False)

  assert is_domain_registered("https://pending.example") is False
