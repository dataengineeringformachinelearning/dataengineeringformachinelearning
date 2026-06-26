import logging

from django.conf import settings
from ninja import NinjaAPI

logger = logging.getLogger(__name__)


class CustomAPI(NinjaAPI):
  def get_openapi_schema(self, *args, **kwargs):
    schema = super().get_openapi_schema(*args, **kwargs)
    # Filter paths to only expose public APIs in docs
    paths = schema.get("paths", {})
    public_prefixes = ("/api/v1/ingest", "/api/v1/predict")
    schema["paths"] = {k: v for k, v in paths.items() if k.startswith(public_prefixes)}
    return schema


api = CustomAPI(
  title="Web Application API",
  version=getattr(settings, "APP_VERSION", "1.0.0"),
  docs_url="/docs",
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

add_router_if_not_exists("", integrations_public_router)
add_router_if_not_exists("/integrations/", integrations_router)

from billing.api import router as billing_router

add_router_if_not_exists("/billing/", billing_router)
