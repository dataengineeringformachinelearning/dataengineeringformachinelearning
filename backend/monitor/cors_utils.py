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
  except Exception:
    return False

  cache_key = f"cors_origin_allowed:{domain}"
  is_allowed = cache.get(cache_key)

  if is_allowed is not None:
    return is_allowed

  try:
    from monitor.models import Endpoints, MonitoredService, Tenant, ValidatedSite

    # Check ValidatedSite by domain
    if ValidatedSite.objects.filter(domain=domain).exists():
      cache.set(cache_key, True, timeout=3600)
      return True

    # For URLs in the database, we can check if they match the domain or the full origin
    q_exact_origin = Q(url=origin)
    q_slash_origin = Q(url__startswith=origin + "/")
    q_domain = Q(url__icontains=domain)

    if Endpoints.objects.filter(q_exact_origin | q_slash_origin | q_domain).exists():
      cache.set(cache_key, True, timeout=3600)
      return True

    if MonitoredService.objects.filter(q_exact_origin | q_slash_origin | q_domain).exists():
      cache.set(cache_key, True, timeout=3600)
      return True

    q_target_exact = Q(target_url=origin)
    q_target_slash = Q(target_url__startswith=origin + "/")
    q_target_domain = Q(target_url__icontains=domain)

    if Tenant.objects.filter(q_target_exact | q_target_slash | q_target_domain).exists():
      cache.set(cache_key, True, timeout=3600)
      return True

    # Cache the miss for 1 hour as well to prevent DB spam on repeated failures
    cache.set(cache_key, False, timeout=3600)
    return False
  except Exception as e:
    logger.error(f"Error checking DB for dynamic CORS origin {domain}: {e}")
    return False
