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
  tenant_id: str | None = None
  url: str
  status_code: int
  response_time_ms: float
  ip_address: str
  is_active: bool
  telemetry_context: dict | None = None


async def _is_origin_validated(request, tenant_id: str | None) -> bool:
  from asgiref.sync import sync_to_async
  from django.db.models import Q
  from monitor.models import StatusPage, ValidatedSite

  origin = request.headers.get("origin") or request.headers.get("referer")
  if not origin:
    # If no origin, check if there's an API key
    api_key = request.headers.get("X-API-Key") or request.headers.get("Authorization")
    if api_key:
      # We could validate the API key here
      return True
    return False

  try:
    from urllib.parse import urlparse

    parsed = urlparse(origin)
    domain = parsed.hostname if parsed.hostname else origin
  except Exception:
    return False

  if domain in [
    "dataengineeringformachinelearning.com",
    "www.dataengineeringformachinelearning.com",
    "localhost",
    "127.0.0.1",
  ]:
    return True

  # If tenant_id is provided, it might actually be a StatusPage ID/slug from the widget
  # Let's try to resolve the actual Tenant ID
  actual_tenant_id = None
  if tenant_id:
    # Try as exact tenant ID first
    try:
      actual_tenant_id = tenant_id
      # Optionally, verify tenant exists, but we'll just query ValidatedSite
    except Exception:
      pass

    # Or try as StatusPage slug/ID
    try:
      page = await sync_to_async(
        StatusPage.objects.filter(Q(id=tenant_id) | Q(slug=tenant_id)).first
      )()
      if page and page.tenant_id:
        actual_tenant_id = page.tenant_id
    except Exception:
      pass

  if actual_tenant_id:
    return await sync_to_async(
      ValidatedSite.objects.filter(
        tenant_id=actual_tenant_id, domain=domain, is_verified=True
      ).exists
    )()
  else:
    # Fallback to checking if the domain is registered globally
    return await sync_to_async(
      ValidatedSite.objects.filter(domain=domain, is_verified=True).exists
    )()


@router.post("/endpoints")
async def ingest_endpoint_telemetry(request, payload: TelemetryPayload):
  is_valid = await _is_origin_validated(request, payload.tenant_id)
  if not is_valid:
    logger.warning(f"Rejected telemetry from unvalidated origin: {request.headers.get('origin')}")
    return HttpResponse("Forbidden: Unvalidated Site", status=403)

  # Convert response_time_ms to seconds for standard processing down the line
  data = payload.dict()
  data["response_time"] = payload.response_time_ms / 1000.0

  async def _send_to_kafka():
    try:
      producer = await get_kafka_producer()
      value = json.dumps(data).encode("utf-8")
      await producer.send("app-events", value)
    except Exception as e:
      logger.error(f"Failed to send telemetry to Kafka: {e}")

  import asyncio

  task = asyncio.create_task(_send_to_kafka())
  background_tasks.add(task)
  task.add_done_callback(background_tasks.discard)

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
  from config.email import send_resend_email
  from monitor.models import NewsletterSubscription

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

  is_valid = await _is_origin_validated(request, payload.tenant_id)
  if not is_valid:
    logger.warning(
      f"Rejected technology telemetry from unvalidated origin: {request.headers.get('origin')}"
    )
    return HttpResponse("Forbidden: Unvalidated Site", status=403)

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


class PQKeyExchangeResponse(Schema):
  status: str
  key_id: str | None = None
  public_key_b64: str | None = None
  message: str


@router.get("/pq-key-exchange", response=PQKeyExchangeResponse)
def get_pq_key_exchange(request):
  import base64
  import uuid

  from django.core.cache import cache
  from utils.quantum import OQS_AVAILABLE, PostQuantumKEM

  if not OQS_AVAILABLE:
    return {
      "status": "fallback",
      "key_id": None,
      "public_key_b64": None,
      "message": "liboqs is not available. Please use standard AES for ephemeral telemetry payloads.",
    }

  try:
    pq = PostQuantumKEM()
    pub_key, secret_key = pq.generate_keypair()

    key_id = str(uuid.uuid4())
    # Cache the ephemeral secret key for 300 seconds (5 minutes)
    cache.set(f"pq_secret_{key_id}", secret_key, timeout=300)

    return {
      "status": "success",
      "key_id": key_id,
      "public_key_b64": base64.b64encode(pub_key).decode("utf-8"),
      "message": "Use this public key to encapsulate your symmetric key before transmission.",
    }
  except Exception as e:
    logger.error(f"PQ Key Exchange failed: {e}")
    return {
      "status": "error",
      "key_id": None,
      "public_key_b64": None,
      "message": "An error occurred during PQ key generation.",
    }
