import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth.models import User
from django.test import Client
from monitor.models import Tenant, TenantMembership

# Create a test user and tenant
user, _ = User.objects.get_or_create(username="testuser")
user.set_unusable_password()
user.save()

tenant, _ = Tenant.objects.get_or_create(name="test_tenant", slug="test-tenant")
TenantMembership.objects.get_or_create(user=user, tenant=tenant)

client = Client()


# Mock the firebase middleware authentication
class MockMiddleware:
  def process_request(self, request):
    request.user = user
    return None


# We can bypass middleware by logging in, but since we use token we can just mock it
# Actually, the middleware handles "Bearer mock-system-token"
response = client.post("/api/v1/billing/sync", HTTP_AUTHORIZATION="Bearer mock-system-token")
print("SYNC RESPONSE:", response.status_code, response.content)

response = client.post(
  "/api/v1/billing/create-checkout-session", HTTP_AUTHORIZATION="Bearer mock-system-token"
)
print("CHECKOUT RESPONSE:", response.status_code, response.content)
