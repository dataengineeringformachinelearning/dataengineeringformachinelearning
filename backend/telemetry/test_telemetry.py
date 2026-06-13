from unittest.mock import AsyncMock, patch

import pytest


@pytest.mark.asyncio
async def test_ingest_endpoint_telemetry(async_client):
  payload = {
    "url": "http://telemetry-test.com",
    "status_code": 200,
    "response_time_ms": 120.5,
    "ip_address": "127.0.0.1",
    "is_active": True,
  }

  # Mock AIOKafkaProducer's send method
  mock_producer = AsyncMock()
  mock_producer.send = AsyncMock(return_value=None)

  with patch("telemetry.api.get_kafka_producer", AsyncMock(return_value=mock_producer)):
    response = await async_client.post(
      "/api/v1/telemetry/endpoints", data=payload, content_type="application/json"
    )
    assert response.status_code == 202
    mock_producer.send.assert_called_once()
    # Verify first argument to send is "app-events"
    args, _kwargs = mock_producer.send.call_args
    assert args[0] == "app-events"


@pytest.mark.django_db
@pytest.mark.asyncio
async def test_cookie_consent_endpoint(async_client):
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
async def test_telemetry_worker_normalization():
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

  frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:4200").rstrip("/")
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
async def test_subscribe_newsletter_endpoint(async_client):
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
