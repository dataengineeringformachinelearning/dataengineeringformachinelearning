"""Legacy user-interaction paths retained for the unchanged Angular UI."""

import json

from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from monitor.models import CookieConsent, NewsletterSubscription


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
def cookie_consent(request: HttpRequest) -> JsonResponse:
  if request.method != "POST":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    payload = json.loads(request.body or b"{}")
  except json.JSONDecodeError:
    return JsonResponse({"detail": "Invalid JSON"}, status=400)
  # This cross-site JSON endpoint derives no authority from a session cookie.
  user = (
    request.user
    if request.user.is_authenticated and getattr(request, "firebase_token", None)
    else None
  )
  forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
  consent = CookieConsent.objects.create(
    user=user,
    necessary=True,
    analytical=bool(payload.get("analytical", False)),
    marketing=bool(payload.get("marketing", False)),
    ip_address=forwarded_for.split(",")[0].strip() or request.META.get("REMOTE_ADDR"),
    user_agent=request.META.get("HTTP_USER_AGENT", ""),
  )
  return JsonResponse({"status": "success", "id": str(consent.id)})


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
def newsletter(request: HttpRequest) -> JsonResponse:
  if request.method != "POST":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    payload = json.loads(request.body or b"{}")
  except json.JSONDecodeError:
    return JsonResponse({"detail": "Invalid JSON"}, status=400)
  if not payload.get("consent_accepted"):
    return JsonResponse({"detail": "Consent is required"}, status=400)
  subscription, _ = NewsletterSubscription.objects.update_or_create(
    email=str(payload.get("email") or ""),
    defaults={"consent_accepted": True},
  )
  return JsonResponse({"status": "success", "id": str(subscription.id)})
