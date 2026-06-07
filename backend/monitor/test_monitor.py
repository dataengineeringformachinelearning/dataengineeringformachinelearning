import pytest
from django.contrib.auth import get_user_model
from monitor.models import StatusPage, MonitoredService, Endpoints, Incident
from django.urls import reverse
import datetime

User = get_user_model()

@pytest.fixture
def test_user(db):
    return User.objects.create_user(username="testuser", password="password123", email="test@example.com")

from unittest.mock import patch

@pytest.fixture
def mock_verify_token():
    with patch('firebase_admin.auth.verify_id_token') as mock:
        mock.return_value = {
            'uid': 'testuser',
            'email': 'test@example.com',
            'name': 'testuser'
        }
        yield mock

@pytest.fixture
def authenticated_client(client, test_user, mock_verify_token):
    # Monkeypatch client.request to inject Bearer token
    original_request = client.request
    def new_request(*args, **kwargs):
        kwargs['HTTP_AUTHORIZATION'] = 'Bearer valid-token'
        return original_request(*args, **kwargs)
    client.request = new_request
    return client

@pytest.mark.django_db
def test_api_health(client):
    response = client.get("/api/v1/system-status/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@pytest.mark.django_db
def test_get_all_endpoints(client):
    Endpoints.objects.create(
        url="http://test.com",
        status_code=200,
        response_time=datetime.timedelta(milliseconds=150),
        is_active=True
    )
    response = client.get("/api/v1/system-status/endpoints")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["url"] == "http://test.com"
    assert data[0]["is_active"] is True

@pytest.mark.django_db
def test_list_status_pages(client):
    # This endpoint auto-creates the default platform-status page if not present
    response = client.get("/api/v1/system-status/status_pages")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["slug"] == "platform-status"

@pytest.mark.django_db
def test_create_status_page(authenticated_client):
    payload = {
        "title": "New Status Page",
        "slug": "new-status",
        "description": "Custom status description"
    }
    response = authenticated_client.post(
        "/api/v1/system-status/status_pages",
        data=payload,
        content_type="application/json"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "New Status Page"
    assert data["slug"] == "new-status"
    assert StatusPage.objects.filter(slug="new-status").exists()

@pytest.mark.django_db
def test_create_status_page_unauthenticated(client):
    payload = {
        "title": "Unauth Status Page",
        "slug": "unauth-status"
    }
    response = client.post(
        "/api/v1/system-status/status_pages",
        data=payload,
        content_type="application/json"
    )
    assert response.status_code == 401

@pytest.mark.django_db
def test_delete_status_page(authenticated_client, test_user):
    page = StatusPage.objects.create(
        user=test_user,
        title="Custom Status Page",
        slug="custom-status",
        description="Demo"
    )
    response = authenticated_client.delete(f"/api/v1/system-status/status_pages/{page.id}")
    assert response.status_code == 200
    assert response.json() == {"success": True}
    assert not StatusPage.objects.filter(id=page.id).exists()

@pytest.mark.django_db
def test_delete_system_status_page_forbidden(authenticated_client, test_user):
    # Cannot delete default platform-status page
    page = StatusPage.objects.create(
        user=test_user,
        title="Platform Status",
        slug="platform-status",
        description="Demo"
    )
    response = authenticated_client.delete(f"/api/v1/system-status/status_pages/{page.id}")
    assert response.status_code == 403

@pytest.mark.django_db
def test_add_service(authenticated_client, test_user):
    page = StatusPage.objects.create(
        user=test_user,
        title="My Status",
        slug="my-status"
    )
    payload = {
        "name": "Frontend Web Server",
        "url": "http://frontend.local"
    }
    response = authenticated_client.post(
        f"/api/v1/system-status/status_pages/{page.id}/services",
        data=payload,
        content_type="application/json"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Frontend Web Server"
    assert data["url"] == "http://frontend.local"
    assert MonitoredService.objects.filter(name="Frontend Web Server").exists()

@pytest.mark.django_db
def test_list_services(client, test_user):
    page = StatusPage.objects.create(
        user=test_user,
        title="My Status",
        slug="my-status"
    )
    service = MonitoredService.objects.create(
        status_page=page,
        name="Backend Web Server",
        url="http://backend.local"
    )
    Endpoints.objects.create(
        url="http://backend.local",
        status_code=200,
        response_time=datetime.timedelta(milliseconds=50),
        is_active=True
    )
    response = client.get(f"/api/v1/system-status/status_pages/{page.id}/services")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Backend Web Server"
    assert data[0]["status"] == "Operational"

@pytest.mark.django_db
def test_create_and_list_incidents(client, authenticated_client, test_user):
    page = StatusPage.objects.create(
        user=test_user,
        title="Incident Test Page",
        slug="incident-test"
    )
    payload = {
        "title": "Database Connection Interrupted",
        "message": "We are currently investigating DB outages.",
        "status": "Investigating"
    }
    response = authenticated_client.post(
        f"/api/v1/system-status/status_pages/{page.id}/incidents",
        data=payload,
        content_type="application/json"
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
def test_db_cleanup_command():
    from django.core.management import call_command
    from django.utils import timezone
    from datetime import timedelta
    from monitor.models import Endpoints, BugReport

    now = timezone.now()
    old_date = now - timedelta(days=95)
    new_date = now - timedelta(days=10)

    # Create telemetry records
    ep_old = Endpoints.objects.create(url="http://old.com", status_code=500, response_time=timedelta(seconds=1))
    Endpoints.objects.filter(id=ep_old.id).update(last_tested=old_date)

    ep_new = Endpoints.objects.create(url="http://new.com", status_code=200, response_time=timedelta(seconds=1))
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
    call_command('db_cleanup')

    # Verify only the recent records remain
    assert Endpoints.objects.filter(id=ep_new.id).exists()
    assert not Endpoints.objects.filter(id=ep_old.id).exists()

    assert BugReport.objects.filter(id=bug_new.id).exists()
    assert not BugReport.objects.filter(id=bug_old.id).exists()

