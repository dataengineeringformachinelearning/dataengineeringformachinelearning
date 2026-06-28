import pytest
from django.test import override_settings

from utils.service_urls import get_normalized_service_info, resolve_ping_url


@pytest.mark.parametrize(
  "raw,expected_url,expected_name",
  [
    (
      "https://backend.deml.app/api/v1/auth/register",
      "https://deml.app/login",
      "Auth Register",
    ),
    (
      "https://deml.app/api/v1/model/latest",
      "https://deml.app/api/v1/ml/latest",
      "ML Engine Latest",
    ),
    (
      "https://deml.app/api/v1/telemetry/cookie-consent",
      "https://deml.app/privacy",
      "Telemetry Cookie Consent",
    ),
  ],
)
@override_settings(
  FRONTEND_URL="https://deml.app", MARKETING_URL="https://dataengineeringformachinelearning.com"
)
def test_get_normalized_service_info(raw, expected_url, expected_name):
  url, name = get_normalized_service_info(raw)
  assert url == expected_url
  assert name == expected_name


@override_settings(FRONTEND_URL="https://deml.app")
def test_resolve_ping_url_rewrites_stale_api_paths():
  assert (
    resolve_ping_url("https://backend.deml.app/api/v1/auth/register") == "https://deml.app/login"
  )
  assert (
    resolve_ping_url("https://deml.app/api/v1/model/latest") == "https://deml.app/api/v1/ml/latest"
  )
