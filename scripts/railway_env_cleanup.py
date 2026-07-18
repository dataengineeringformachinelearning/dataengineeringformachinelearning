#!/usr/bin/env python3
"""Remove Infisical-style variable pollution from Railway services that do not need them.

Keeps the full backend bundle on Django API + workers only. Infrastructure services
(dragonfly, postgres, queue, etc.) get a minimal whitelist. Frontend gets build/runtime
vars only — never Django secrets or service-account JSON.

For role/required/forbidden alignment against the canonical catalog, prefer:

  python scripts/railway_audit.py
  python scripts/railway_audit.py --apply

See infrastructure/railway/services.json (source of truth) and
infrastructure/railway/README.md (agent playbook). Retired: deml-daemon, deml-cpe-guesser.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Final

RAILWAY_BIN: Final = "railway"
CATALOG_PATH: Final = Path(__file__).resolve().parents[1] / "infrastructure/railway/services.json"
FULL_ENV_CLASSES: Final[frozenset[str]] = frozenset(
  {"django-api", "django-user-control-plane", "django-worker", "rust-data-plane"}
)

# Railway Postgres plugin vars leaked onto app services during deml-postgres references.
# DATABASE_URL must stay (Neon); everything else is stale pollution.
BACKEND_PG_POLLUTION: Final[frozenset[str]] = frozenset(
  {
    "ALPINE_DATABASE_MODE",
    "ALPINE_DATABASE_PASSWORD",
    "ALPINE_DATABASE_URL",
    "ALPINE_DATABASE_USERNAME",
    "PGDATA",
    "PGDATABASE",
    "PGHOST",
    "PGPASSWORD",
    "PGPORT",
    "PGUSER",
    "POSTGRES_DB",
    "POSTGRES_PASSWORD",
    "POSTGRES_USER",
  }
)

FRONTEND_KEEP: Final[frozenset[str]] = frozenset(
  {
    "FIREBASE_API_KEY",
    "FIREBASE_APP_ID",
    "FIREBASE_AUTH_DOMAIN",
    "FIREBASE_MESSAGING_SENDER_ID",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_STORAGE_BUCKET",
    "FRONTEND_URL",
    "BACKEND_URL",
    "MARKETING_URL",
    "SANITY_PROJECT_ID",
    "SANITY_DATASET",
    "SENTRY_DSN",
    "SENTRY_SEND_PII",
  }
)

QUEUE_KEEP: Final[frozenset[str]] = frozenset(
  {
    "PUBLIC_REDPANDA_HOST",
    "PUBLIC_REDPANDA_PORT",
    "REDPANDA_SASL_USERNAME",
    "REDPANDA_SASL_PASSWORD",
    "REDPANDA_BROKERS",
  }
)

CLICKHOUSE_KEEP: Final[frozenset[str]] = frozenset(
  {
    "CLICKHOUSE_DB",
    "CLICKHOUSE_HOST",
    "CLICKHOUSE_PASSWORD",
    "CLICKHOUSE_PORT",
    "CLICKHOUSE_USER",
    "CLICKHOUSE_URI",
  }
)

SCANNER_KEEP: Final[frozenset[str]] = frozenset(
  {
    "NVD_API_KEY",
    "OSV_DB_PATH",
    "CPE_GUESSER_URL",
  }
)

OPTIONAL_KEEP: Final[dict[str, frozenset[str]]] = {
  "deml-frontend": FRONTEND_KEEP,
  "deml-queue": QUEUE_KEEP,
  "deml-clickhouse": CLICKHOUSE_KEEP,
  "deml-scanner": SCANNER_KEEP,
}


def _load_catalog() -> dict[str, dict[str, Any]]:
  with CATALOG_PATH.open(encoding="utf-8") as catalog_file:
    catalog = json.load(catalog_file)
  return catalog["services"]


def _railway_vars(service: str) -> dict[str, str]:
  result = subprocess.run(
    [RAILWAY_BIN, "variables", "--service", service, "--json"],
    capture_output=True,
    text=True,
    check=True,
  )
  return json.loads(result.stdout)


def _should_keep(key: str, keep: frozenset[str]) -> bool:
  if key.startswith("RAILWAY_"):
    return True
  if key == "PORT":
    return key in keep
  return key in keep


def _delete_var(service: str, key: str, dry_run: bool) -> bool:
  if dry_run:
    return True
  result = subprocess.run(
    [RAILWAY_BIN, "variable", "delete", key, "--service", service, "--json"],
    capture_output=True,
    text=True,
  )
  if result.returncode != 0:
    print(f"  WARN delete {service}/{key}: {result.stderr.strip()}", file=sys.stderr)
    return False
  return True


def cleanup_backend_pg_pollution(service: str, dry_run: bool) -> tuple[int, int]:
  """Remove Railway Postgres plugin vars that leaked onto app services."""
  vars_map = _railway_vars(service)
  to_delete = [k for k in sorted(vars_map) if k in BACKEND_PG_POLLUTION]
  deleted = 0
  for key in to_delete:
    prefix = "[dry-run] " if dry_run else ""
    print(f"{prefix}DELETE {service}: {key}")
    if _delete_var(service, key, dry_run):
      deleted += 1
  return len(to_delete), deleted


def cleanup_service(
  service: str, service_config: dict[str, Any] | None, dry_run: bool
) -> tuple[int, int]:
  if service_config is None:
    print(f"SKIP service absent from canonical catalog: {service}")
    return 0, 0

  if service_config["class"] in FULL_ENV_CLASSES:
    return cleanup_backend_pg_pollution(service, dry_run)

  catalog_keep = set(service_config.get("requiredEnv", []))
  catalog_keep.update(service_config.get("envDefaults", {}).keys())
  keep = frozenset(catalog_keep) | OPTIONAL_KEEP.get(service, frozenset())

  vars_map = _railway_vars(service)
  to_delete = [k for k in sorted(vars_map) if not _should_keep(k, keep)]
  deleted = 0
  for key in to_delete:
    prefix = "[dry-run] " if dry_run else ""
    print(f"{prefix}DELETE {service}: {key}")
    if _delete_var(service, key, dry_run):
      deleted += 1
  return len(to_delete), deleted


def main() -> None:
  dry_run = "--dry-run" in sys.argv
  catalog = _load_catalog()
  services = sorted(catalog)
  if "--service" in sys.argv:
    idx = sys.argv.index("--service")
    services = [sys.argv[idx + 1]]

  total = 0
  removed = 0
  for svc in services:
    print(f"\n=== {svc} ===")
    n, d = cleanup_service(svc, catalog.get(svc), dry_run)
    print(f"  -> {d}/{n} removed")
    total += n
    removed += d

  print(f"\nDone: {removed}/{total} variables removed" + (" (dry-run)" if dry_run else ""))


if __name__ == "__main__":
  main()
