import datetime
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
    from django.http import JsonResponse

    return JsonResponse({"error": "Authentication required"}, status=401)

  try:
    data = json.loads(request.body) if request.body else {}
    tenant_id = data.get("tenant_id")

    if tenant_id:
      try:
        import uuid

        valid_id = uuid.UUID(tenant_id)
        tenant = Tenant.objects.get(id=valid_id)
      except (ValueError, TypeError, Tenant.DoesNotExist):
        return 400, {"error": "Invalid tenant ID"}
    else:
      from monitor.models import TenantMembership

      membership = TenantMembership.objects.filter(user=request.user).first()
      if not membership:
        from django.http import JsonResponse

        return JsonResponse({"error": "User does not belong to any tenant"}, status=400)

      if membership.role == "Viewer":
        from django.http import JsonResponse

        return JsonResponse({"error": "Viewers cannot manage subscriptions"}, status=403)

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
      allow_promotion_codes=True,
    )
    return {"checkout_url": session.url}
  except Exception as e:
    logger.error(f"Error creating checkout session: {e}")
    from django.http import JsonResponse

    return JsonResponse({"error": str(e)}, status=500)


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
    client_reference_id = (
      session.get("client_reference_id")
      if isinstance(session, dict)
      else getattr(session, "client_reference_id", None)
    )
    customer_id = (
      session.get("customer") if isinstance(session, dict) else getattr(session, "customer", None)
    )
    subscription_id = (
      session.get("subscription")
      if isinstance(session, dict)
      else getattr(session, "subscription", None)
    )

    if client_reference_id:
      try:
        tenant = Tenant.objects.get(id=client_reference_id)
        tenant.tier = "Pro"
        tenant.stripe_customer_id = customer_id
        tenant.stripe_subscription_id = subscription_id
        tenant.subscription_active = True

        # Fetch subscription to get current_period_end
        if subscription_id:
          sub = stripe.Subscription.retrieve(subscription_id)
          tenant.subscription_current_period_end = datetime.datetime.fromtimestamp(
            sub.current_period_end, tz=datetime.timezone.utc
          )

        tenant.save()
      except Tenant.DoesNotExist:
        logger.error(f"Tenant {client_reference_id} not found for checkout.")

  elif event["type"] == "customer.subscription.deleted":
    subscription = event["data"]["object"]
    sub_id = (
      subscription.get("id")
      if isinstance(subscription, dict)
      else getattr(subscription, "id", None)
    )
    tenants = Tenant.objects.filter(stripe_subscription_id=sub_id)
    for tenant in tenants:
      tenant.tier = "Standard"
      tenant.subscription_active = False
      tenant.save()

  return HttpResponse(status=200)


@router.post("/sync")
def sync_subscription(request):
  if not request.user.is_authenticated:
    from django.http import JsonResponse

    return JsonResponse({"error": "Authentication required"}, status=401)

  from monitor.models import TenantMembership

  membership = TenantMembership.objects.filter(user=request.user).first()
  if not membership:
    return {"status": "synced", "active": False, "cancel_at_period_end": False}

  tenant = membership.tenant
  email = request.user.email

  try:
    customers = stripe.Customer.list(email=email).data
    if customers:
      for customer in customers:
        subscriptions = stripe.Subscription.list(customer=customer.id, status="active").data
        if subscriptions:
          sub = subscriptions[0]
          tenant.tier = "Pro"
          tenant.stripe_customer_id = customer.id
          tenant.stripe_subscription_id = sub.id
          tenant.subscription_active = True
          tenant.subscription_current_period_end = datetime.datetime.fromtimestamp(
            sub.current_period_end, tz=datetime.timezone.utc
          )
          tenant.save()
          return {
            "status": "synced",
            "active": True,
            "cancel_at_period_end": sub.cancel_at_period_end,
          }

    tenant.tier = "Standard"
    tenant.subscription_active = False
    tenant.save()
    return {"status": "synced", "active": False, "cancel_at_period_end": False}
  except Exception as e:
    import traceback

    with open("/tmp/sync_error.txt", "w") as f:
      f.write(traceback.format_exc())
    logger.error(f"Error syncing subscription: {e}")
    from django.http import JsonResponse

    return JsonResponse({"error": str(e)}, status=500)


@router.post("/cancel-subscription")
def cancel_subscription(request):
  if not request.user.is_authenticated:
    from django.http import JsonResponse

    return JsonResponse({"error": "Authentication required"}, status=401)

  from monitor.models import TenantMembership

  membership = TenantMembership.objects.filter(user=request.user).first()
  if not membership:
    from django.http import JsonResponse

    return JsonResponse({"error": "User does not belong to any tenant"}, status=400)

  if membership.role == "Viewer":
    from django.http import JsonResponse

    return JsonResponse({"error": "Viewers cannot manage subscriptions"}, status=403)

  tenant = membership.tenant
  if not tenant.stripe_subscription_id:
    from django.http import JsonResponse

    return JsonResponse({"error": "No active subscription found"}, status=400)

  try:
    sub = stripe.Subscription.modify(tenant.stripe_subscription_id, cancel_at_period_end=True)
    return {"status": "cancelled", "cancel_at_period_end": sub.cancel_at_period_end}
  except Exception as e:
    logger.error(f"Error cancelling subscription: {e}")
    from django.http import JsonResponse

    return JsonResponse({"error": str(e)}, status=500)


@router.post("/resume-subscription")
def resume_subscription(request):
  if not request.user.is_authenticated:
    from django.http import JsonResponse

    return JsonResponse({"error": "Authentication required"}, status=401)

  from monitor.models import TenantMembership

  membership = TenantMembership.objects.filter(user=request.user).first()
  if not membership:
    from django.http import JsonResponse

    return JsonResponse({"error": "User does not belong to any tenant"}, status=400)

  if membership.role == "Viewer":
    from django.http import JsonResponse

    return JsonResponse({"error": "Viewers cannot manage subscriptions"}, status=403)

  tenant = membership.tenant
  if not tenant.stripe_subscription_id:
    from django.http import JsonResponse

    return JsonResponse({"error": "No active subscription found"}, status=400)

  try:
    sub = stripe.Subscription.modify(tenant.stripe_subscription_id, cancel_at_period_end=False)
    return {"status": "resumed", "cancel_at_period_end": sub.cancel_at_period_end}
  except Exception as e:
    logger.error(f"Error resuming subscription: {e}")
    from django.http import JsonResponse

    return JsonResponse({"error": str(e)}, status=500)
