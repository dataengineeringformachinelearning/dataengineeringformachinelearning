"""
Centralized environment variable helpers.

The Django user control plane reads configuration through these helpers or
django.conf.settings. FORJD owns all data-plane configuration.
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


def is_fly_deploy() -> bool:
  """True when running on Fly.io (FLY_APP_NAME is injected on every machine)."""
  return bool(get_str("FLY_APP_NAME") or get_str("FLY_MACHINE_ID"))


def is_paas_deploy() -> bool:
  """True on Railway or Fly.io (production-class hosts)."""
  return is_railway_deploy() or is_fly_deploy()


def is_production() -> bool:
  """True when explicitly in production or on PaaS with DEBUG disabled."""
  if get_str("RAILWAY_ENVIRONMENT").lower() == "production":
    return True
  if is_fly_deploy() and not get_bool("DEBUG", default=False):
    return True
  return not get_bool("DEBUG", default=True) and is_paas_deploy()


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

  Local development may fall back to SQLite. Railway/Fly require PostgreSQL.
  Production uses Supabase with DATABASE_SEARCH_PATH=partner_control,public
  (FORJD docs/NEON_TO_SUPABASE_ETL.md).
  """
  db_url = get_str("DATABASE_URL")
  if db_url and any(db_url.startswith(scheme) for scheme in _VALID_DB_SCHEMES):
    return

  if is_paas_deploy():
    host = "Fly.io" if is_fly_deploy() else "Railway"
    if not db_url:
      raise RuntimeError(
        f"DATABASE_URL must be set on {host} (PostgreSQL required). "
        "Use Neon or Supabase pooler URI (sslmode=verify-full)."
      )
    raise RuntimeError(
      f"DATABASE_URL has an unsupported scheme on {host}: {db_url.split(':', 1)[0]}:. "
      "Use postgres:// or postgresql://."
    )

  from pathlib import Path

  base_dir = Path(__file__).resolve().parent.parent
  os.environ["DATABASE_URL"] = f"sqlite:///{base_dir / 'db.sqlite3'}"


def apply_database_search_path(databases: dict) -> None:
  """Optional ``DATABASE_SEARCH_PATH`` for Supabase schema isolation (e.g. deml,public)."""
  search_path = get_str("DATABASE_SEARCH_PATH", "").strip()
  if not search_path:
    return
  # Allow only simple schema identifiers / commas / spaces.
  cleaned = "".join(ch for ch in search_path if ch.isalnum() or ch in {",", "_", " "})
  cleaned = ",".join(part.strip() for part in cleaned.split(",") if part.strip())
  if not cleaned:
    return
  default = databases.get("default")
  if not isinstance(default, dict):
    return
  options = default.setdefault("OPTIONS", {})
  # libpq options: -c search_path=deml,public
  existing = str(options.get("options") or "").strip()
  flag = f"-c search_path={cleaned}"
  options["options"] = f"{existing} {flag}".strip() if existing else flag


def validate_production_config() -> None:
  """
  Fail fast when production/PaaS deploy uses insecure defaults.
  Called from settings.py before the app boots.
  """
  # PaaS injects platform vars; treat unset DEBUG as production-safe False.
  if is_paas_deploy() and os.getenv("DEBUG") is None:
    os.environ["DEBUG"] = "False"

  if not is_paas_deploy() and get_bool("DEBUG", default=True):
    return

  host = "Fly.io" if is_fly_deploy() else "Railway" if is_railway_deploy() else "production"

  secret = get_str("SECRET_KEY", _INSECURE_SECRET_KEY)
  if not secret or secret == _INSECURE_SECRET_KEY:
    raise RuntimeError(f"SECRET_KEY must be set to a unique value on {host}.")

  if is_paas_deploy() and get_bool("DEBUG", default=False):
    raise RuntimeError(f"DEBUG must be False on {host}.")

  db_url = get_str("DATABASE_URL")
  if is_paas_deploy():
    if not db_url:
      raise RuntimeError(
        f"DATABASE_URL must be set on {host} (PostgreSQL required). "
        "Neon is fine temporarily; prefer Supabase pooler after consolidation."
      )
    if db_url.startswith("sqlite://"):
      raise RuntimeError(f"SQLite is not supported on {host}; set DATABASE_URL to PostgreSQL.")
    if not db_url.startswith(_POSTGRES_SCHEMES):
      raise RuntimeError(f"DATABASE_URL on {host} must use postgres:// or postgresql:// scheme.")

  # Fly control plane must be wired to FORJD for streaming/processing.
  if is_fly_deploy():
    if not get_str("FORJD_API_URL").lower().startswith("https://"):
      raise RuntimeError("Fly deploy requires FORJD_API_URL=https://… (FORJD data plane).")
    if not get_str("FORJD_SERVICE_TOKEN"):
      raise RuntimeError("Fly deploy requires FORJD_SERVICE_TOKEN (fjsvc_…).")
    if not get_str("FORJD_TENANT_ID"):
      raise RuntimeError("Fly deploy requires FORJD_TENANT_ID (UUID).")

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
    parsed = urlparse(db_url)
    sslmode = parse_qs(parsed.query).get("sslmode", [""])[0].lower()
    host = (parsed.hostname or "").lower()
    # Supabase pooler/direct often fails libpq verify-full against distro CAs;
    # require still enforces TLS. Neon and other hosts keep verify-ca/full.
    supabase_host = host.endswith(".supabase.co") or host.endswith(".pooler.supabase.com")
    allowed = {"verify-ca", "verify-full"}
    if supabase_host:
      allowed.add("require")
    if sslmode not in allowed:
      raise RuntimeError(
        "production DATABASE_URL must set sslmode=verify-ca or sslmode=verify-full"
        + (" (or require for Supabase hosts)" if supabase_host else "")
        + "."
      )

  # REDIS_URL is optional (deml-dragonfly retired). If set, require TLS.
  redis_url = get_str("REDIS_URL")
  if redis_url and not redis_url.lower().startswith("rediss://"):
    raise RuntimeError("production REDIS_URL must use rediss:// with certificate verification.")

  for name in ("OTEL_EXPORTER_OTLP_ENDPOINT", "FORJD_API_URL"):
    value = get_str(name)
    if value and not value.lower().startswith("https://"):
      raise RuntimeError(f"production {name} must use https://.")
