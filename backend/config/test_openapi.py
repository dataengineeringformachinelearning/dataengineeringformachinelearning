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
  assert (
    payload["components"]["schemas"]["SealedEventBatch"]["properties"]["events"]["maxItems"] == 25
  )

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


@pytest.mark.django_db
def test_viking_swagger_shell_is_served(client: Client) -> None:
  response = client.get("/api/v1/docs")
  assert response.status_code == 200
  body = response.content.decode()
  assert "swagger-ui" in body
  assert "backend-swagger" in body
  assert "Documentation" in body


@pytest.mark.django_db
def test_home_and_documentation_landing_copy(client: Client) -> None:
  home = client.get("/")
  assert home.status_code == 200
  home_body = home.content.decode()
  assert "Documentation" in home_body
  assert "Swagger UI" in home_body
  assert (
    'content="User control-plane API for the DEML learning platform and its secure FORJD data handoff."'
    in home_body
  )
  # Meta description must stay in <head>; bare text leaks above the navbar.
  pre_main = home_body.split("<main", 1)[0]
  body_chunk = pre_main.split("<body", 1)[-1]
  assert "User control-plane API" not in body_chunk

  docs = client.get("/documentation")
  assert docs.status_code == 200
  docs_body = docs.content.decode()
  assert "/api/v1/forjd/ingest" in docs_body
  assert "/api/v1/forjd/capabilities" in docs_body
  assert "/api/v1/predict" not in docs_body
  assert "Blue Notes" in docs_body
