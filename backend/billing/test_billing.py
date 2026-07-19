from io import StringIO
from typing import Any
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
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
  assert response.status_code in [200, 400, 409, 500]


@pytest.mark.django_db
@override_settings(
  STRIPE_SECRET_KEY="sk_test",  # pragma: allowlist secret
  STRIPE_PRICE_ID="price_test_123",
)
@patch("billing.api.stripe.checkout.Session.create")
def test_checkout_binds_account_metadata_and_customer(
  create_session,
  authenticated_client,
  test_user,
) -> None:
  profile = test_user.profile
  profile.role = "Operator"
  profile.tier = "Standard"
  profile.subscription_active = False
  profile.stripe_customer_id = "cus_existing"
  profile.save(update_fields=["role", "tier", "subscription_active", "stripe_customer_id"])
  create_session.return_value = _Obj(url="https://checkout.stripe.test/session")

  response = authenticated_client.post(
    "/api/v1/billing/create-checkout-session",
    data=b"{}",
    content_type="application/json",
  )

  assert response.status_code == 200
  assert response.json()["checkout_url"] == "https://checkout.stripe.test/session"
  kwargs = create_session.call_args.kwargs
  assert kwargs["client_reference_id"] == str(profile.account_id)
  assert kwargs["metadata"] == {"deml_account_id": str(profile.account_id)}
  assert kwargs["subscription_data"] == {"metadata": {"deml_account_id": str(profile.account_id)}}
  assert kwargs["customer"] == "cus_existing"
  assert kwargs["line_items"][0]["price"] == "price_test_123"
  assert "customer_email" not in kwargs


@pytest.mark.django_db
@override_settings(STRIPE_SECRET_KEY="sk_test")  # pragma: allowlist secret
@patch("billing.api.stripe.checkout.Session.create")
def test_checkout_rejects_active_pro_subscription(
  create_session,
  authenticated_client,
  test_user,
) -> None:
  profile = test_user.profile
  profile.role = "Operator"
  profile.tier = "Pro"
  profile.subscription_active = True
  profile.save(update_fields=["role", "tier", "subscription_active"])

  response = authenticated_client.post(
    "/api/v1/billing/create-checkout-session",
    data=b"{}",
    content_type="application/json",
  )

  assert response.status_code == 409
  assert response.json()["error"] == "Pro subscription already active"
  create_session.assert_not_called()


@pytest.mark.django_db
@override_settings(STRIPE_SECRET_KEY="sk_test")  # pragma: allowlist secret
@patch("billing.api.stripe.Customer.list")
@patch("billing.api.stripe.Subscription.retrieve")
def test_sync_uses_bound_subscription_id_never_email_lookup(
  retrieve_subscription,
  list_customers,
  authenticated_client,
  test_user,
) -> None:
  profile = test_user.profile
  profile.tier = "Standard"
  profile.subscription_active = False
  profile.stripe_subscription_id = "sub_bound"
  profile.save(update_fields=["tier", "subscription_active", "stripe_subscription_id"])
  retrieve_subscription.return_value = {
    "id": "sub_bound",
    "status": "active",
    "customer": "cus_bound",
    "current_period_end": 2_000_000_000,
    "cancel_at_period_end": False,
  }

  with patch("billing.api.stripe.api_key", "sk_test"):  # pragma: allowlist secret
    response = authenticated_client.post("/api/v1/billing/sync")

  assert response.status_code == 200
  assert response.json()["active"] is True
  list_customers.assert_not_called()
  retrieve_subscription.assert_called_once_with("sub_bound")
  profile.refresh_from_db()
  assert profile.tier == "Pro"
  assert profile.subscription_active is True
  assert profile.stripe_customer_id == "cus_bound"


@pytest.mark.django_db
@override_settings(STRIPE_SECRET_KEY="sk_test")  # pragma: allowlist secret
@patch("billing.api.stripe.Customer.list")
def test_sync_without_stripe_ids_downgrades_manual_pro(
  list_customers,
  authenticated_client,
  test_user,
) -> None:
  profile = test_user.profile
  profile.tier = "Pro"
  profile.subscription_active = True
  profile.stripe_customer_id = None
  profile.stripe_subscription_id = None
  profile.save(
    update_fields=[
      "tier",
      "subscription_active",
      "stripe_customer_id",
      "stripe_subscription_id",
    ]
  )

  with patch("billing.api.stripe.api_key", "sk_test"):  # pragma: allowlist secret
    response = authenticated_client.post("/api/v1/billing/sync")

  assert response.status_code == 200
  assert response.json()["active"] is False
  list_customers.assert_not_called()
  profile.refresh_from_db()
  assert profile.tier == "Standard"
  assert profile.subscription_active is False


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
        "payment_status": "paid",
        "mode": "subscription",
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
        "payment_status": "paid",
        "mode": "subscription",
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
        "payment_status": "paid",
        "mode": "subscription",
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


@pytest.mark.django_db
@override_settings(STRIPE_WEBHOOK_SECRET="whsec_test")
@patch("billing.api.stripe.Subscription.retrieve")
@patch("billing.api.stripe.Webhook.construct_event")
def test_checkout_webhook_ignores_unpaid_payment_status(
  construct_event,
  retrieve_subscription,
  client: Client,
  test_user,
) -> None:
  profile = test_user.profile
  profile.tier = "Standard"
  profile.subscription_active = False
  profile.save(update_fields=["tier", "subscription_active"])
  construct_event.return_value = {
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "client_reference_id": str(profile.account_id),
        "customer": "cus_unpaid",
        "subscription": "sub_unpaid",
        "payment_status": "unpaid",
        "mode": "subscription",
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
  retrieve_subscription.assert_not_called()
  profile.refresh_from_db()
  assert profile.tier == "Standard"
  assert profile.subscription_active is False


@pytest.mark.django_db
@override_settings(STRIPE_SECRET_KEY="sk_test")  # pragma: allowlist secret
@patch("billing.api.stripe.Subscription.retrieve")
def test_sync_subscriptions_command_downgrades_canceled(
  retrieve_subscription,
  test_user,
) -> None:
  profile = test_user.profile
  profile.tier = "Pro"
  profile.subscription_active = True
  profile.stripe_subscription_id = "sub_canceled"
  profile.save(update_fields=["tier", "subscription_active", "stripe_subscription_id"])
  retrieve_subscription.return_value = {"id": "sub_canceled", "status": "canceled"}

  out = StringIO()
  call_command("sync_subscriptions", stdout=out)

  profile.refresh_from_db()
  assert profile.tier == "Standard"
  assert profile.subscription_active is False
  assert "downgraded=1" in out.getvalue()
