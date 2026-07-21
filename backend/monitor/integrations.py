"""Analytics provider integrations (GA / Clarity / Cloudflare) — DEML control plane.

Third-party analytics credentials never leave DEML's Postgres: they are sealed
with the platform KEK envelope (``forjd.secrets``) before persistence and are
never returned by the API. Google Analytics links via OAuth; Clarity and
Cloudflare accept a project/account id + API key pair. These endpoints keep the
pre-FORJD Angular contract (``/api/v1/system-status/integrations…``) stable.
"""

from __future__ import annotations

import json
import logging
import urllib.parse
import uuid
from typing import Any

import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.core import signing
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from forjd.secrets import open_service_token, seal_service_token

from monitor.models import AnalyticsIntegration, AuditLog

logger = logging.getLogger("monitor.integrations")

OAUTH_STATE_SALT = "monitor.integrations.google-oauth"
OAUTH_STATE_MAX_AGE_SECONDS = 600
GOOGLE_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly"

# Mutations mirror the UI's canMutateSites gate: Viewers are read-only.
WRITE_ROLES = frozenset({"Operator", "Security Admin"})


# --- Auth guard (header-terminated identity only; session cookies carry no authority) ---
def _actor_for_request(request: HttpRequest) -> tuple[User, uuid.UUID] | JsonResponse:
  """Resolve (user, account_id) or an error response.

  Requires Firebase/API-key identity set by ``FirebaseAuthenticationMiddleware``
  so the ``csrf_exempt`` views never trust cookie-derived authority.
  """
  user = getattr(request, "user", None)
  has_end_user_auth = bool(
    getattr(request, "firebase_token", None) or getattr(request, "deml_api_key", None)
  )
  if (
    user is None
    or not has_end_user_auth
    or not user.is_authenticated
    or not getattr(user, "is_active", False)
  ):
    return JsonResponse({"detail": "Authentication required"}, status=401)
  account_id = getattr(getattr(user, "profile", None), "account_id", None)
  if account_id is None:
    return JsonResponse(
      {"detail": "The authenticated user has no DEML account", "code": "account_required"},
      status=403,
    )
  return user, account_id


def _require_write_role(user: User) -> JsonResponse | None:
  role = str(getattr(getattr(user, "profile", None), "role", "") or "")
  if role not in WRITE_ROLES:
    return JsonResponse(
      {"detail": "The authenticated role is read-only for integrations"},
      status=403,
    )
  return None


def _audit(user: User, action: str, integration: AnalyticsIntegration) -> None:
  """Metadata-only audit trail — never credentials or ciphertext."""
  AuditLog.objects.create(
    user=user,
    action=action,
    resource_id=str(integration.id),
    details={"provider": integration.provider},
  )


# --- Sealed credential helpers (ciphertext-only persistence) ---
def _seal_credentials(credentials: dict[str, Any]) -> tuple[str, str]:
  return seal_service_token(json.dumps(credentials))


def open_integration_credentials(integration: AnalyticsIntegration) -> dict[str, Any]:
  """Decrypt sealed provider credentials (server-side use only)."""
  raw = open_service_token(integration.credentials_ciphertext, integration.credentials_dek)
  loaded = json.loads(raw)
  return loaded if isinstance(loaded, dict) else {}


def _integration_out(integration: AnalyticsIntegration) -> dict[str, Any]:
  return {
    "id": str(integration.id),
    "provider": integration.provider,
    "active": integration.active,
    "last_sync": integration.last_sync.isoformat() if integration.last_sync else None,
    "created_at": integration.created_at.isoformat(),
  }


def _save_keyed_integration(request: HttpRequest, provider: str) -> JsonResponse:
  actor = _actor_for_request(request)
  if isinstance(actor, JsonResponse):
    return actor
  user, account_id = actor
  denied = _require_write_role(user)
  if denied is not None:
    return denied
  try:
    payload = json.loads(request.body or b"{}")
  except json.JSONDecodeError:
    return JsonResponse({"detail": "Invalid JSON"}, status=400)
  project_id = str(payload.get("project_id") or "").strip()
  api_key = str(payload.get("api_key") or "").strip()
  if not project_id or not api_key:
    return JsonResponse({"detail": "project_id and api_key are required"}, status=400)
  ciphertext, encrypted_dek = _seal_credentials({"project_id": project_id, "api_key": api_key})
  integration, _ = AnalyticsIntegration.objects.update_or_create(
    account_id=account_id,
    provider=provider,
    defaults={
      "user": user,
      "credentials_ciphertext": ciphertext,
      "credentials_dek": encrypted_dek,
      "active": True,
    },
  )
  _audit(user, "ANALYTICS_INTEGRATION_CONNECTED", integration)
  return JsonResponse(_integration_out(integration), status=200)


# --- List / delete ---
@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
def integrations_list(request: HttpRequest) -> JsonResponse:
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  actor = _actor_for_request(request)
  if isinstance(actor, JsonResponse):
    return actor
  _user, account_id = actor
  rows = AnalyticsIntegration.objects.filter(account_id=account_id).order_by("created_at")
  return JsonResponse([_integration_out(row) for row in rows], safe=False)


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
def integration_delete(request: HttpRequest, integration_id: str) -> JsonResponse:
  if request.method != "DELETE":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  actor = _actor_for_request(request)
  if isinstance(actor, JsonResponse):
    return actor
  user, account_id = actor
  denied = _require_write_role(user)
  if denied is not None:
    return denied
  try:
    integration_uuid = uuid.UUID(str(integration_id))
  except ValueError:
    return JsonResponse({"detail": "Integration not found"}, status=404)
  integration = AnalyticsIntegration.objects.filter(
    id=integration_uuid, account_id=account_id
  ).first()
  if integration is None:
    return JsonResponse({"detail": "Integration not found"}, status=404)
  _audit(user, "ANALYTICS_INTEGRATION_DISCONNECTED", integration)
  integration.delete()
  return JsonResponse({"success": True})


