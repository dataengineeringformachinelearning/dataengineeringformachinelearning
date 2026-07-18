"""Fail-closed dynamic CORS lookup for DEML-owned customer domains."""

from __future__ import annotations

import logging
from typing import Final
from urllib.parse import urlsplit

from django.conf import settings
from django.core.cache import cache
from django.db import DatabaseError

from monitor.models import ValidatedSite

logger = logging.getLogger(__name__)

CACHE_TIMEOUT_SECONDS: Final[int] = 3600

# Always-allowed product / local origins (not customer tenant domains).
PLATFORM_HOSTNAMES: Final[frozenset[str]] = frozenset(
  {
    "deml.app",
    "www.deml.app",
    "dataengineeringformachinelearning.com",
    "www.dataengineeringformachinelearning.com",
    "localhost",
    "127.0.0.1",
  }
)


def _origin_hostname(origin: str) -> str | None:
  try:
    parsed = urlsplit(origin.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
      return None
    return parsed.hostname.rstrip(".").encode("idna").decode("ascii").lower()
  except (UnicodeError, ValueError):
    return None


def _static_allowed_hostnames() -> set[str]:
  hosts: set[str] = set(PLATFORM_HOSTNAMES)
  for origin in getattr(settings, "CORS_ALLOWED_ORIGINS", []) or []:
    host = _origin_hostname(str(origin))
    if host is not None:
      hosts.add(host)
  return hosts


def is_domain_registered(origin: str) -> bool:
  """Allow platform/static origins, otherwise only verified ValidatedSite hosts."""
  domain = _origin_hostname(origin)
  if domain is None:
    return False

  if domain in _static_allowed_hostnames():
    return True

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
