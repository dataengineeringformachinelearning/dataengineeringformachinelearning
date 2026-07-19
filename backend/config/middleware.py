import logging
import re

from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from firebase_admin import auth

from config.headless_rate_limit import consume_many, hashed_scope

logger = logging.getLogger(__name__)

_DEML_KEY_RE = re.compile(r"\Ademl_([A-Za-z0-9]{8})_([A-Za-z0-9_-]{16,})\Z")
_API_KEY_ALLOWED_PREFIXES = (
  "/api/v1/forjd/",
  "/api/v1/system-status",
  "/api/v1/analytics",
  "/api/v1/siem",
  "/api/v1/ingest",
  "/api/v1/sessions",
  "/api/v1/projections",
  "/api/v1/replay",
  "/api/v1/agent/vulnerabilities",
  "/api/v1/exports",
  "/api/v1/ml",
  "/api/v1/model",
  "/api/v1/integrations/security-alert",
)


def _headless_limit_bucket(request) -> tuple[str, int] | None:
  normalized = request.path.rstrip("/") or "/"
  if not any(
    normalized == prefix.rstrip("/") or normalized.startswith(f"{prefix.rstrip('/')}/")
    for prefix in _API_KEY_ALLOWED_PREFIXES
  ):
    return None
  canonical = normalized
  if canonical == "/api/v1/forjd" or canonical.startswith("/api/v1/forjd/"):
    canonical = f"/api/v1{canonical.removeprefix('/api/v1/forjd')}"
  if request.method == "POST" and canonical.startswith(("/api/v1/ingest", "/api/v1/siem")):
    return "ingest", int(settings.DEML_HEADLESS_INGEST_RPM)
  if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
    return "write", int(settings.DEML_HEADLESS_WRITE_RPM)
  return "read", int(settings.DEML_HEADLESS_READ_RPM)


def _api_key_from_request(request):
  explicit = str(request.META.get("HTTP_X_API_KEY") or "").strip()
  if explicit:
    return explicit
  authorization = str(request.META.get("HTTP_AUTHORIZATION") or "").strip()
  scheme, separator, credential = authorization.partition(" ")
  if not separator:
    return None
  if scheme.lower() == "apikey":
    return credential.strip()
  if scheme.lower() == "bearer" and credential.startswith("deml_"):
    return credential.strip()
  return None


def _api_key_prefix(raw_key: str) -> str | None:
  match = _DEML_KEY_RE.fullmatch(raw_key)
  if match:
    return match.group(1)
  # Legacy credentials were opaque strings whose first eight characters were
  # stored as the lookup prefix. They remain supported through X-API-Key or
  # the explicit ApiKey authorization scheme.
  if len(raw_key) >= 16 and raw_key[:8].isascii() and raw_key[:8].isalnum():
    return raw_key[:8]
  return None


def _authenticate_api_key(request, raw_key: str):
  from monitor.models import APIKey

  prefix = _api_key_prefix(raw_key)
  if prefix is None:
    return None
  api_key = (
    APIKey.objects.select_related("user", "user__profile")
    .filter(prefix=prefix, is_active=True, user__is_active=True)
    .first()
  )
  if api_key is None or not api_key.verify_key(raw_key):
    return None
  request.user = api_key.user
  request.auth = api_key.user
  request.deml_api_key = api_key
  request.authentication_type = "api_key"
  return api_key.user


def _api_key_path_allowed(path: str) -> bool:
  if path.rstrip("/") == "/api/v1/auth/user":
    return True
  normalized_path = path.rstrip("/") or "/"
  return any(
    normalized_path == prefix.rstrip("/") or normalized_path.startswith(f"{prefix.rstrip('/')}/")
    for prefix in _API_KEY_ALLOWED_PREFIXES
  )


