from typing import Any
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import Client, override_settings
from monitor.models import UserLifecycleJob, UserProfile

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


@pytest.mark.django_db
@override_settings(STRIPE_WEBHOOK_SECRET="whsec_test")
@patch("billing.api.stripe.Subscription.cancel")
@patch("billing.api.stripe.Webhook.construct_event")
def test_late_checkout_webhook_cancels_subscription_behind_deletion_tombstone(
  construct_event,
  cancel_subscription,
  client: Client,
  test_user,
) -> None:
  profile = test_user.profile
  UserLifecycleJob.objects.create(
    user=test_user,
    account_id=profile.account_id,
    state=UserLifecycleJob.State.FAILED,
  )
  test_user.is_active = False
  test_user.save(update_fields=["is_active"])
  construct_event.return_value = {
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "client_reference_id": str(profile.account_id),
        "customer": "cus_late",
        "subscription": "sub_late",
      }
    },
  }

  response = client.post(
    "/api/v1/billing/webhook",
    data=b"{}",
    content_type="application/json",
    HTTP_STRIPE_SIGNATURE="signed",
  )

  assert response.status_code == 200
  cancel_subscription.assert_called_once_with("sub_late")
  profile.refresh_from_db()
  assert profile.subscription_active is False
  assert profile.stripe_subscription_id in {None, ""}


@pytest.mark.django_db
@override_settings(STRIPE_WEBHOOK_SECRET="whsec_test")
@patch("billing.api.stripe.Subscription.cancel", side_effect=RuntimeError("stripe down"))
@patch("billing.api.stripe.Webhook.construct_event")
def test_late_checkout_webhook_retries_until_cancellation_succeeds(
  construct_event,
  _cancel_subscription,
  client: Client,
  test_user,
) -> None:
  profile = test_user.profile
  UserLifecycleJob.objects.create(
    user=test_user,
    account_id=profile.account_id,
  )
  construct_event.return_value = {
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "client_reference_id": str(profile.account_id),
        "customer": "cus_late",
        "subscription": "sub_late",
      }
    },
  }

  response = client.post(
    "/api/v1/billing/webhook",
    data=b"{}",
    content_type="application/json",
    HTTP_STRIPE_SIGNATURE="signed",
  )

  assert response.status_code == 500


@pytest.mark.django_db
@override_settings(STRIPE_WEBHOOK_SECRET="whsec_test")
@patch("billing.api.stripe.Subscription.cancel")
@patch(
  "billing.api.stripe.Subscription.retrieve", return_value={"current_period_end": 2_000_000_000}
)
@patch("billing.api.stripe.Webhook.construct_event")
def test_active_checkout_webhook_preserves_subscription_upgrade(
  construct_event,
  _retrieve_subscription,
  cancel_subscription,
  client: Client,
  test_user,
) -> None:
  profile = test_user.profile
  construct_event.return_value = {
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "client_reference_id": str(profile.account_id),
        "customer": "cus_active",
        "subscription": "sub_active",
      }
    },
  }

  response = client.post(
    "/api/v1/billing/webhook",
    data=b"{}",
    content_type="application/json",
    HTTP_STRIPE_SIGNATURE="signed",
  )

  assert response.status_code == 200
  cancel_subscription.assert_not_called()
  profile.refresh_from_db()
  assert profile.tier == "Pro"
  assert profile.subscription_active is True
  assert profile.stripe_customer_id == "cus_active"
  assert profile.stripe_subscription_id == "sub_active"
