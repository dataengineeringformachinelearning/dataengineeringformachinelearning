"""
Centralized environment variable helpers.

All services (Django API, workers, management commands) should read dynamic
configuration through these helpers or django.conf.settings — never hardcode
production URLs, broker hosts, or secrets in application code.
"""

from __future__ import annotations

import os
from urllib.parse import parse_qs, urlparse

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


def get_float(name: str, default: float) -> float:
  """Parse a floating-point env var with fallback."""
  raw = os.getenv(name)
  if raw is None or not raw.strip():
    return default
  try:
    return float(raw.strip())
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


_POSTGRES_SCHEMES: tuple[str, ...] = ("postgres://", "postgresql://")

_VALID_DB_SCHEMES: tuple[str, ...] = (
  "sqlite://",
  *_POSTGRES_SCHEMES,
  "mysql://",
  "cockroach://",
  "oracle://",
  "redshift://",
  "mssql://",
)


def configure_database_url() -> None:
  """
  Ensure DATABASE_URL is set for Django.

  Local development may fall back to SQLite. Railway/production require PostgreSQL.
  """
  db_url = get_str("DATABASE_URL")
  if db_url and any(db_url.startswith(scheme) for scheme in _VALID_DB_SCHEMES):
    return

  if is_railway_deploy():
    if not db_url:
      raise RuntimeError(
        "DATABASE_URL must be set on Railway (PostgreSQL required). "
        "Attach a Postgres plugin or set DATABASE_URL on this service."
      )
    raise RuntimeError(
      f"DATABASE_URL has an unsupported scheme on Railway: {db_url.split(':', 1)[0]}:. "
      "Use postgres:// or postgresql://."
    )

  from pathlib import Path

  base_dir = Path(__file__).resolve().parent.parent
  os.environ["DATABASE_URL"] = f"sqlite:///{base_dir / 'db.sqlite3'}"


def validate_production_config() -> None:
  """
  Fail fast when production/Railway deploy uses insecure defaults.
  Called from settings.py before the app boots.
  """
  # Railway auto-injects RAILWAY_SERVICE_NAME; treat unset DEBUG as production-safe False.
  if is_railway_deploy() and os.getenv("DEBUG") is None:
    os.environ["DEBUG"] = "False"

  if not is_railway_deploy() and get_bool("DEBUG", default=True):
    return

  secret = get_str("SECRET_KEY", _INSECURE_SECRET_KEY)
  if not secret or secret == _INSECURE_SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be set to a unique value in production/Railway.")

  if is_railway_deploy() and get_bool("DEBUG", default=False):
    raise RuntimeError("DEBUG must be False in production/Railway.")

  db_url = get_str("DATABASE_URL")
  if is_railway_deploy():
    if not db_url:
      raise RuntimeError(
        "DATABASE_URL must be set on Railway (PostgreSQL required). "
        "Attach a Postgres plugin or set DATABASE_URL on this service."
      )
    if db_url.startswith("sqlite://"):
      raise RuntimeError("SQLite is not supported on Railway; set DATABASE_URL to PostgreSQL.")
    if not db_url.startswith(_POSTGRES_SCHEMES):
      raise RuntimeError("DATABASE_URL on Railway must use postgres:// or postgresql:// scheme.")

  validate_encrypted_transport_config()


def validate_encrypted_transport_config() -> None:
  """Fail closed when a production service-to-service connection is not encrypted."""
  if not is_production():
    return
  policy = get_str("DEML_TRANSPORT_SECURITY", "required").lower()
  if policy != "required":
    raise RuntimeError("DEML_TRANSPORT_SECURITY must be required in production.")

  db_url = get_str("DATABASE_URL")
  if db_url.startswith(_POSTGRES_SCHEMES):
    sslmode = parse_qs(urlparse(db_url).query).get("sslmode", [""])[0].lower()
    if sslmode not in {"verify-ca", "verify-full"}:
      raise RuntimeError(
        "production DATABASE_URL must set sslmode=verify-ca or sslmode=verify-full."
      )

  if not get_str("REDIS_URL"):
    raise RuntimeError("production REDIS_URL is required and must use rediss://.")
  for name in ("REDIS_URL", "CPE_REDIS_URL"):
    value = get_str(name)
    if value and not value.lower().startswith("rediss://"):
      raise RuntimeError(f"production {name} must use rediss:// with certificate verification.")

  if get_str("REDPANDA_BROKERS"):
    protocol = get_str("REDPANDA_SECURITY_PROTOCOL", "SASL_SSL").upper()
    if protocol not in {"SSL", "SASL_SSL"}:
      raise RuntimeError("production Redpanda transport must use SSL or SASL_SSL.")

  for name in (
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    "SCANNER_SERVICE_URL",
    "CPE_GUESSER_URL",
    "FIRECRAWL_API_URL",
  ):
    value = get_str(name)
    if value and not value.lower().startswith("https://"):
      raise RuntimeError(f"production {name} must use https://.")


def tor_proxy_url() -> str:
  """SOCKS5 proxy for dark-web OSINT (Tor). Override via TOR_PROXY_URL."""
  return get_str("TOR_PROXY_URL", "socks5h://deml-tor-proxy.railway.internal:9050")


def scanner_service_url() -> str:
  """CVE scanner internal service URL."""
  default = "" if is_production() else "http://localhost:8000"
  return get_str("SCANNER_SERVICE_URL", default)


def cpe_guesser_url() -> str:
  """Rust CPE lookup service URL."""
  default = "" if is_production() else "http://localhost:8080/unique"
  return get_str("CPE_GUESSER_URL", default)


def firecrawl_api_url() -> str:
  """Managed or self-hosted Firecrawl API base URL."""
  return get_str("FIRECRAWL_API_URL", "https://api.firecrawl.dev")


def clickhouse_uri() -> str:
  """ClickHouse connection URI for OLAP tooling."""
  return get_str(
    "CLICKHOUSE_URI",
    "clickhouse://default:@clickhouse:8123/default",
  )


def rustfs_endpoint() -> str:
  """S3 API endpoint for the RustFS report object store."""
  default = "" if is_production() else "http://localhost:9100"
  return get_str("RUSTFS_ENDPOINT", default)
