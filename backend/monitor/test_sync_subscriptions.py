from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import override_settings

from monitor.models import UserProfile

User = get_user_model()


@pytest.mark.django_db
@override_settings(STRIPE_SECRET_KEY="sk_test")  # pragma: allowlist secret
def test_sync_subscriptions_downgrades_lapsed_pro_user(test_user):
  profile, _ = UserProfile.objects.get_or_create(user=test_user)
  profile.tier = "Pro"
  profile.subscription_active = True
  profile.stripe_customer_id = "cus_test123"
  profile.save()

  mock_customer = MagicMock()
  mock_customer.id = "cus_test123"
  mock_customer.deleted = False

  with (
    patch("stripe.Customer.retrieve", return_value=mock_customer),
    patch("stripe.Subscription.list", return_value=MagicMock(data=[])),
  ):
    call_command("sync_subscriptions")

  profile.refresh_from_db()
  assert profile.tier == "Standard"
  assert profile.subscription_active is False


@pytest.mark.django_db
@override_settings(STRIPE_SECRET_KEY="sk_test")  # pragma: allowlist secret
def test_sync_subscriptions_preserves_manual_pro_without_stripe(test_user):
  profile, _ = UserProfile.objects.get_or_create(user=test_user)
  profile.tier = "Pro"
  profile.subscription_active = True
  profile.stripe_customer_id = None
  profile.save()

  call_command("sync_subscriptions")

  profile.refresh_from_db()
  assert profile.tier == "Pro"
  assert profile.subscription_active is True


@pytest.mark.django_db
@override_settings(STRIPE_SECRET_KEY="sk_test")  # pragma: allowlist secret
def test_sync_subscriptions_upgrades_active_stripe_subscription(test_user):
  profile, _ = UserProfile.objects.get_or_create(user=test_user)
  profile.tier = "Standard"
  profile.subscription_active = False
  profile.stripe_customer_id = "cus_active"
  profile.save()

  mock_customer = MagicMock()
  mock_customer.id = "cus_active"
  mock_customer.deleted = False

  mock_sub = MagicMock()
  mock_sub.id = "sub_active"
  mock_sub.current_period_end = 2_000_000_000

  with (
    patch("stripe.Customer.retrieve", return_value=mock_customer),
    patch("stripe.Subscription.list", return_value=MagicMock(data=[mock_sub])),
  ):
    call_command("sync_subscriptions")

  profile.refresh_from_db()
  assert profile.tier == "Pro"
  assert profile.subscription_active is True
  assert profile.stripe_subscription_id == "sub_active"


@pytest.mark.django_db
@override_settings(STRIPE_SECRET_KEY="sk_test")  # pragma: allowlist secret
def test_sync_subscriptions_skips_idle_standard_profiles():
  idle_user = User.objects.create_user(
    username="idle",
    password="password123",  # pragma: allowlist secret
    email="",
  )
  profile, _ = UserProfile.objects.get_or_create(user=idle_user)
  profile.tier = "Standard"
  profile.subscription_active = False
  profile.stripe_customer_id = None
  profile.linked_emails = []
  profile.save()

  with patch("stripe.Customer.retrieve") as retrieve_mock:
    call_command("sync_subscriptions")
    retrieve_mock.assert_not_called()
