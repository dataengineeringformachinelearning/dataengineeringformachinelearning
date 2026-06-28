import pytest
from account.platform import ensure_platform_status_page
from django.contrib.auth import get_user_model

from monitor.models import StatusPage, UserProfile
from monitor.subscription import owner_has_pro_subscription

User = get_user_model()


@pytest.mark.django_db
def test_owner_has_pro_subscription_true_for_active_pro():
  user = User.objects.create_user(username="prouser", password="pw", email="pro@example.com")
  UserProfile.objects.create(user=user, tier="Pro", subscription_active=True)
  page = StatusPage.objects.create(user=user, title="Pro Page", slug="pro-page", is_published=True)
  assert owner_has_pro_subscription(page) is True


@pytest.mark.django_db
def test_owner_has_pro_subscription_false_for_standard_tier():
  user = User.objects.create_user(username="freeuser", password="pw", email="free@example.com")
  UserProfile.objects.create(user=user, tier="Standard", subscription_active=True)
  page = StatusPage.objects.create(
    user=user, title="Free Page", slug="free-page", is_published=True
  )
  assert owner_has_pro_subscription(page) is False


@pytest.mark.django_db
def test_owner_has_pro_subscription_false_for_inactive_pro():
  user = User.objects.create_user(username="lapsed", password="pw", email="lapsed@example.com")
  UserProfile.objects.create(user=user, tier="Pro", subscription_active=False)
  page = StatusPage.objects.create(
    user=user, title="Lapsed Page", slug="lapsed-page", is_published=True
  )
  assert owner_has_pro_subscription(page) is False


@pytest.mark.django_db
def test_owner_has_pro_subscription_false_for_platform_page():
  page = ensure_platform_status_page()
  assert owner_has_pro_subscription(page) is False
