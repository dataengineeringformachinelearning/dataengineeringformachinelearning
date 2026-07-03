import datetime
from typing import Any
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from monitor.models import Endpoints, MonitoredService, StatusPage, UserProfile

User = get_user_model()


@pytest.mark.django_db
def test_api_health(client: Client) -> None:
  response = client.get("/api/v1/system-status/health")
  assert response.status_code == 200
  assert response.json() == {"status": "ok"}


@pytest.mark.django_db
def test_api_health_alias(client: Client) -> None:
  response = client.get("/api/v1/health")
  assert response.status_code == 200
  assert response.json() == {"status": "ok"}


@pytest.mark.django_db
def test_get_all_endpoints(authenticated_client: Client, test_user: User) -> None:
  page = StatusPage.objects.create(user=test_user, title="My Status", slug="my-status")
  MonitoredService.objects.create(status_page=page, name="test", url="http://test.com")
  Endpoints.objects.create(
    url="http://test.com",
    status_code=200,
    response_time=datetime.timedelta(milliseconds=150),
    is_active=True,
  )
  response = authenticated_client.get("/api/v1/system-status/endpoints")
  assert response.status_code == 200
  data = response.json()
  assert len(data) == 1
  assert data[0]["url"] == "http://test.com"
  assert data[0]["is_active"] is True


@pytest.mark.django_db
def test_status_page_pro_verified_badge(client: Client, test_user: User) -> None:
  UserProfile.objects.create(user=test_user, tier="Pro", subscription_active=True)
  StatusPage.objects.create(
    user=test_user,
    title="Pro User Status",
    slug="pro-user-status",
    is_published=True,
  )
  User.objects.create_user(username="freeuser", password="password123", email="free@example.com")
  free_user = User.objects.get(username="freeuser")
  UserProfile.objects.create(user=free_user, tier="Standard", subscription_active=False)
  StatusPage.objects.create(
    user=free_user,
    title="Free User Status",
    slug="free-user-status",
    is_published=True,
  )

  response = client.get("/api/v1/system-status/status_pages")
  assert response.status_code == 200
  by_slug = {p["slug"]: p for p in response.json()}

  assert by_slug["pro-user-status"]["is_pro_verified"] is True
  assert by_slug["free-user-status"]["is_pro_verified"] is False
  assert by_slug["platform-status"]["is_pro_verified"] is False


@pytest.mark.django_db
def test_list_status_pages(client: Client) -> None:
  # This endpoint auto-creates the default platform-status page if not present
  response = client.get("/api/v1/system-status/status_pages")
  assert response.status_code == 200
  data = response.json()
  assert len(data) == 1
  assert data[0]["slug"] == "platform-status"


@pytest.mark.django_db
def test_create_status_page(authenticated_client: Client) -> None:
  payload = {
    "title": "New Status Page",
    "slug": "new-status",
    "description": "Custom status description",
  }
  response = authenticated_client.post(
    "/api/v1/system-status/status_pages", data=payload, content_type="application/json"
  )
  assert response.status_code == 200
  data = response.json()
  assert data["title"] == "New Status Page"
  assert data["slug"] == "new-status"
  assert StatusPage.objects.filter(slug="new-status").exists()


@pytest.mark.django_db
def test_create_status_page_unauthenticated(client: Client) -> None:
  payload = {"title": "Unauth Status Page", "slug": "unauth-status"}
  response = client.post(
    "/api/v1/system-status/status_pages", data=payload, content_type="application/json"
  )
  assert response.status_code == 401


@pytest.mark.django_db
def test_delete_status_page(authenticated_client: Client, test_user: User) -> None:
  page = StatusPage.objects.create(
    user=test_user, title="Custom Status Page", slug="custom-status", description="Demo"
  )
  response = authenticated_client.delete(f"/api/v1/system-status/status_pages/{page.id}")
  assert response.status_code == 200
  assert response.json() == {"success": True}
  assert not StatusPage.objects.filter(id=page.id).exists()


@pytest.mark.django_db
def test_delete_system_status_page_forbidden(authenticated_client: Client, test_user: User) -> None:
  from account.platform import ensure_platform_status_page

  page = ensure_platform_status_page()
  response = authenticated_client.delete(f"/api/v1/system-status/status_pages/{page.id}")
  assert response.status_code == 403


@pytest.mark.django_db
def test_add_service(authenticated_client: Client, test_user: User) -> None:
  page = StatusPage.objects.create(user=test_user, title="My Status", slug="my-status")
  payload = {"name": "Frontend Web Server", "url": "http://frontend.local"}
  response = authenticated_client.post(
    f"/api/v1/system-status/status_pages/{page.id}/services",
    data=payload,
    content_type="application/json",
  )
  assert response.status_code == 200
  data = response.json()
  assert data["name"] == "Frontend Web Server"
  assert data["url"] == "http://frontend.local"
  assert MonitoredService.objects.filter(name="Frontend Web Server").exists()


