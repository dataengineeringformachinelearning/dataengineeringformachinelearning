import json
import logging

from django.http import HttpResponse
from ninja import Router, Schema
from utils.kafka import get_kafka_producer
from utils.request import get_client_ip, get_user_agent

logger = logging.getLogger(__name__)
router = Router()
background_tasks = set()


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


class SubscribePayload(Schema):
  email: str
  consent: bool


@router.post("/subscribe")
async def subscribe_newsletter(request, payload: SubscribePayload):
  from asgiref.sync import sync_to_async
  from monitor.models import NewsletterSubscription

  from config.email import send_resend_email

  if not payload.consent:
    return {
      "status": "error",
      "message": "You must accept the terms and privacy policy to subscribe.",
    }

  # Check if already subscribed
  exists = await sync_to_async(NewsletterSubscription.objects.filter(email=payload.email).exists)()
  if exists:
    return {"status": "error", "message": "This email is already subscribed."}

  # Create subscription
  await sync_to_async(NewsletterSubscription.objects.create)(
    email=payload.email,
    consent_accepted=payload.consent,
  )

  # Send welcome email asynchronously via sync_to_async
  subject = "Welcome to the DEML Platform Newsletter!"
  html_content = """
  <h1>Thank you for subscribing!</h1>
  <p>You have successfully signed up for updates and insights from the Web Application (DEML) Platform.</p>
  <p>If you did not request this, please ignore this email.</p>
  """

  email_sent = await sync_to_async(send_resend_email)(
    to_email=payload.email,
    subject=subject,
    html_content=html_content,
  )

  return {"status": "success", "email": payload.email, "email_sent": email_sent}


class TelemetryDualStreamPayload(Schema):
  tenant_id: str
  url: str | None = None
  stream_type: str  # "infrastructure" or "application_dependency"
  # For infrastructure
  tech_name: str | None = None
  version: str | None = None
  # For application_dependency
  manifest_type: str | None = None
  manifest_content: str | None = None


@router.post("/technology")
async def ingest_technology_telemetry(request, payload: TelemetryDualStreamPayload):
  from .vulnerability_ledger import process_dual_stream_batch

  try:
    import asyncio

    data = payload.dict()

    infra_batch = []
    app_batch = []

    if payload.stream_type == "infrastructure":
      infra_batch.append(
        {
          "tenant_id": data["tenant_id"],
          "url": data.get("url"),
          "tech_name": data.get("tech_name"),
          "version": data.get("version"),
        }
      )
    elif payload.stream_type == "application_dependency":
      app_batch.append(
        {
          "tenant_id": data["tenant_id"],
          "url": data.get("url"),
          "manifest_type": data.get("manifest_type"),
          "manifest_content": data.get("manifest_content"),
        }
      )

    task = asyncio.create_task(process_dual_stream_batch(infra_batch, app_batch))
    background_tasks.add(task)
    task.add_done_callback(background_tasks.discard)
    return HttpResponse(status=202)
  except Exception as e:
    logger.error(f"Failed to queue telemetry for processing: {e}")
    return HttpResponse("Vulnerability ledger unavailable", status=503)
