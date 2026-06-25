import json
import logging

try:
  import stripe

  HAS_STRIPE = True
except ImportError:
  HAS_STRIPE = False

from django.conf import settings
from django.http import HttpResponse
from monitor.models import Tenant
from ninja import Router

logger = logging.getLogger(__name__)

if HAS_STRIPE:
  stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")

router = Router(tags=["Billing"])


@router.post("/create-checkout-session")
def create_checkout_session(request):
  if not request.user.is_authenticated:
    return {"error": "Authentication required"}, 401

  try:
    data = json.loads(request.body) if request.body else {}
    tenant_id = data.get("tenant_id")

    if tenant_id:
      tenant = Tenant.objects.get(id=tenant_id)
    else:
      from monitor.models import TenantMembership

      membership = TenantMembership.objects.filter(user=request.user).first()
      if not membership:
        return {"error": "User does not belong to any tenant"}, 400
      tenant = membership.tenant

    price_id = "price_1TlgG2Er73F9pBqwItcWHIJf"

    session = stripe.checkout.Session.create(
      payment_method_types=["card"],
      line_items=[
        {
          "price": price_id,
          "quantity": 1,
        },
      ],
      mode="subscription",
      success_url=settings.FRONTEND_URL + "/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url=settings.FRONTEND_URL + "/",
      client_reference_id=str(tenant.id),
    )
    return {"checkout_url": session.url}
  except Exception as e:
    logger.error(f"Error creating checkout session: {e}")
    return {"error": str(e)}, 500


@router.post("/webhook", auth=None)
def stripe_webhook(request):
  payload = request.body
  sig_header = request.headers.get("STRIPE_SIGNATURE", "")
  endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

  event = None

  try:
    event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
  except ValueError:
    return HttpResponse(status=400)
  except stripe.error.SignatureVerificationError:
    return HttpResponse(status=400)

  # Handle the checkout.session.completed event
  if event["type"] == "checkout.session.completed":
    session = event["data"]["object"]
    client_reference_id = session.get("client_reference_id")
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")

    if client_reference_id:
      try:
        tenant = Tenant.objects.get(id=client_reference_id)
        tenant.tier = "Pro"
        tenant.stripe_customer_id = customer_id
        tenant.stripe_subscription_id = subscription_id
        tenant.subscription_active = True
        tenant.save()
      except Tenant.DoesNotExist:
        logger.error(f"Tenant {client_reference_id} not found for checkout.")

  elif event["type"] == "customer.subscription.deleted":
    subscription = event["data"]["object"]
    sub_id = subscription.get("id")
    tenants = Tenant.objects.filter(stripe_subscription_id=sub_id)
    for tenant in tenants:
      tenant.tier = "Standard"
      tenant.subscription_active = False
      tenant.save()

  return HttpResponse(status=200)
