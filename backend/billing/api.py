import datetime
import json
import logging
import uuid
from typing import Any

try:
  import stripe

  HAS_STRIPE = True
except ImportError:
  HAS_STRIPE = False

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.http import HttpResponse
from monitor.models import UserLifecycleJob, UserProfile
from ninja import Router

logger = logging.getLogger(__name__)

if HAS_STRIPE:
  stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")

router = Router(tags=["Billing"])
User = get_user_model()


def _stripe_resource_is_missing(exc: Exception) -> bool:
  error_code = str(getattr(exc, "code", "") or "")
  error_body = getattr(exc, "json_body", None)
  if isinstance(error_body, dict):
    nested = error_body.get("error")
    if isinstance(nested, dict):
      error_code = error_code or str(nested.get("code") or "")
  return getattr(exc, "http_status", None) == 404 or error_code == "resource_missing"


def _cancel_tombstoned_subscription(subscription_id: object) -> bool:
  value = str(subscription_id or "").strip()
  if not value:
    return True
  try:
    stripe.Subscription.cancel(value)
  except Exception as exc:
    if _stripe_resource_is_missing(exc):
      return True
    logger.exception(
      "Late checkout subscription cancellation failed error_type=%s",
      type(exc).__name__,
    )
    return False
  return True


def _subscription_period_end(subscription: Any) -> int | None:
  """Return a subscription's current period end (unix ts) across Stripe API versions.

  Stripe's 2025-04 ("basil") API removed `current_period_end` from the Subscription
  object and moved it onto each subscription item (`items.data[].current_period_end`).
  Older API versions keep it on the subscription. Read both shapes safely so billing
  sync does not fail with a KeyError/AttributeError on newer accounts.
  """

  def _get(obj: Any, key: str) -> Any:
    if isinstance(obj, dict):
      return obj.get(key)
    return getattr(obj, key, None)

  top_level = _get(subscription, "current_period_end")
  if top_level:
    return top_level

  items = _get(subscription, "items")
  data = _get(items, "data") if items is not None else None
  if not data:
    return None
  ends = [e for e in (_get(item, "current_period_end") for item in data) if e]
  return max(ends) if ends else None


def _get_profile(request) -> UserProfile | None:
  if not hasattr(request.user, "profile"):
    return None
  return request.user.profile


