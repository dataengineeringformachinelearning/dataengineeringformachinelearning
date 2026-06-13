import json
import logging

from django.http import HttpResponse
from ninja import Router, Schema
from utils.kafka import get_kafka_producer
from utils.request import get_client_ip, get_user_agent

logger = logging.getLogger(__name__)
router = Router()


class TelemetryPayload(Schema):
  url: str
  status_code: int
  response_time_ms: float
  ip_address: str
  is_active: bool


@router.post("/endpoints")
async def ingest_endpoint_telemetry(request, payload: TelemetryPayload):
  # Convert response_time_ms to seconds for standard processing down the line
  data = payload.dict()
  data["response_time"] = payload.response_time_ms / 1000.0

  try:
    producer = await get_kafka_producer()
    value = json.dumps(data).encode("utf-8")
    await producer.send("app-events", value)
  except Exception as e:
    logger.error(f"Failed to send telemetry to Kafka: {e}")
    return HttpResponse("Telemetry ingestion queue unavailable", status=503)

  return HttpResponse(status=202)


class CookieConsentPayload(Schema):
  necessary: bool
  analytical: bool
  marketing: bool


@router.post("/cookie-consent")
async def save_cookie_consent(request, payload: CookieConsentPayload):
  from asgiref.sync import sync_to_async
  from monitor.models import CookieConsent

  # Extract IP address and User-Agent using utilities
  ip = get_client_ip(request)
  user_agent = get_user_agent(request)

  consent = await sync_to_async(CookieConsent.objects.create)(
    necessary=payload.necessary,
    analytical=payload.analytical,
    marketing=payload.marketing,
    ip_address=ip or None,
    user_agent=user_agent,
  )
  return {"status": "success", "id": str(consent.id)}
