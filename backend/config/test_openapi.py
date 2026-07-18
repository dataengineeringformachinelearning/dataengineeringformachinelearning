"""Regression coverage for the user-control-plane API boundary."""

from typing import Any, Final

import pytest
from django.test import Client


@pytest.mark.django_db
def test_openapi_exposes_forjd_handoff_and_no_local_processing(client: Client) -> None:
  response = client.get("/api/v1/openapi.json")

  assert response.status_code == 200
  payload: dict[str, Any] = response.json()
  paths: dict[str, Any] = payload.get("paths", {})
  assert "post" in paths["/api/v1/forjd/ingest"]
  assert "post" in paths["/api/v1/forjd/ingest/events:batch"]

  serialized_contract = str(payload)
  assert "application/forjd-telemetry+v1" in serialized_contract
  assert "deml_telemetry" in serialized_contract
  assert "deml_learning" not in serialized_contract
  assert "/api/v1/deml-compat" not in serialized_contract

  retired_prefixes: Final[tuple[str, ...]] = (
    "/api/v1/ingest",
    "/api/v1/predict",
    "/api/v1/ml/",
    "/api/v1/telemetry/",
    "/api/v1/analytics/",
    "/api/v1/exports/",
    "/api/v1/system-status/",
  )
  assert not any(path.startswith(retired_prefixes) for path in paths)
