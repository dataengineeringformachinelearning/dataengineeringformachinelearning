import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_ingest_endpoint_telemetry(async_client):
    payload = {
        "url": "http://telemetry-test.com",
        "status_code": 200,
        "response_time_ms": 120.5,
        "ip_address": "127.0.0.1",
        "is_active": True
    }
    
    # Mock AIOKafkaProducer's send method
    mock_producer = AsyncMock()
    mock_producer.send = AsyncMock(return_value=None)
    
    with patch("telemetry.api.get_kafka_producer", AsyncMock(return_value=mock_producer)):
        response = await async_client.post(
            "/api/v1/telemetry/endpoints",
            data=payload,
            content_type="application/json"
        )
        assert response.status_code == 202
        mock_producer.send.assert_called_once()
        # Verify first argument to send is "app-events"
        args, kwargs = mock_producer.send.call_args
        assert args[0] == "app-events"


@pytest.mark.django_db
@pytest.mark.asyncio
async def test_cookie_consent_endpoint(async_client):
    payload = {
        "necessary": True,
        "analytical": True,
        "marketing": False
    }
    response = await async_client.post(
        "/api/v1/telemetry/cookie-consent",
        data=payload,
        content_type="application/json"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "id" in data
    
    from monitor.models import CookieConsent
    from asgiref.sync import sync_to_async
    consent = await sync_to_async(CookieConsent.objects.get)(id=data["id"])
    assert consent.necessary is True
    assert consent.analytical is True
    assert consent.marketing is False

