"""User-focused DEML API.

Data ingestion and processing are delegated to FORJD through a sealed-event
pass-through. No data-plane router is mounted in Django.
"""

import logging
from typing import Any, Final

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.middleware.csrf import get_token
from django.template.loader import render_to_string
from ninja import NinjaAPI
from ninja.openapi.docs import Swagger

logger = logging.getLogger(__name__)


# --- Viking-themed Swagger shell ---
class CustomSwagger(Swagger):
  def render_page(self, request: HttpRequest, api: NinjaAPI, **kwargs: Any) -> HttpResponse:
    openapi_url: Final[str] = self.get_openapi_url(api, kwargs)
    csrf_token: Final[str] = get_token(request) or ""
    html: Final[str] = render_to_string(
      "swagger.html",
      {
        "api_title": api.title,
        "api_version": api.version,
        "openapi_url": openapi_url,
        "csrf_token": csrf_token,
        "frontend_url": settings.FRONTEND_URL.rstrip("/"),
        "marketing_url": settings.MARKETING_URL.rstrip("/"),
      },
      request=request,
    )
    # nosemgrep: python.django.security.audit.xss.direct-use-of-httpresponse.direct-use-of-httpresponse
    return HttpResponse(html, content_type="text/html")


api = NinjaAPI(
  title="DEML Learning Platform API",
  version=getattr(settings, "APP_VERSION", "1.0.0"),
  docs_url="/docs",
  docs=CustomSwagger(),
  description=(
    "Identity, account, billing, learning interactions, and sealed FORJD handoff.\n\n"
    "Authenticate with a Firebase session cookie (browser) or a `deml_…` API key "
    "(Bearer / `X-API-Key`) on headless integration routes. Sealed ingest and "
    "processing execute in FORJD via the mapped tenant service credential."
  ),
)


@api.exception_handler(Exception)
def handle_uncaught_exception(request: Any, exc: Exception) -> Any:
  logger.exception("Uncaught exception in API")
  return api.create_response(request, {"error": "Internal Server Error"}, status=500)


from agent.api import router as interactions_router
from billing.api import router as billing_router
from forjd.api import router as forjd_router
from monitor.api import router as user_router

from .api_auth import router as auth_router

api.add_router("/auth/", auth_router)
api.add_router("/users/", user_router)
api.add_router("/agent/", interactions_router)
api.add_router("/billing/", billing_router)
api.add_router("/forjd/", forjd_router)


@api.get("/health", auth=None)
def api_health(request: Any) -> dict[str, str]:
  """Liveness — process is up (Fly health checks)."""
  return {"status": "ok", "role": "user-control-plane"}


@api.get("/ready", auth=None, include_in_schema=False)
def api_ready(request: Any) -> dict[str, Any]:
  """Readiness — Postgres + FORJD credentials; lightweight FORJD /health probe."""
  import http.client
  from urllib.parse import urlparse

  from django.db import connection
  from ninja.errors import HttpError

  try:
    connection.ensure_connection()
  except Exception as exc:
    logger.exception("ready: database unavailable")
    # Never echo exception text to clients when DEBUG is off.
    detail = f"database unavailable: {exc}" if settings.DEBUG else "database unavailable"
    raise HttpError(503, detail) from exc

  forjd_url = str(getattr(settings, "FORJD_API_URL", "") or "").strip().rstrip("/")
  forjd_ok = forjd_url.lower().startswith("https://")
  token_set = bool(str(getattr(settings, "FORJD_SERVICE_TOKEN", "") or "").strip())
  tenant_set = bool(str(getattr(settings, "FORJD_TENANT_ID", "") or "").strip())
  if not forjd_ok or not token_set or not tenant_set:
    # Boolean flags only — never log secret values.
    logger.warning(
      "ready: FORJD binding incomplete url_ok=%s svc_set=%s tenant_set=%s",
      forjd_ok,
      token_set,
      tenant_set,
    )
    raise HttpError(503, "FORJD control-plane credentials not configured")

  # Soft probe — settings-owned HTTPS base + fixed /health (not user-controlled).
  forjd_health = "unreachable"
  try:
    parsed = urlparse(f"{forjd_url}/health")
    if parsed.scheme != "https" or not parsed.hostname:
      raise ValueError("forjd_url_invalid")
    # Python 3.12 verifies TLS by default; host is settings-owned, not request input.
    # nosemgrep: python.lang.security.audit.httpsconnection-detected.httpsconnection-detected
    conn = http.client.HTTPSConnection(parsed.hostname, parsed.port or 443, timeout=2.5)
    try:
      conn.request("GET", parsed.path or "/health", headers={"Accept": "application/json"})
      resp = conn.getresponse()
      forjd_health = "ok" if resp.status < 400 else "degraded"
    finally:
      conn.close()
  except (TimeoutError, OSError, ValueError, http.client.HTTPException) as exc:
    forjd_health = "unreachable"
    logger.warning(
      "ready: FORJD /health probe failed error_type=%s",
      type(exc).__name__,
    )

  if forjd_health != "ok":
    logger.warning("ready: FORJD health soft-degraded forjd_health=%s", forjd_health)

  return {
    "status": "ready",
    "role": "user-control-plane",
    "database": "ok",
    "forjd_api_url": forjd_url,
    "forjd_token_configured": True,
    "forjd_tenant_configured": True,
    "forjd_health": forjd_health,
  }
