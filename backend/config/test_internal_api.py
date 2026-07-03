"""Tests for deml-daemon internal API endpoints."""

import pytest
from django.test import Client, override_settings


@pytest.mark.django_db
@override_settings(SECURE_SSL_REDIRECT=True)
def test_ingest_ping_does_not_ssl_redirect(client: Client, settings) -> None:
  secret = "test-internal-secret"  # pragma: allowlist secret
  settings.INTERNAL_SECRET = secret
  response = client.post(
    "/api/v1/internal/ingest/ping/",
    data=[],
    content_type="application/json",
    HTTP_X_INTERNAL_SECRET=secret,
  )
  assert response.status_code != 301
  assert response.status_code == 200
  assert response.json() == {"ok": True, "inserted": 0, "message": "empty batch"}
