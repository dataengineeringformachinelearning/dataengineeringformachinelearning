import pytest
from account.platform import ensure_platform_status_page
from django.test import override_settings
from monitor.models import MonitoredService

from utils.service_urls import (
  ensure_platform_monitored_services,
  get_normalized_service_info,
  metrics_url_for_service,
  resolve_ping_url,
)


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


@pytest.mark.django_db
@override_settings(
  FRONTEND_URL="https://deml.app", MARKETING_URL="https://dataengineeringformachinelearning.com"
)
def test_ensure_platform_monitored_services_prunes_duplicates():
  page = ensure_platform_status_page()
  MonitoredService.objects.create(
    status_page=page,
    name="Status Pages Incidents",
    url="https://deml.app/api/v1/system-status/status_pages/4753b71e/incidents",
  )
  MonitoredService.objects.create(
    status_page=page,
    name="Django Web Server",
    url="http://localhost:8000/api/v1/system-status/health",
  )
  MonitoredService.objects.create(
    status_page=page, name="Model Latest", url="https://deml.app/api/v1/model/latest"
  )

  ensure_platform_monitored_services()

  names = set(MonitoredService.objects.filter(status_page=page).values_list("name", flat=True))
  assert "Status Pages Incidents" not in names
  assert "Model Latest" not in names
  assert names == {
    "Django Web Server",
    "Marketing Web Server",
    "Auth User",
    "Auth Register",
    "ML Engine Latest",
    "Telemetry Cookie Consent",
    "Status Pages",
    "Status Pages Slug Platform Status",
  }
  django = MonitoredService.objects.get(status_page=page, name="Django Web Server")
  assert django.url == "https://deml.app/"


@pytest.mark.django_db
@override_settings(
  FRONTEND_URL="https://deml.app", MARKETING_URL="https://dataengineeringformachinelearning.com"
)
def test_ensure_platform_monitored_services_handles_duplicate_names(client):
  from django.test import Client

  page = ensure_platform_status_page()
  MonitoredService.objects.create(
    status_page=page, name="Django Web Server", url="https://deml.app/old-a"
  )
  MonitoredService.objects.create(
    status_page=page, name="Django Web Server", url="https://deml.app/old-b"
  )

  ensure_platform_monitored_services()

  assert MonitoredService.objects.filter(status_page=page, name="Django Web Server").count() == 1
  response = Client().get(f"/api/v1/system-status/status_pages/{page.id}/services")
  assert response.status_code == 200


@override_settings(FRONTEND_URL="https://deml.app")
def test_metrics_url_for_service_normalizes_platform_only():
  raw = "http://localhost:8000/api/v1/system-status/health"
  assert metrics_url_for_service(raw, is_platform=True) == "https://deml.app/"
  assert (
    metrics_url_for_service("http://backend.local", is_platform=False) == "http://backend.local"
  )
