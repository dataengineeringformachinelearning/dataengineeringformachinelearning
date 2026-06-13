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

  await cmd.save_to_db(df)

  # Both URLs should normalize and merge to a single service mapping to http://localhost:4200/status
  services = await sync_to_async(list)(
    MonitoredService.objects.filter(url="http://localhost:4200/status")
  )
  assert len(services) == 1
  assert services[0].name == "Status Pages Services"

  # Endpoints should also use the normalized URL
  endpoints = await sync_to_async(list)(
    Endpoints.objects.filter(url="http://localhost:4200/status")
  )
  assert len(endpoints) == 2
