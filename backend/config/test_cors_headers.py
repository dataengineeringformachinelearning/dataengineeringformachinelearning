import pytest
from django.test import Client


@pytest.mark.django_db
def test_cors_preflight_allows_deml_session_header(client: Client) -> None:
  """Preflight must allow X-DEML-Session-Id or deml.app API calls fail with CORS."""
  response = client.options(
    "/api/v1/auth/sessions",
    HTTP_ORIGIN="https://deml.app",
    HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
    HTTP_ACCESS_CONTROL_REQUEST_HEADERS="authorization,x-deml-session-id",
  )
  assert response.status_code == 200
  allowed = response.headers.get("Access-Control-Allow-Headers", "")
  assert "x-deml-session-id" in allowed.lower()


@pytest.mark.django_db
def test_cors_preflight_allows_authorization_header(client: Client) -> None:
  response = client.options(
    "/api/v1/auth/user",
    HTTP_ORIGIN="https://deml.app",
    HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
    HTTP_ACCESS_CONTROL_REQUEST_HEADERS="authorization",
  )
  assert response.status_code == 200
  allowed = response.headers.get("Access-Control-Allow-Headers", "")
  assert "authorization" in allowed.lower()