# --- Keyed providers (Clarity / Cloudflare) ---
@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
def clarity_save(request: HttpRequest) -> JsonResponse:
  if request.method != "POST":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  return _save_keyed_integration(request, AnalyticsIntegration.Provider.MICROSOFT)


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
def cloudflare_save(request: HttpRequest) -> JsonResponse:
  if request.method != "POST":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  return _save_keyed_integration(request, AnalyticsIntegration.Provider.CLOUDFLARE)


# --- Google Analytics OAuth ---
def _google_redirect_uri() -> str:
  configured = str(getattr(settings, "GOOGLE_OAUTH_REDIRECT_URI", "") or "").strip()
  if configured:
    return configured
  backend = str(getattr(settings, "BACKEND_URL", "") or "").rstrip("/")
  return f"{backend}/api/v1/system-status/integrations/google/callback"


def _frontend_return_url(status: str, reason: str = "") -> str:
  frontend_url = str(getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")
  query = {"integration": "google", "status": status}
  if reason:
    query["reason"] = reason[:120]
  return f"{frontend_url}/settings?{urllib.parse.urlencode(query)}"


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
def google_auth_url(request: HttpRequest) -> JsonResponse:
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  actor = _actor_for_request(request)
  if isinstance(actor, JsonResponse):
    return actor
  user, _account_id = actor
  denied = _require_write_role(user)
  if denied is not None:
    return denied
  client_id = str(getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "") or "").strip()
  if not client_id:
    return JsonResponse(
      {"detail": "Google Analytics OAuth is not configured on this deployment"},
      status=503,
    )
  redirect_uri = _google_redirect_uri()
  params = {
    "client_id": client_id,
    "redirect_uri": redirect_uri,
    "response_type": "code",
    "scope": GOOGLE_ANALYTICS_SCOPE,
    "access_type": "offline",
    "prompt": "consent",
    "state": signing.dumps({"uid": user.id}, salt=OAUTH_STATE_SALT),
  }
  url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
  # redirect_uri is echoed so operators can copy it into the Google Cloud
  # Console when diagnosing redirect_uri_mismatch.
  return JsonResponse({"url": url, "redirect_uri": redirect_uri})


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
def google_callback(request: HttpRequest) -> HttpResponse:
  # Google redirects here without DEML auth; the signed short-lived state binds
  # the callback to the user who initiated the flow.
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  error = str(request.GET.get("error") or "")
  if error:
    logger.warning("Google OAuth denied at consent: %s", error[:120])
    return redirect(_frontend_return_url("failed", error))
  code = str(request.GET.get("code") or "")
  state = str(request.GET.get("state") or "")
  if not code or not state:
    return redirect(_frontend_return_url("failed", "missing_code_or_state"))
  try:
    payload = signing.loads(state, salt=OAUTH_STATE_SALT, max_age=OAUTH_STATE_MAX_AGE_SECONDS)
    user = User.objects.get(id=int(payload["uid"]), is_active=True)
  except (signing.BadSignature, signing.SignatureExpired, User.DoesNotExist, KeyError, ValueError):
    return redirect(_frontend_return_url("failed", "invalid_state"))
  account_id = getattr(getattr(user, "profile", None), "account_id", None)
  if account_id is None:
    return redirect(_frontend_return_url("failed", "account_required"))

  data = {
    "code": code,
    "client_id": str(getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "") or ""),
    "client_secret": str(getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "") or ""),
    "redirect_uri": _google_redirect_uri(),
    "grant_type": "authorization_code",
  }
  try:
    response = requests.post("https://oauth2.googleapis.com/token", data=data, timeout=10)
    token_data = response.json()
  except Exception:
    logger.exception("Google OAuth token exchange failed")
    return redirect(_frontend_return_url("failed", "token_exchange_error"))

  if not isinstance(token_data, dict) or "access_token" not in token_data:
    # Error codes only — response bodies may contain secrets.
    reason = str((token_data or {}).get("error") or "no_access_token")
    logger.warning("Google OAuth exchange rejected: %s", reason[:120])
    return redirect(_frontend_return_url("failed", reason))

  ciphertext, encrypted_dek = _seal_credentials(
    {
      "access_token": token_data.get("access_token"),
      "refresh_token": token_data.get("refresh_token"),
      "expires_in": token_data.get("expires_in"),
    }
  )
  integration, _ = AnalyticsIntegration.objects.update_or_create(
    account_id=account_id,
    provider=AnalyticsIntegration.Provider.GOOGLE,
    defaults={
      "user": user,
      "credentials_ciphertext": ciphertext,
      "credentials_dek": encrypted_dek,
      "active": True,
      "last_sync": timezone.now(),
    },
  )
  _audit(user, "ANALYTICS_INTEGRATION_CONNECTED", integration)
  return redirect(_frontend_return_url("success"))
