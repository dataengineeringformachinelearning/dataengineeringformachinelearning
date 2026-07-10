import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Initialize Django ASGI application early to ensure AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

import telemetry.routing
from django.conf import settings


def _websocket_allowed_origins() -> list[str]:
  """Origins allowed to open backend WebSockets (session revoke, etc.).

  Channels' AllowedHostsOriginValidator only checks ALLOWED_HOSTS, which for the
  API host is backend.deml.app — so connections from deml.app were rejected with
  HTTP 403. Use the same public origins as CORS/CSRF instead.
  """
  origins: list[str] = []
  for raw in getattr(settings, "CORS_ALLOWED_ORIGINS", None) or []:
    origin = str(raw).strip().rstrip("/")
    if origin and origin not in origins:
      origins.append(origin)
  for key in ("FRONTEND_URL", "MARKETING_URL", "BACKEND_URL"):
    raw = getattr(settings, key, "") or ""
    origin = str(raw).strip().rstrip("/")
    if not origin:
      continue
    # Normalize bare hosts if present
    if "://" not in origin:
      origin = f"https://{origin}"
    if origin not in origins:
      origins.append(origin)
  # Local Daphne / Angular dev
  for local in ("http://localhost:4200", "http://127.0.0.1:4200", "http://localhost:8000"):
    if local not in origins:
      origins.append(local)
  return origins


application = ProtocolTypeRouter(
  {
    "http": django_asgi_app,
    "websocket": OriginValidator(
      AuthMiddlewareStack(URLRouter(telemetry.routing.websocket_urlpatterns)),
      _websocket_allowed_origins(),
    ),
  }
)
