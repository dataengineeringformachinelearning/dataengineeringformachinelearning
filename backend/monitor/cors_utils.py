"""Fail-closed dynamic CORS lookup for DEML-owned customer domains."""

from __future__ import annotations

import logging
from typing import Final
from urllib.parse import urlsplit

from django.core.cache import cache
from django.db import DatabaseError

from monitor.models import ValidatedSite

logger = logging.getLogger(__name__)

CACHE_TIMEOUT_SECONDS: Final[int] = 3600


def _origin_hostname(origin: str) -> str | None:
  try:
    parsed = urlsplit(origin.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
      return None
    return parsed.hostname.rstrip(".").encode("idna").decode("ascii").lower()
  except (UnicodeError, ValueError):
    return None


def is_domain_registered(origin: str) -> bool:
  """Return true only for a verified database-backed origin hostname."""
  domain = _origin_hostname(origin)
  if domain is None:
    return False

  cache_key = f"cors_origin_allowed:{domain}"
  try:
    cached = cache.get(cache_key)
  except Exception:
    logger.exception("Dynamic CORS cache lookup failed for %s", domain)
    cached = None
  if cached is not None:
    return bool(cached)

  try:
    is_allowed = ValidatedSite.objects.filter(
      domain__iexact=domain,
      is_verified=True,
    ).exists()
  except DatabaseError:
    logger.exception("Dynamic CORS lookup failed for %s", domain)
    return False

  try:
    cache.set(cache_key, is_allowed, timeout=CACHE_TIMEOUT_SECONDS)
  except Exception:
    logger.exception("Dynamic CORS cache write failed for %s", domain)
  return is_allowed
