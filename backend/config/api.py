import logging

from django.conf import settings
from ninja import NinjaAPI

logger = logging.getLogger(__name__)


from typing import Any, Final

from django.http import HttpRequest, HttpResponse
from django.middleware.csrf import get_token
from django.template.loader import render_to_string
from integrations.constants import SWAGGER_DEMO_API_KEY
from ninja.openapi.docs import Swagger


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


class CustomAPI(NinjaAPI):
  def get_openapi_schema(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
    schema: dict[str, Any] = super().get_openapi_schema(*args, **kwargs)
    # Filter paths to only expose public APIs in docs
    paths: dict[str, Any] = schema.get("paths", {})
    public_prefixes: Final[tuple[str, ...]] = ("/api/v1/ingest", "/api/v1/predict")
    schema["paths"] = {k: v for k, v in paths.items() if k.startswith(public_prefixes)}
    return schema


api = CustomAPI(
  title="DEML Public Ingestion & Inference API",
  version=getattr(settings, "APP_VERSION", "1.0.0"),
  docs_url="/docs",
  docs=CustomSwagger(),
  description=(
    "Data Engineering for AI Engineering and Cybersecurity (DEML) public integration endpoints.\n\n"
    "**Sandbox Demo Key**: For public demonstration and sandbox testing, authorize using the token "
    f"`{SWAGGER_DEMO_API_KEY}` (Bearer authentication in the top-right 'Authorize' button). "
    "This maps requests to a scoped, unprivileged demo operator user."
  ),
)


@api.exception_handler(Exception)
def handle_uncaught_exception(request, exc):
  logger.exception("Uncaught exception in API")
  return api.create_response(
    request,
    {"error": "Internal Server Error", "message": "An unexpected error occurred."},
    status=500,
  )


# Import routers from apps
from ml.ml_api import router as ml_router
from monitor.api import router as monitor_router
from telemetry.api import router as telemetry_router


def add_router_if_not_exists(prefix, router_instance):
  if not any(r[0] == prefix for r in api._routers):
    api.add_router(prefix, router_instance)


add_router_if_not_exists("/system-status/", monitor_router)
add_router_if_not_exists("/ml/", ml_router)

# Legacy alias: some monitors probe /api/v1/model/latest (OpenAPI model namespace typo)
from ml.ml_api import LatestRunOut, get_latest_training


@api.get("/model/latest", response=LatestRunOut)
def model_latest_alias(request: Any, status_page_id: str | None = None) -> Any:
  return get_latest_training(request, status_page_id)


add_router_if_not_exists("/telemetry/", telemetry_router)

from telemetry.analytics_views import router as analytics_router

add_router_if_not_exists("/analytics/", analytics_router)

# We can also add auth endpoints directly here or via a router
from .api_auth import router as auth_router

add_router_if_not_exists("/auth/", auth_router)

from agent.api import router as agent_router

add_router_if_not_exists("/agent/", agent_router)

from integrations.api import (
  public_router as integrations_public_router,
  router as integrations_router,
)

api.add_router("", integrations_public_router)
add_router_if_not_exists("/integrations/", integrations_router)

from billing.api import router as billing_router

add_router_if_not_exists("/billing/", billing_router)


@api.get("/health")
def api_health(request):
  """Lightweight health probe for load balancers and integration monitors."""
  return {"status": "ok"}
