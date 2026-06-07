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
    
    # Mock AIOKafkaProducer's send_and_wait method
    mock_producer = AsyncMock()
    mock_producer.send_and_wait = AsyncMock(return_value=None)
    
    with patch("telemetry.api.get_producer", AsyncMock(return_value=mock_producer)):
        response = await async_client.post(
            "/api/v1/telemetry/endpoints",
            data=payload,
            content_type="application/json"
        )
        assert response.status_code == 202
        mock_producer.send_and_wait.assert_called_once()
        # Verify first argument to send_and_wait is "app-events"
        args, kwargs = mock_producer.send_and_wait.call_args
        assert args[0] == "app-events"
