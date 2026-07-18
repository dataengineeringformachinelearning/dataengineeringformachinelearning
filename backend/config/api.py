"""User-focused DEML API.

Data ingestion and processing are delegated to FORJD through a sealed-event
pass-through. No data-plane router is mounted in Django.
"""

import logging
from typing import Any

from django.conf import settings
from ninja import NinjaAPI

logger = logging.getLogger(__name__)

api = NinjaAPI(
  title="DEML Learning Platform API",
  version=getattr(settings, "APP_VERSION", "1.0.0"),
  description="Identity, account, billing, learning interactions, and sealed FORJD handoff.",
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
  return {"status": "ok", "role": "user-control-plane"}
