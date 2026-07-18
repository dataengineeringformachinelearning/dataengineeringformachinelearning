"""User-owned interaction endpoints retained in DEML."""

from typing import Any

from ninja import Router, Schema
from ninja.errors import HttpError

from monitor.models import CookieConsent, NewsletterSubscription

router = Router(tags=["Users"])


class ConsentIn(Schema):
  necessary: bool = True
  analytical: bool = False
  marketing: bool = False


class NewsletterIn(Schema):
  email: str
  consent_accepted: bool


@router.post("/consent", auth=None)
def record_consent(request: Any, payload: ConsentIn) -> dict[str, str]:
  user = request.user if request.user.is_authenticated else None
  forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
  ip_address = forwarded_for.split(",")[0].strip() or request.META.get("REMOTE_ADDR")
  consent = CookieConsent.objects.create(
    user=user,
    necessary=True,
    analytical=payload.analytical,
    marketing=payload.marketing,
    ip_address=ip_address,
    user_agent=request.META.get("HTTP_USER_AGENT", ""),
  )
  return {"status": "recorded", "id": str(consent.id)}


@router.post("/newsletter", auth=None)
def subscribe(request: Any, payload: NewsletterIn) -> dict[str, str]:
  if not payload.consent_accepted:
    raise HttpError(400, "Consent is required")
  subscription, _ = NewsletterSubscription.objects.update_or_create(
    email=payload.email,
    defaults={"consent_accepted": True},
  )
  return {"status": "subscribed", "id": str(subscription.id)}
