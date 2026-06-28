"""
Centralized environment variable helpers.

All services (Django API, workers, management commands) should read dynamic
configuration through these helpers or django.conf.settings — never hardcode
production URLs, broker hosts, or secrets in application code.
"""

from __future__ import annotations

import os

# Insecure Django default — must never ship to production unchanged.
_INSECURE_SECRET_KEY = (
  "django-insecure-izn^)q(e0k=rklyawiv0*4(unp)%4%@v54**mnt!@tw!thaub9"  # pragma: allowlist secret
)


def get_str(name: str, default: str = "") -> str:
  """Return a stripped env string."""
  return (os.getenv(name) or default).strip()


def get_bool(name: str, default: bool = False) -> bool:
  """Return True when env is truthy (true/1/yes)."""
  raw = os.getenv(name)
  if raw is None:
    return default
  return raw.strip().lower() in ("true", "1", "yes", "on")


def get_int(name: str, default: int) -> int:
  """Parse an integer env var with fallback."""
  raw = os.getenv(name)
  if raw is None or not raw.strip():
    return default
  try:
    return int(raw.strip())
  except ValueError:
    return default


def get_csv(name: str) -> list[str]:
  """Split a comma-separated env var into a cleaned list."""
  raw = get_str(name)
  if not raw:
    return []
  return [item.strip() for item in raw.split(",") if item.strip()]


def is_railway_deploy() -> bool:
  """True when running on Railway (any environment)."""
  return bool(get_str("RAILWAY_ENVIRONMENT") or get_str("RAILWAY_SERVICE_NAME"))


def is_production() -> bool:
  """True when explicitly in production or on Railway with DEBUG disabled."""
  if get_str("RAILWAY_ENVIRONMENT").lower() == "production":
    return True
  return not get_bool("DEBUG", default=True) and is_railway_deploy()


def validate_production_config() -> None:
  """
  Fail fast when production/Railway deploy uses insecure defaults.
  Called from settings.py before the app boots.
  """
  if not is_railway_deploy() and get_bool("DEBUG", default=True):
    return

  secret = get_str("SECRET_KEY", _INSECURE_SECRET_KEY)
  if not secret or secret == _INSECURE_SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be set to a unique value in production/Railway.")

  if get_bool("DEBUG", default=True):
    raise RuntimeError("DEBUG must be False in production/Railway.")


_SITE_URL_VARS: tuple[str, ...] = ("FRONTEND_URL", "BACKEND_URL", "MARKETING_URL")


def validate_site_urls() -> None:
  """Fail fast when cross-site URL trio is missing (no silent production defaults)."""
  missing = [name for name in _SITE_URL_VARS if not get_str(name)]
  if missing:
    raise RuntimeError(
      "Missing required environment variable(s): "
      f"{', '.join(missing)}. Copy backend/.env.example to backend/.env and set values."
    )


def tor_proxy_url() -> str:
  """SOCKS5 proxy for dark-web OSINT (Tor). Override via TOR_PROXY_URL."""
  return get_str("TOR_PROXY_URL", "socks5h://deml-tor-proxy.railway.internal:9050")


def scanner_service_url() -> str:
  """CVE scanner internal service URL."""
  return get_str("SCANNER_SERVICE_URL", "http://deml-scanner.railway.internal:8000")


def cpe_guesser_url() -> str:
  """CPE guesser internal service URL."""
  return get_str("CPE_GUESSER_URL", "http://deml-cpe-guesser.railway.internal:1323/unique")


def clickhouse_uri() -> str:
  """ClickHouse connection URI for OLAP tooling."""
  return get_str(
    "CLICKHOUSE_URI",
    "clickhouse://default:@clickhouse:8123/default",
  )
