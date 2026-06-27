from unittest.mock import patch

import pytest
from django.test import AsyncClient


@pytest.mark.django_db
@pytest.mark.asyncio
async def test_ingest_endpoint_telemetry(async_client: AsyncClient) -> None:
  from asgiref.sync import sync_to_async
  from monitor.models import OutboxEvent

  payload = {
    "url": "http://telemetry-test.com",
    "status_code": 200,
    "response_time_ms": 120.5,
    "ip_address": "127.0.0.1",
    "is_active": True,
  }

  response = await async_client.post(
    "/api/v1/telemetry/endpoints",
    data=payload,
    content_type="application/json",
    headers={"origin": "http://localhost"},
  )
  assert response.status_code == 202

  # Verify OutboxEvent was successfully created in the database
  events = await sync_to_async(list)(OutboxEvent.objects.all())
  assert len(events) == 1
  event = events[0]
  assert event.topic == "app-events"
  assert event.payload["url"] == "http://telemetry-test.com"


@pytest.mark.django_db
@pytest.mark.asyncio
async def test_cookie_consent_endpoint(async_client: AsyncClient) -> None:
  payload = {"necessary": True, "analytical": True, "marketing": False}
  response = await async_client.post(
    "/api/v1/telemetry/cookie-consent", data=payload, content_type="application/json"
  )
  assert response.status_code == 200
  data = response.json()
  assert data["status"] == "success"
  assert "id" in data

  from asgiref.sync import sync_to_async
  from monitor.models import CookieConsent

  consent = await sync_to_async(CookieConsent.objects.get)(id=data["id"])
  assert consent.necessary is True
  assert consent.analytical is True
  assert consent.marketing is False


