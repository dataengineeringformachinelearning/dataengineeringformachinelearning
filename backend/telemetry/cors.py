import logging
from urllib.parse import urlparse

from django.core.cache import cache
from monitor.models import Tenant, ValidatedSite

logger = logging.getLogger(__name__)


def cors_allow_dynamic_telemetry(sender, request, **kwargs):
  """
  Signal handler for django-cors-headers to dynamically allow CORS requests
  originating from user-registered domains in the database.
  """
  origin = request.headers.get("origin")
  if not origin:
    return False

  # Restrict to telemetry endpoints to prevent DB queries on all API requests
  if not (
    request.path.startswith("/api/v1/telemetry")
    or request.path.startswith("/v1/traces")
    or request.path.startswith("/v1/metrics")
  ):
    return False

  try:
    parsed = urlparse(origin)
    domain = parsed.hostname if parsed.hostname else origin
  except Exception:
    return False

  cache_key = f"cors_origin_allowed:{domain}"
  is_allowed = cache.get(cache_key)

  if is_allowed is not None:
    return is_allowed

  try:
    # Verify if the domain belongs to any registered Tenant or ValidatedSite
    from monitor.models import MonitoredService

    allowed = (
      ValidatedSite.objects.filter(domain=domain).exists()
      or Tenant.objects.filter(target_url__icontains=domain).exists()
      or MonitoredService.objects.filter(url__icontains=domain).exists()
    )

    # Cache the result for 1 hour (3600 seconds) to avoid DB spam on OPTIONS/POST bursts
    cache.set(cache_key, allowed, timeout=3600)
    return allowed
  except Exception as e:
    logger.error(f"Error checking DB for dynamic CORS origin {domain}: {e}")
    return False
