"""Verify public integration endpoints are exposed in Swagger OpenAPI schema."""

from typing import Final

import pytest
from django.test import Client


@pytest.mark.django_db
def test_openapi_exposes_public_ingest_predict_endpoints(client: Client) -> None:
  response = client.get("/api/v1/openapi.json")
  assert response.status_code == 200
  paths: dict = response.json().get("paths", {})

  expected: Final[tuple[str, ...]] = (
    "/api/v1/ingest",
    "/api/v1/predict",
    "/api/v1/predict/llm",
  )
  for path in expected:
    assert path in paths, f"Missing public endpoint {path} in OpenAPI schema"
    assert "post" in paths[path], f"POST operation missing for {path}"

  # Internal routes must not leak into public Swagger
  assert "/api/v1/auth/user" not in paths
  assert "/api/v1/billing/sync" not in paths