@pytest.mark.django_db
@pytest.mark.asyncio
async def test_telemetry_worker_normalization() -> None:
  import polars as pl
  from asgiref.sync import sync_to_async
  from monitor.models import Endpoints, MonitoredService

  from telemetry.management.commands.telemetry_worker import Command

  cmd = Command()
  df = pl.DataFrame(
    [
      {
        "url": "http://localhost:8000/api/v1/monitor/status_pages/4753b71e-1234-5678-abcd-ef0123456789/services",
        "status_code": 200,
        "response_time": 0.05,
        "ip_address": "127.0.0.1",
        "is_active": True,
      },
      {
        "url": "http://localhost:8000/api/v1/monitor/status_pages/82f8cc41-9876-5432-fedc-ba9876543210/services",
        "status_code": 200,
        "response_time": 0.08,
        "ip_address": "127.0.0.1",
        "is_active": True,
      },
    ]
  )

  from django.conf import settings

  frontend_url = (getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")
  expected_url = f"{frontend_url}/status"

  await cmd.save_to_db(df)

  # Both URLs should normalize and merge to a single service mapping to the expected status URL
  services = await sync_to_async(list)(MonitoredService.objects.filter(url=expected_url))
  assert len(services) == 1
  assert services[0].name == "Status Pages Services"

  # Endpoints should also use the normalized URL
  endpoints = await sync_to_async(list)(Endpoints.objects.filter(url=expected_url))
  assert len(endpoints) == 2


@pytest.mark.django_db
@pytest.mark.asyncio
async def test_subscribe_newsletter_endpoint(async_client: AsyncClient) -> None:
  from asgiref.sync import sync_to_async
  from monitor.models import NewsletterSubscription

  payload = {"email": "subscriber@test.com", "consent": True}

  with patch("config.email.send_resend_email", return_value=True) as mock_send:
    response = await async_client.post(
      "/api/v1/telemetry/subscribe", data=payload, content_type="application/json"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["email"] == "subscriber@test.com"
    assert data["email_sent"] is True
    mock_send.assert_called_once()

    # Check database persistence
    sub = await sync_to_async(NewsletterSubscription.objects.get)(email="subscriber@test.com")
    assert sub.consent_accepted is True

    # Try duplicate subscription
    response_dup = await async_client.post(
      "/api/v1/telemetry/subscribe", data=payload, content_type="application/json"
    )
    assert response_dup.status_code == 200
    assert response_dup.json()["status"] == "error"
    assert "already subscribed" in response_dup.json()["message"]

  # Try subscribing without consent
  payload_no_consent = {"email": "no-consent@test.com", "consent": False}
  response_no_consent = await async_client.post(
    "/api/v1/telemetry/subscribe", data=payload_no_consent, content_type="application/json"
  )
  assert response_no_consent.status_code == 200
  assert response_no_consent.json()["status"] == "error"


@pytest.mark.django_db
def test_anonymize_ip_utility() -> None:
  from utils.request import anonymize_ip

  assert anonymize_ip("") == ""
  assert anonymize_ip("192.168.1.15") == "192.168.1.0"
  assert anonymize_ip("8.8.8.8") == "8.8.8.0"
  assert anonymize_ip("2001:db8:85a3:8d3:1319:8a2e:370:7348") == "2001:db8:85a3:8d3::"
  assert anonymize_ip("::1") == "::1"


@pytest.mark.django_db
@pytest.mark.asyncio
async def test_cookie_consent_anonymization(async_client: AsyncClient) -> None:
  from asgiref.sync import sync_to_async
  from monitor.models import CookieConsent

  payload = {"necessary": True, "analytical": False, "marketing": False}
  response = await async_client.post(
    "/api/v1/telemetry/cookie-consent",
    data=payload,
    content_type="application/json",
    headers={"x-forwarded-for": "198.51.100.42"},
  )
  assert response.status_code == 200
  data = response.json()
  assert data["status"] == "success"

  consent = await sync_to_async(CookieConsent.objects.get)(id=data["id"])
  assert consent.ip_address == "198.51.100.0"


@pytest.mark.django_db
@pytest.mark.asyncio
async def test_telemetry_worker_ip_anonymization() -> None:
  import polars as pl
  from asgiref.sync import sync_to_async
  from monitor.models import Endpoints, Tenant

  from telemetry.management.commands.telemetry_worker import Command

  tenant_0 = await sync_to_async(Tenant.objects.filter(is_platform_tenant=True).first)()

  cmd = Command()
  df = pl.DataFrame(
    [
      {
        "url": "http://localhost:8000/",
        "status_code": 200,
        "response_time": 0.05,
        "ip_address": "203.0.113.195",
        "is_active": True,
        "tenant_id": str(tenant_0.id) if tenant_0 else None,
      }
    ]
  )

  await cmd.save_to_db(df)

  # Find by anonymized IP address
  endpoint = await sync_to_async(
    Endpoints.objects.filter(ip_address="203.0.113.0").order_by("-last_tested").first
  )()
  assert endpoint is not None
  assert endpoint.ip_address == "203.0.113.0"
  assert endpoint.location != "Localhost"


@pytest.mark.django_db
def test_analytics_overview_hybrid_query(client) -> None:
  from datetime import timedelta

  from django.contrib.auth.models import User
  from django.utils import timezone
  from monitor.models import (
    AggregatedAnalytics,
    Endpoints,
    MonitoredService,
    StatusPage,
    Tenant,
    TenantMembership,
  )

  user, _ = User.objects.get_or_create(
    username="test_analytics_user", email="test_analytics_user@test.com"
  )
  tenant, _ = Tenant.objects.get_or_create(
    name="Test Analytics Tenant", slug="test-analytics-tenant"
  )
  TenantMembership.objects.get_or_create(user=user, tenant=tenant)

  page, _ = StatusPage.objects.get_or_create(
    slug="test-analytics-platform-status",
    defaults={"tenant": tenant, "user": user, "title": "Platform Status"},
  )
  service_url = "http://test-service.local/"
  MonitoredService.objects.get_or_create(
    status_page=page, url=service_url, defaults={"name": "Test Service"}
  )

  now = timezone.now()
  past_hour = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=2)
  AggregatedAnalytics.objects.create(
    tenant=tenant,
    timestamp=past_hour,
    bucket_size="1h",
    total_requests=100,
    avg_latency_ms=250.0,
    p99_latency_ms=350.0,
    error_rate_percent=2.0,
  )

  current_raw_time = now - timedelta(minutes=10)
  Endpoints.objects.create(
    tenant=tenant,
    url=service_url,
    status_code=200,
    response_time=timedelta(milliseconds=150),
    ip_address="127.0.0.1",
    is_active=True,
    last_tested=current_raw_time,
  )

  with patch("firebase_admin.auth.verify_id_token") as mock_verify:
    mock_verify.return_value = {
      "uid": "test_analytics_user",
      "email": "test_analytics_user@test.com",
      "name": "test_analytics_user",
    }
    response = client.get(
      "/api/v1/analytics/overview",
      {"tenant_id": str(tenant.id), "site_url": service_url},
      HTTP_AUTHORIZATION="Bearer valid-token",
    )
  assert response.status_code == 200
  res_data = response.json()
  assert res_data["status"] == "success"
  metrics = res_data["data"]["user_metrics"]

  assert metrics["total_requests_24h"] == 101
  assert metrics["average_latency_ms"] > 0.0
