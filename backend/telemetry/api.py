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

async def get_producer():
    brokers = os.environ.get('REDPANDA_BROKERS', 'localhost:19092')
    producer = AIOKafkaProducer(bootstrap_servers=brokers)
    await producer.start()
    return producer

@router.post("/endpoints")
async def ingest_endpoint_telemetry(request, payload: TelemetryPayload):
    # Convert response_time_ms to seconds for standard processing down the line
    data = payload.dict()
    data['response_time'] = payload.response_time_ms / 1000.0
    
    producer = await get_producer()
    try:
        value = json.dumps(data).encode('utf-8')
        await producer.send_and_wait("app-events", value)
    finally:
        await producer.stop()
        
    return HttpResponse(status=202)
