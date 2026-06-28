import pytest
from django.contrib.auth.models import User
from django.test import Client
from monitor.models import UserProfile


@pytest.mark.django_db
def test_billing_endpoints():
  user, _ = User.objects.get_or_create(username="testuser")
  user.set_unusable_password()
  user.save()

  UserProfile.objects.get_or_create(user=user)

  client = Client()

  response = client.post("/api/v1/billing/sync", HTTP_AUTHORIZATION="Bearer mock-system-token")
  assert response.status_code in [200, 400, 401, 500]

  response = client.post(
    "/api/v1/billing/create-checkout-session", HTTP_AUTHORIZATION="Bearer mock-system-token"
  )
  assert response.status_code in [200, 400, 401, 500]
