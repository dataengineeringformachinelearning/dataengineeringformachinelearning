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

# Always-allowed product origins (not customer tenant domains).
# Localhost/loopback are DEBUG-only — never auto-allow in production.
_PLATFORM_HOSTNAMES_PROD: Final[frozenset[str]] = frozenset(
  {
    "deml.app",
    "www.deml.app",
    "dataengineeringformachinelearning.com",
    "www.dataengineeringformachinelearning.com",
  }
)
_PLATFORM_HOSTNAMES_DEV: Final[frozenset[str]] = frozenset({"localhost", "127.0.0.1"})


def _platform_hostnames() -> frozenset[str]:
  if getattr(settings, "DEBUG", False):
    return _PLATFORM_HOSTNAMES_PROD | _PLATFORM_HOSTNAMES_DEV
  return _PLATFORM_HOSTNAMES_PROD


def _parse_origin(origin: str) -> tuple[str, str, int | None] | None:
  """Return (scheme, hostname, port) or None when the Origin is unusable."""
  try:
    parsed = urlsplit(origin.strip())
  except ValueError:
    return None
  scheme = (parsed.scheme or "").lower()
  if scheme not in {"http", "https"} or not parsed.hostname:
    return None
  try:
    host = parsed.hostname.rstrip(".").encode("idna").decode("ascii").lower()
  except (UnicodeError, ValueError):
    return None
  return scheme, host, parsed.port


def _scheme_port_allowed(scheme: str, host: str, port: int | None) -> bool:
  """Credentialed CORS must bind scheme (and default ports) — not hostname alone."""
  debug = bool(getattr(settings, "DEBUG", False))
  if not debug:
    return scheme == "https" and port in {None, 443}
  if host in _PLATFORM_HOSTNAMES_DEV:
    if scheme == "http":
      return port in {None, 80, 4200, 5173, 8000, 8080}
    return scheme == "https" and port in {None, 443}
  return scheme == "https" and port in {None, 443}


def _static_allowed_hostnames() -> set[str]:
  hosts: set[str] = set(_platform_hostnames())
  for origin in getattr(settings, "CORS_ALLOWED_ORIGINS", []) or []:
    parsed = _parse_origin(str(origin))
    if parsed is not None:
      hosts.add(parsed[1])
  return hosts


def is_domain_registered(origin: str) -> bool:
  """Allow platform/static origins, otherwise only verified ValidatedSite hosts."""
  parsed = _parse_origin(origin)
  if parsed is None:
    return False
  scheme, domain, port = parsed
  if not _scheme_port_allowed(scheme, domain, port):
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
