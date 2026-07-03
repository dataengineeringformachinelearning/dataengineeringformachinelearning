"""Tests for deml-daemon internal API endpoints."""

import pytest
from django.test import Client, override_settings


@pytest.mark.django_db
@override_settings(
  SECURE_SSL_REDIRECT=True,
  SECURE_PROXY_SSL_HEADER=("HTTP_X_FORWARDED_PROTO", "https"),
)
def test_ingest_ping_does_not_ssl_redirect(client: Client, settings) -> None:
  secret = "test-internal-secret"  # pragma: allowlist secret
  settings.INTERNAL_SECRET = secret
  # secure=True simulates internal mesh HTTPS; InternalMeshMiddleware also sets
  # HTTP_X_FORWARDED_PROTO for plain-HTTP sidecar calls in production.
  response = client.post(
    "/api/v1/internal/ingest/ping/",
    data=[],
    content_type="application/json",
    HTTP_X_INTERNAL_SECRET=secret,
    secure=True,
  )
  assert response.status_code != 301
  assert response.status_code == 200
  assert response.json() == {"ok": True, "inserted": 0, "message": "empty batch"}
