import pytest
from django.contrib.auth import get_user_model
from django.test import Client

User = get_user_model()


@pytest.mark.django_db
def test_demo_api_key_authentication(client: Client) -> None:
  # Verify that the demo API key authenticates the demo user successfully
  # and grants them Operator role permissions.
  response = client.post(
    "/api/v1/ingest",
    data={"batch_id": "test-batch", "records": []},
    content_type="application/json",
    HTTP_AUTHORIZATION="Bearer deml_demo_api_key_2026",
  )
  assert response.status_code == 200
  data = response.json()
  assert data["status"] == "success"
  assert data["processed_records"] == 0

  # Check that the demo_user is persisted
  demo_user = User.objects.filter(username="demo_user").first()
  assert demo_user is not None
  assert demo_user.email == "demo@deml.app"
  assert demo_user.profile.role == "Operator"


@pytest.mark.django_db
def test_csp_and_security_headers_middleware(client: Client) -> None:
  # Check if text/html responses include the security headers injected by ContentSecurityPolicyMiddleware
  response = client.get("/api/v1/docs")
  assert response.status_code == 200

  # Verify CSP and security headers
  assert "Content-Security-Policy" in response
  assert "X-Frame-Options" in response
  assert "X-Content-Type-Options" in response
  assert "X-XSS-Protection" in response
  assert "Referrer-Policy" in response
  assert "Permissions-Policy" in response

  assert response["X-Frame-Options"] == "SAMEORIGIN"
  assert response["X-Content-Type-Options"] == "nosniff"
  assert "default-src 'self'" in response["Content-Security-Policy"]
