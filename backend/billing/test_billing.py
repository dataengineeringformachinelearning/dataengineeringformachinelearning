from typing import Any

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from monitor.models import UserProfile

from billing.api import _subscription_period_end

User = get_user_model()


class _Obj:
  """Minimal stand-in for a Stripe resource (attribute access, not dict)."""

  def __init__(self, **kwargs: Any) -> None:
    self.__dict__.update(kwargs)


def test_subscription_period_end_top_level_dict() -> None:
  assert _subscription_period_end({"current_period_end": 1000}) == 1000


def test_subscription_period_end_top_level_object() -> None:
  assert _subscription_period_end(_Obj(current_period_end=1234)) == 1234


def test_subscription_period_end_from_items_dict() -> None:
  # Stripe 2025-04 ("basil"): field moved onto subscription items.
  sub = {"items": {"data": [{"current_period_end": 2000}]}}
  assert _subscription_period_end(sub) == 2000


def test_subscription_period_end_from_items_object_picks_latest() -> None:
  sub = _Obj(
    current_period_end=None,
    items=_Obj(data=[_Obj(current_period_end=3000), _Obj(current_period_end=3500)]),
  )
  assert _subscription_period_end(sub) == 3500


def test_subscription_period_end_missing_returns_none() -> None:
  # Must not raise (the previous code raised KeyError here, degrading billing sync).
  assert _subscription_period_end({}) is None
  assert _subscription_period_end(_Obj()) is None


@pytest.mark.django_db
def test_billing_sync_requires_auth():
  client = Client()
  response = client.post("/api/v1/billing/sync")
  assert response.status_code == 401


@pytest.mark.django_db
def test_billing_endpoints_with_authenticated_user(authenticated_client, test_user):
  UserProfile.objects.get_or_create(user=test_user)

  response = authenticated_client.post("/api/v1/billing/sync")
  assert response.status_code == 200
  assert "active" in response.json()

  response = authenticated_client.post("/api/v1/billing/create-checkout-session")
  assert response.status_code in [200, 400, 500]