@router.post("/create-checkout-session")
def create_checkout_session(request):
  if not request.user.is_authenticated or not request.user.is_active:
    from django.http import JsonResponse

    return JsonResponse({"error": "Authentication required"}, status=401)

  try:
    data = json.loads(request.body) if request.body else {}
    account_id = data.get("account_id")

    profile = _get_profile(request)
    if not profile:
      from django.http import JsonResponse

      return JsonResponse({"error": "Account profile not provisioned"}, status=400)

    if UserLifecycleJob.objects.filter(
      account_id=profile.account_id,
      job_type=UserLifecycleJob.JobType.DELETION,
    ).exists():
      from django.http import JsonResponse

      return JsonResponse({"error": "Account deletion is in progress"}, status=409)

    if account_id:
      try:
        valid_id = uuid.UUID(account_id)
        if valid_id != profile.account_id:
          return 400, {"error": "Invalid account ID"}
      except (ValueError, TypeError):
        return 400, {"error": "Invalid account ID"}

    if profile.role == "Viewer":
      from django.http import JsonResponse

      return JsonResponse({"error": "Viewers cannot manage subscriptions"}, status=403)

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
      client_reference_id=str(profile.account_id),
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
      profile_ref = UserProfile.objects.filter(account_id=client_reference_id).first()
      tombstoned = profile_ref is None
      if profile_ref is not None:
        try:
          # Lock in the same user→profile order as deletion. Whichever request
          # wins is then visible to the loser: deletion cancels a stored
          # subscription, or this webhook observes the tombstone and cancels it.
          with transaction.atomic():
            locked_user = User.objects.select_for_update().get(pk=profile_ref.user_id)
            profile = UserProfile.objects.select_for_update().get(pk=profile_ref.pk)
            tombstoned = (
              not locked_user.is_active
              or UserLifecycleJob.objects.filter(
                account_id=profile.account_id,
                job_type=UserLifecycleJob.JobType.DELETION,
              ).exists()
            )
            if tombstoned:
              profile.tier = "Standard"
              profile.subscription_active = False
              profile.save(update_fields=["tier", "subscription_active"])
            else:
              profile.tier = "Pro"
              profile.stripe_customer_id = customer_id
              profile.stripe_subscription_id = subscription_id
              profile.subscription_active = True

              if subscription_id:
                sub = stripe.Subscription.retrieve(subscription_id)
                period_end = _subscription_period_end(sub)
                if period_end:
                  profile.subscription_current_period_end = datetime.datetime.fromtimestamp(
                    period_end, tz=datetime.timezone.utc
                  )
              profile.save()
        except (User.DoesNotExist, UserProfile.DoesNotExist):
          tombstoned = True

      if tombstoned:
        logger.warning(
          "Canceling checkout completed behind account deletion tombstone account=%s",
          client_reference_id,
        )
        if not _cancel_tombstoned_subscription(subscription_id):
          # Stripe retries signed webhooks on non-2xx responses. Never
          # acknowledge a late subscription until recurring billing is stopped.
          return HttpResponse(status=500)

  elif event["type"] in ["customer.subscription.updated", "customer.subscription.deleted"]:
    subscription = event["data"]["object"]
    sub_id = (
      subscription.get("id")
      if isinstance(subscription, dict)
      else getattr(subscription, "id", None)
    )
    status = (
      subscription.get("status")
      if isinstance(subscription, dict)
      else getattr(subscription, "status", None)
    )
    period_end = _subscription_period_end(subscription)

    profiles = UserProfile.objects.filter(
      stripe_subscription_id=sub_id,
      user__is_active=True,
    )
    for profile in profiles:
      if event["type"] == "customer.subscription.deleted" or status in [
        "canceled",
        "unpaid",
        "past_due",
      ]:
        profile.tier = "Standard"
        profile.subscription_active = False
      else:
        profile.tier = "Pro"
        profile.subscription_active = True

      if period_end:
        profile.subscription_current_period_end = datetime.datetime.fromtimestamp(
          period_end, tz=datetime.timezone.utc
        )
      profile.save()

  return HttpResponse(status=200)


