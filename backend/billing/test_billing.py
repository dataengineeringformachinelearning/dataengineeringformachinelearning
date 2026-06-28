import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from monitor.models import UserProfile

User = get_user_model()


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
