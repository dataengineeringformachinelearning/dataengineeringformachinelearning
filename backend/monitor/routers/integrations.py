import datetime
import logging
import urllib.parse

from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from utils.permissions import require_auth

from monitor.models import AnalyticsIntegration

logger = logging.getLogger(__name__)
router = Router()


class IntegrationOut(Schema):
  id: str
  provider: str
  active: bool
  last_sync: datetime.datetime | None = None
  created_at: datetime.datetime


class ClarityIn(Schema):
  project_id: str
  api_key: str


class CloudflareIn(Schema):
  project_id: str
  api_key: str


@router.get("", response=list[IntegrationOut])
def list_integrations(request):
  user = require_auth(request)
  integrations = AnalyticsIntegration.objects.filter(user=user)
  return [
    IntegrationOut(
      id=str(integ.id),
      provider=integ.provider,
      active=integ.active,
      last_sync=integ.last_sync,
      created_at=integ.created_at,
    )
    for integ in integrations
  ]


def _google_oauth_redirect_uri() -> str:
  """Canonical GA OAuth callback. Must match Google Cloud Console exactly."""
  from django.conf import settings

  configured = getattr(settings, "GOOGLE_OAUTH_REDIRECT_URI", "") or ""
  configured = configured.strip().rstrip("/")
  if configured:
    return configured
  backend = (getattr(settings, "BACKEND_URL", "") or "http://localhost:8000").rstrip("/")
  return f"{backend}/api/v1/system-status/integrations/google/callback"


def _frontend_settings_redirect(*, status: str, reason: str = "") -> str:
  from django.conf import settings

  frontend_url = (getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")
  params = {"integration": "google", "status": status}
  if reason:
    params["reason"] = reason[:120]
  return f"{frontend_url}/settings?{urllib.parse.urlencode(params)}"


@router.get("/google/auth-url")
def google_auth_url(request):
  user = require_auth(request)

  from django.conf import settings

  from monitor.services.oauth_state import sign_oauth_user_id

  client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "mock-client-id")
  redirect_uri = _google_oauth_redirect_uri()

  scope = "https://www.googleapis.com/auth/analytics.readonly"
  params = {
    "client_id": client_id,
    "redirect_uri": redirect_uri,
    "response_type": "code",
    "scope": scope,
    "access_type": "offline",
    "prompt": "consent",
    "include_granted_scopes": "true",
    "state": sign_oauth_user_id(user.id),
  }

  url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
  # redirect_uri is returned so operators can copy it into Google Cloud Console
  # Authorized redirect URIs when diagnosing Error 400: redirect_uri_mismatch.
  return {"url": url, "redirect_uri": redirect_uri}


@router.get("/google/callback")
def google_callback(
  request,
  code: str | None = None,
  state: str | None = None,
  error: str | None = None,
  error_description: str | None = None,
):
  import requests
  from django.conf import settings
  from django.contrib.auth.models import User
  from django.core import signing
  from django.shortcuts import redirect

  from monitor.services.oauth_state import unsign_oauth_state

  if error:
    logger.warning(
      "Google OAuth denied or failed at consent: error=%s description=%s",
      error,
      (error_description or "")[:300],
    )
    return redirect(_frontend_settings_redirect(status="failed", reason=error or "consent_denied"))

  if not code or not state:
    logger.warning("Google OAuth callback missing code or state")
    return redirect(_frontend_settings_redirect(status="failed", reason="missing_code"))

  try:
    user = get_object_or_404(User, id=unsign_oauth_state(state))
  except (signing.BadSignature, signing.SignatureExpired, ValueError, TypeError):
    logger.warning("Google OAuth callback invalid or expired state")
    return redirect(_frontend_settings_redirect(status="failed", reason="invalid_state"))

  client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "mock-client-id")
  client_secret = getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "mock-client-secret")
  redirect_uri = _google_oauth_redirect_uri()

  token_url = "https://oauth2.googleapis.com/token"
  data = {
    "code": code,
    "client_id": client_id,
    "client_secret": client_secret,
    "redirect_uri": redirect_uri,
    "grant_type": "authorization_code",
  }

  try:
    response = requests.post(token_url, data=data, timeout=10)
    token_data = response.json() if response.content else {}

    if "access_token" in token_data:
      AnalyticsIntegration.objects.update_or_create(
        user=user,
        provider="google",
        defaults={
          "credentials": {
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "expires_in": token_data.get("expires_in"),
            "token_type": token_data.get("token_type"),
            "scope": token_data.get("scope"),
          },
          "active": True,
        },
      )
      logger.info("Google Analytics OAuth connected for user_id=%s", user.id)
      return redirect(_frontend_settings_redirect(status="success"))

    # Codes only — avoid logging response bodies (may contain secrets).
    err_code = str(token_data.get("error") or f"http_{response.status_code}")
    logger.error(
      "GA analytics connect exchange rejected status=%s code=%s",
      response.status_code,
      err_code,
    )
    return redirect(_frontend_settings_redirect(status="failed", reason=err_code))
  except Exception:
    logger.exception("GA analytics connect exchange failed")
    return redirect(_frontend_settings_redirect(status="failed", reason="exchange_error"))


@router.post("/clarity", response=IntegrationOut)
def save_clarity(request, payload: ClarityIn):
  user = require_auth(request)

  integ, _ = AnalyticsIntegration.objects.update_or_create(
    user=user,
    provider="microsoft",
    defaults={
      "credentials": {
        "project_id": payload.project_id,
        "api_key": payload.api_key,
      },
      "active": True,
    },
  )

  return IntegrationOut(
    id=str(integ.id),
    provider=integ.provider,
    active=integ.active,
    last_sync=integ.last_sync,
    created_at=integ.created_at,
  )


@router.post("/cloudflare", response=IntegrationOut)
def save_cloudflare(request, payload: CloudflareIn):
  user = require_auth(request)

  integ, _ = AnalyticsIntegration.objects.update_or_create(
    user=user,
    provider="cloudflare",
    defaults={
      "credentials": {
        "project_id": payload.project_id,
        "api_key": payload.api_key,
      },
      "active": True,
    },
  )

  return IntegrationOut(
    id=str(integ.id),
    provider=integ.provider,
    active=integ.active,
    last_sync=integ.last_sync,
    created_at=integ.created_at,
  )


@router.delete("/{integration_id}")
def delete_integration(request, integration_id: str):
  user = require_auth(request)
  integration = get_object_or_404(AnalyticsIntegration, id=integration_id, user=user)
  integration.delete()
  return {"success": True}