@router.post("/sync")
def sync_subscription(request: Any) -> Any:
  if not request.user.is_authenticated:
    from django.http import JsonResponse

    return JsonResponse({"error": "Authentication required"}, status=401)

  profile = _get_profile(request)
  if not profile:
    return {"status": "synced", "active": False, "cancel_at_period_end": False}

  email = request.user.email

  # Collect all possible emails to check against Stripe
  emails_to_check = set()
  if email:
    emails_to_check.add(email)

  if hasattr(request, "firebase_token") and request.firebase_token:
    identities = request.firebase_token.get("firebase", {}).get("identities", {})
    linked_emails = identities.get("email", [])
    for linked_email in linked_emails:
      emails_to_check.add(linked_email)

  if not HAS_STRIPE or not getattr(stripe, "api_key", None):
    return {
      "status": "synced",
      "active": profile.subscription_active,
      "cancel_at_period_end": False,
      "message": "Billing sync unavailable (Stripe not configured)",
    }

  if not emails_to_check and not profile.stripe_customer_id:
    if profile.stripe_customer_id is None and profile.tier == "Pro":
      profile.subscription_active = True
      profile.save()
      return {"status": "synced", "active": True, "cancel_at_period_end": False}
    profile.tier = "Standard"
    profile.subscription_active = False
    profile.save()
    return {"status": "synced", "active": False, "cancel_at_period_end": False}

  stripe_error_occurred = False
  try:
    customers = []
    if profile.stripe_customer_id:
      try:
        customer = stripe.Customer.retrieve(profile.stripe_customer_id)
        if not getattr(customer, "deleted", False):
          customers.append(customer)
      except Exception as err:
        logger.warning(f"Stripe customer retrieve failed: {err}")
        stripe_error_occurred = True

    if not customers and not stripe_error_occurred:
      for e in emails_to_check:
        try:
          customers.extend(stripe.Customer.list(email=e).data)
        except Exception as err:
          logger.warning(f"Stripe customer list failed: {err}")
          stripe_error_occurred = True

    if customers and not stripe_error_occurred:
      for customer in customers:
        try:
          subscriptions = stripe.Subscription.list(customer=customer.id, status="active").data
          if subscriptions:
            sub = subscriptions[0]
            profile.tier = "Pro"
            profile.stripe_customer_id = customer.id
            profile.stripe_subscription_id = sub.id
            profile.subscription_active = True
            period_end = _subscription_period_end(sub)
            if period_end:
              profile.subscription_current_period_end = datetime.datetime.fromtimestamp(
                period_end, tz=datetime.timezone.utc
              )
            profile.save()
            return {
              "status": "synced",
              "active": True,
              "cancel_at_period_end": getattr(sub, "cancel_at_period_end", False),
            }
        except Exception as err:
          logger.warning(f"Stripe subscription list failed: {err}")
          stripe_error_occurred = True

    if stripe_error_occurred:
      return {
        "status": "synced",
        "active": profile.subscription_active,
        "cancel_at_period_end": False,
        "message": "Billing sync degraded (Stripe API error)",
      }

    if profile.stripe_customer_id is None and profile.tier == "Pro":
      # Preserve manual upgrades that don't have a Stripe customer tied to them
      profile.subscription_active = True
      profile.save()
      return {"status": "synced", "active": True, "cancel_at_period_end": False}

    profile.tier = "Standard"
    profile.subscription_active = False
    profile.save()
    return {"status": "synced", "active": False, "cancel_at_period_end": False}
  except Exception as e:
    logger.error(f"Error syncing subscription: {e}", exc_info=True)
    from django.http import JsonResponse

    return JsonResponse({"error": str(e)}, status=500)


@router.post("/cancel-subscription")
def cancel_subscription(request):
  if not request.user.is_authenticated:
    from django.http import JsonResponse

    return JsonResponse({"error": "Authentication required"}, status=401)

  profile = _get_profile(request)
  if not profile:
    from django.http import JsonResponse

    return JsonResponse({"error": "Account profile not provisioned"}, status=400)

  if profile.role == "Viewer":
    from django.http import JsonResponse

    return JsonResponse({"error": "Viewers cannot manage subscriptions"}, status=403)

  if not profile.stripe_subscription_id:
    from django.http import JsonResponse

    return JsonResponse({"error": "No active subscription found"}, status=400)

  try:
    sub = stripe.Subscription.modify(profile.stripe_subscription_id, cancel_at_period_end=True)
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

  profile = _get_profile(request)
  if not profile:
    from django.http import JsonResponse

    return JsonResponse({"error": "Account profile not provisioned"}, status=400)

  if profile.role == "Viewer":
    from django.http import JsonResponse

    return JsonResponse({"error": "Viewers cannot manage subscriptions"}, status=403)

  if not profile.stripe_subscription_id:
    from django.http import JsonResponse

    return JsonResponse({"error": "No active subscription found"}, status=400)

  try:
    sub = stripe.Subscription.modify(profile.stripe_subscription_id, cancel_at_period_end=False)
    return {"status": "resumed", "cancel_at_period_end": sub.cancel_at_period_end}
  except Exception as e:
    logger.error(f"Error resuming subscription: {e}")
    from django.http import JsonResponse

    return JsonResponse({"error": str(e)}, status=500)