@pytest.mark.django_db
def test_list_platform_services(client: Client) -> None:
  from account.platform import ensure_platform_status_page
  from utils.service_urls import ensure_platform_monitored_services

  page = ensure_platform_status_page()
  ensure_platform_monitored_services()
  response = client.get(f"/api/v1/system-status/status_pages/{page.id}/services")
  assert response.status_code == 200, response.content
  data = response.json()
  assert len(data) >= 1
  assert all("status" in row and "sla" in row for row in data)


@pytest.mark.django_db
def test_list_services(client: Client, test_user: User) -> None:
  page = StatusPage.objects.create(
    user=test_user, title="My Status", slug="my-status", is_published=True
  )
  MonitoredService.objects.create(
    status_page=page, name="Backend Web Server", url="http://backend.local"
  )
  Endpoints.objects.create(
    url="http://backend.local",
    status_code=200,
    response_time=datetime.timedelta(milliseconds=50),
    is_active=True,
  )
  response = client.get(f"/api/v1/system-status/status_pages/{page.id}/services")
  assert response.status_code == 200
  data = response.json()
  assert len(data) == 1
  assert data[0]["name"] == "Backend Web Server"
  assert data[0]["status"] == "Operational"


@pytest.mark.django_db
def test_list_services_matches_trailing_slash_endpoint(client: Client, test_user: User) -> None:
  page = StatusPage.objects.create(
    user=test_user, title="Joe Status", slug="joealongi", is_published=True
  )
  MonitoredService.objects.create(
    status_page=page, name="Personal Site", url="https://joealongi.dev"
  )
  Endpoints.objects.create(
    user=test_user,
    is_platform=False,
    url="https://joealongi.dev/",
    status_code=200,
    response_time=datetime.timedelta(milliseconds=50),
    is_active=True,
  )
  response = client.get(f"/api/v1/system-status/status_pages/{page.id}/services")
  assert response.status_code == 200
  data = response.json()
  assert len(data) == 1
  assert data[0]["status"] == "Operational"
  assert data[0]["sla"] == 100.0


@pytest.mark.django_db
def test_stale_synthetic_monitor_reports_degraded_not_outage(client: Client) -> None:
  from account.platform import ensure_platform_status_page
  from django.utils import timezone

  from monitor.models import SyntheticMonitor

  page = ensure_platform_status_page()
  SyntheticMonitor.objects.create(
    name="Event Projections",
    status="Operational",
    checked_at=timezone.now() - datetime.timedelta(minutes=10),
  )
  response = client.get(f"/api/v1/system-status/status_pages/{page.id}/services")
  assert response.status_code == 200
  synthetic = next(row for row in response.json() if row["name"] == "Event Projections")
  assert synthetic["status"] == "Degraded"
  assert synthetic["sla"] == 95.0


@pytest.mark.django_db
def test_create_and_list_incidents(
  client: Client, authenticated_client: Client, test_user: User
) -> None:
  page = StatusPage.objects.create(
    user=test_user, title="Incident Test Page", slug="incident-test", is_published=True
  )
  payload = {
    "title": "Database Connection Interrupted",
    "message": "We are currently investigating DB outages.",
    "status": "Investigating",
  }
  response = authenticated_client.post(
    f"/api/v1/system-status/status_pages/{page.id}/incidents",
    data=payload,
    content_type="application/json",
  )
  assert response.status_code == 200
  data = response.json()
  assert data["title"] == "Database Connection Interrupted"
  assert data["status"] == "Investigating"

  # List incidents
  list_response = client.get(f"/api/v1/system-status/status_pages/{page.id}/incidents")
  assert list_response.status_code == 200
  assert len(list_response.json()) == 1


@pytest.mark.django_db
def test_private_status_page_anonymous_denied(client: Client, test_user: User) -> None:
  # Create a private status page for test_user
  page = StatusPage.objects.create(
    user=test_user, title="Private Page", slug="private-page", is_published=False
  )

  # Anonymous client should get 403 when listing services
  response = client.get(f"/api/v1/system-status/status_pages/{page.id}/services")
  assert response.status_code == 403

  # Anonymous client should get 403 when listing incidents
  response2 = client.get(f"/api/v1/system-status/status_pages/{page.id}/incidents")
  assert response2.status_code == 403


@pytest.mark.django_db
def test_viewer_role_denied_create_status_page(
  client: Client, test_user: User, mock_verify_token: Any
) -> None:
  from monitor.models import UserProfile

  UserProfile.objects.create(user=test_user, role="Viewer")

  original_request = client.request

  def authed_request(*args: Any, **kwargs: Any):
    kwargs["HTTP_AUTHORIZATION"] = "Bearer valid-token"
    return original_request(*args, **kwargs)

  client.request = authed_request
  try:
    response = client.post(
      "/api/v1/system-status/status_pages",
      data={"title": "Viewer Page", "slug": "viewer-page"},
      content_type="application/json",
    )
    assert response.status_code == 403
    assert "Viewer" in response.json()["detail"]
  finally:
    client.request = original_request


