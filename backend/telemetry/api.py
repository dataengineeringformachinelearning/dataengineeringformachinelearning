from ninja import Router, Schema
from django.http import HttpResponse
from pydantic import Field
import json
import os
import asyncio
from aiokafka import AIOKafkaProducer

router = Router()

class TelemetryPayload(Schema):
    url: str
    status_code: int
    response_time_ms: float
    ip_address: str
    is_active: bool

_producer = None

async def get_producer():
    global _producer
    if _producer is None:
        brokers = os.environ.get('REDPANDA_BROKERS', 'localhost:19092')
        _producer = AIOKafkaProducer(bootstrap_servers=brokers)
        await _producer.start()
    return _producer

@router.post("/endpoints")
async def ingest_endpoint_telemetry(request, payload: TelemetryPayload):
    # Convert response_time_ms to seconds for standard processing down the line
    data = payload.dict()
    data['response_time'] = payload.response_time_ms / 1000.0
    
    producer = await get_producer()
    value = json.dumps(data).encode('utf-8')
    await producer.send_and_wait("app-events", value)
        
    return HttpResponse(status=202)

