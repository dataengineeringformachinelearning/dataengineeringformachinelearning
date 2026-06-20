import logging

from django.conf import settings
from ninja import NinjaAPI

logger = logging.getLogger(__name__)

api = NinjaAPI(
  title="Web Application API",
  version=getattr(settings, "APP_VERSION", "1.0.0"),
  docs_url="/docs" if settings.DEBUG else None,
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

api.add_router("/system-status/", monitor_router)
api.add_router("/ml/", ml_router)
api.add_router("/telemetry/", telemetry_router)

from telemetry.analytics_views import router as analytics_router

api.add_router("/analytics/", analytics_router)

# We can also add auth endpoints directly here or via a router
from .api_auth import router as auth_router

api.add_router("/auth/", auth_router)

from agent.api import router as agent_router

api.add_router("/agent/", agent_router)
