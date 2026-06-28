import logging
from urllib.parse import urlparse

from django.core.cache import cache
from django.db.models import Q

logger = logging.getLogger(__name__)


def is_domain_registered(origin: str) -> bool:
  """
  Unified function to check if a domain is registered in the system.
  Parses the origin and handles both exact URL matches and domain-only matches.
  Caches results for 1 hour to prevent database spam.
  """
  if not origin:
    return False

  try:
    parsed = urlparse(origin)
    domain = parsed.hostname if parsed.hostname else origin
    if not domain:
      return False

    # Fast-track platform domains
    platform_domains = {
      "dataengineeringformachinelearning.com",
      "www.dataengineeringformachinelearning.com",
      "deml.app",
      "www.deml.app",
      "localhost",
      "127.0.0.1",
    }
    if domain in platform_domains:
      return True

    cache_key = f"cors_origin_allowed:{domain}"
    try:
      is_allowed = cache.get(cache_key)
      if is_allowed is not None:
        return is_allowed
    except Exception as cache_err:
      logger.warning(f"Cache lookup failed for CORS check of {domain}: {cache_err}")
      is_allowed = None

    from monitor.models import Endpoints, MonitoredService, ValidatedSite

    # Check ValidatedSite by domain
    if ValidatedSite.objects.filter(domain=domain).exists():
      try:
        cache.set(cache_key, True, timeout=3600)
      except Exception:
        pass
      return True

    # For URLs in the database, we can check if they match the domain or the full origin
    q_exact_origin = Q(url=origin)
    q_slash_origin = Q(url__startswith=origin + "/")
    q_domain = Q(url__icontains=domain)

    if Endpoints.objects.filter(q_exact_origin | q_slash_origin | q_domain).exists():
      try:
        cache.set(cache_key, True, timeout=3600)
      except Exception:
        pass
      return True

    if MonitoredService.objects.filter(q_exact_origin | q_slash_origin | q_domain).exists():
      try:
        cache.set(cache_key, True, timeout=3600)
      except Exception:
        pass
      return True

    # Cache the miss for 1 hour as well to prevent DB spam on repeated failures
    try:
      cache.set(cache_key, False, timeout=3600)
    except Exception:
      pass
    return False
  except Exception as e:
    logger.error(f"Error checking dynamic CORS origin {origin}: {e}")
    return False