@pytest.mark.django_db
def test_private_status_page_owner_allowed(authenticated_client: Client, test_user: User) -> None:
  # Create a private status page for test_user
  page = StatusPage.objects.create(
    user=test_user, title="Private Page", slug="private-page", is_published=False
  )

  # Authenticated owner should get 200
  response3 = authenticated_client.get(f"/api/v1/system-status/status_pages/{page.id}/services")
  assert response3.status_code == 200


@pytest.mark.django_db
def test_analytics_integration_encryption(test_user: User) -> None:
  from monitor.models import AnalyticsIntegration

  integration = AnalyticsIntegration.objects.create(
    user=test_user,
    provider="google",
    credentials={"access_token": "secret_token", "refresh_token": "refresh_secret"},
  )
  # Verify in-memory is decrypted
  assert integration.credentials["access_token"] == "secret_token"

  # Verify stored in database is encrypted
  from django.db import connection

  with connection.cursor() as cursor:
    cursor.execute("SELECT credentials FROM analytics_integrations")
    row = cursor.fetchone()
    import json

    db_val = json.loads(row[0])
    assert "ciphertext" in db_val
    assert "access_token" not in db_val

  # Fetch from db again and verify transparent decryption
  fetched = AnalyticsIntegration.objects.get(id=integration.id)
  assert fetched.credentials["access_token"] == "secret_token"


@pytest.mark.django_db
def test_db_cleanup_command() -> None:
  from datetime import timedelta

  from django.core.management import call_command
  from django.utils import timezone

  from monitor.models import BugReport, Endpoints

  now = timezone.now()
  old_date = now - timedelta(days=95)
  new_date = now - timedelta(days=10)

  # Create telemetry records
  ep_old = Endpoints.objects.create(
    url="http://old.com", status_code=500, response_time=timedelta(seconds=1)
  )
  Endpoints.objects.filter(id=ep_old.id).update(last_tested=old_date)

  ep_new = Endpoints.objects.create(
    url="http://new.com", status_code=200, response_time=timedelta(seconds=1)
  )
  Endpoints.objects.filter(id=ep_new.id).update(last_tested=new_date)

  # Create bug reports
  bug_old = BugReport.objects.create(user_description="Old bug report")
  BugReport.objects.filter(id=bug_old.id).update(created_at=old_date)

  bug_new = BugReport.objects.create(user_description="New bug report")
  BugReport.objects.filter(id=bug_new.id).update(created_at=new_date)

  # Verify initial existence
  assert Endpoints.objects.filter(id=ep_old.id).exists()
  assert Endpoints.objects.filter(id=ep_new.id).exists()
  assert BugReport.objects.filter(id=bug_old.id).exists()
  assert BugReport.objects.filter(id=bug_new.id).exists()

  # Call the cleanup command
  call_command("db_cleanup")

  # Verify only the recent records remain
  assert Endpoints.objects.filter(id=ep_new.id).exists()
  assert not Endpoints.objects.filter(id=ep_old.id).exists()

  assert BugReport.objects.filter(id=bug_new.id).exists()
  assert BugReport.objects.filter(id=bug_old.id).exists()


@pytest.mark.django_db
def test_log_audit_event(test_user: User) -> None:
  from unittest.mock import MagicMock

  from utils.audit import log_audit_event

  mock_request = MagicMock()
  mock_request.user = test_user
  mock_request.headers = {"x-forwarded-for": "192.168.1.1", "user-agent": "Mozilla/5.0"}
  mock_request.META = {}

  log = log_audit_event(
    request=mock_request, action="TEST_ACTION", resource_id="res-123", details={"key": "val"}
  )

  assert log is not None
  assert log.user == test_user
  assert log.action == "TEST_ACTION"
  assert log.resource_id == "res-123"
  assert log.details == {"key": "val"}
  assert log.ip_address == "192.168.1.1"
  assert log.user_agent == "Mozilla/5.0"

  # Test anonymous user
  from django.contrib.auth.models import AnonymousUser

  mock_request.user = AnonymousUser()
  log_anon = log_audit_event(
    request=mock_request,
    action="TEST_ANON",
  )
  assert log_anon.user is None
  assert log_anon.action == "TEST_ANON"

  # Test database write failure handling
  with patch("monitor.models.AuditLog.objects.create", side_effect=Exception("Database down")):
    log_fail = log_audit_event(
      request=mock_request,
      action="TEST_FAILURE",
    )
    assert log_fail is None