class FirebaseAuthenticationMiddleware(MiddlewareMixin):
  def process_request(self, request):
    request.user = AnonymousUser()
    raw_api_key = _api_key_from_request(request)
    if raw_api_key is not None:
      if _authenticate_api_key(request, raw_api_key) is None:
        # Prefix-only audit trail; never log the full credential.
        # nosemgrep: python.lang.security.audit.logging.logger-credential-leak.python-logger-credential-disclosure
        logger.warning(
          "DEML headless authentication rejected prefix=%s",
          (_api_key_prefix(raw_api_key) or "-")[:8],
        )
        return JsonResponse({"detail": "Invalid API key"}, status=401)
      if not _api_key_path_allowed(request.path):
        return JsonResponse(
          {"detail": "API keys are restricted to headless FORJD integration endpoints"},
          status=403,
        )
      return None

    auth_header = request.META.get("HTTP_AUTHORIZATION")
    if not auth_header:
      return None

    if not auth_header.startswith("Bearer "):
      return None

    token = auth_header.split(" ")[1]
    try:
      # Verify the Firebase ID token
      from django.conf import settings

      if settings.DEBUG and (token.startswith("mock-token-") or token == "mock-system-token"):
        # Format: mock-token-uid-email
        parts = token.split("-")
        uid = parts[2] if len(parts) > 2 else "mock_user"
        email = parts[3] if len(parts) > 3 else f"{uid}@example.com"
        name = uid.capitalize()
        decoded_token = {
          "uid": uid,
          "email": email,
          "name": name,
        }
      else:
        # Signature/expiry validation alone does not detect Firebase revocation
        # or a disabled upstream identity. Mock tokens never reach this branch.
        decoded_token = auth.verify_id_token(token, check_revoked=True)
      from account.lifecycle import ensure_user_from_firebase

      user, _profile, _created = ensure_user_from_firebase(decoded_token)
      if not user.is_active:
        logger.warning("Firebase authentication rejected inactive user_id=%s", user.pk)
        return JsonResponse({"detail": "Account disabled"}, status=401)

      # Authenticate the request with this user
      request.user = user
      request.firebase_token = decoded_token
      request.authentication_type = "firebase"

      session_id = request.META.get("HTTP_X_DEML_SESSION_ID")
      firebase_uid = decoded_token.get("uid")
      if session_id and firebase_uid:
        from utils.session_registry import is_session_valid, touch_session

        # Allow auth handshake endpoints (/auth/user, /auth/sessions register) to
        # proceed even if the server-side session_id is not yet registered.
        # The register endpoint creates the entry; other calls require a valid one.
        # This prevents chicken-egg 401s on initial bindServerSession.
        is_auth_handshake = request.path.startswith("/api/v1/auth/")
        if not is_auth_handshake and not is_session_valid(session_id, firebase_uid):
          return JsonResponse({"detail": "Session revoked or expired"}, status=401)
        touch_session(session_id)

    except Exception as e:
      logger.exception("Firebase auth verification failed (type=%s)", type(e).__name__)
      # If token verification fails, request.user remains AnonymousUser

    return None


class HeadlessRateLimitMiddleware(MiddlewareMixin):
  """Protect each credential/user and account before shared FORJD handoff."""

  def process_request(self, request):
    if not settings.DEML_HEADLESS_RATE_LIMIT_ENABLED:
      return None
    limit_bucket = _headless_limit_bucket(request)
    if limit_bucket is None or not getattr(request.user, "is_authenticated", False):
      return None
    bucket_name, capacity = limit_bucket
    api_key = getattr(request, "deml_api_key", None)
    principal_kind = "api_key" if api_key is not None else "user"
    principal_id = getattr(api_key, "id", None) or request.user.pk
    scopes = {hashed_scope(principal_kind, principal_id, bucket_name)}
    profile = getattr(request.user, "profile", None)
    account_id = getattr(profile, "account_id", None)
    if account_id is not None:
      scopes.add(hashed_scope("account", account_id, bucket_name))

    try:
      decisions = consume_many(scope_keys=tuple(scopes), capacity=capacity)
    except Exception as exc:
      logger.exception("DEML headless rate limiter failed error_type=%s", type(exc).__name__)
      if settings.DEBUG:
        return None
      return JsonResponse(
        {"detail": "Rate limiter unavailable", "code": "rate_limiter_unavailable"},
        status=503,
        headers={"Retry-After": "5"},
      )

    request.headless_rate_limit = {
      "limit": min(decision.limit for decision in decisions),
      "remaining": min(decision.remaining for decision in decisions),
      "retry_after": max(decision.retry_after for decision in decisions),
    }
    if any(not decision.allowed for decision in decisions):
      retry_after = max(1, request.headless_rate_limit["retry_after"])
      return JsonResponse(
        {"detail": "Rate limit exceeded", "code": "rate_limit_exceeded"},
        status=429,
        headers={"Retry-After": str(retry_after)},
      )
    return None

  def process_response(self, request, response):
    state = getattr(request, "headless_rate_limit", None)
    if state is not None:
      response["X-RateLimit-Limit"] = str(state["limit"])
      response["X-RateLimit-Remaining"] = str(state["remaining"])
      response["X-RateLimit-Reset"] = str(max(0, state["retry_after"]))
    return response
