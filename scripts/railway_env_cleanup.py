#!/usr/bin/env python3
"""Remove Infisical-style variable pollution from Railway services that do not need them.

Keeps the full backend bundle on Django API + workers only. Infrastructure services
(dragonfly, postgres, queue, etc.) get a minimal whitelist. Frontend gets build/runtime
vars only — never Django secrets or service-account JSON.
"""

from __future__ import annotations

import json
import subprocess
import sys
from typing import Final

RAILWAY_BIN: Final = "railway"

# Services that run Django/Rust workers and need the full backend env bundle.
BACKEND_SERVICES: Final[frozenset[str]] = frozenset(
  {
    "deml-backend",
    "deml-workers",
    "deml-telemetry-worker",
    "deml-daemon",
  }
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

DTRACK_KEEP: Final[frozenset[str]] = frozenset(
  {
    "ALPINE_DATABASE_MODE",
    "ALPINE_DATABASE_PASSWORD",
    "ALPINE_DATABASE_URL",
    "ALPINE_DATABASE_USERNAME",
  }
)

OTEL_KEEP: Final[frozenset[str]] = frozenset(
  {
    "CLICKHOUSE_DB",
    "CLICKHOUSE_HOST",
    "CLICKHOUSE_PASSWORD",
    "CLICKHOUSE_PORT",
    "CLICKHOUSE_USER",
    "PORT",
  }
)

INFRA_EMPTY: Final[frozenset[str]] = frozenset()  # dragonfly, tor-proxy, cpe-guesser

SERVICE_KEEP: Final[dict[str, frozenset[str]]] = {
  "deml-frontend": FRONTEND_KEEP,
  "deml-queue": QUEUE_KEEP,
  "deml-clickhouse": CLICKHOUSE_KEEP,
  "deml-scanner": SCANNER_KEEP,
  "deml-dtrack-api": DTRACK_KEEP,
  "deml-otel-collector": OTEL_KEEP,
  "deml-dragonfly": INFRA_EMPTY,
  "deml-tor-proxy": INFRA_EMPTY,
  "deml-cpe-guesser": INFRA_EMPTY,
}


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
    return False  # never keep manual PORT except otel (handled via keep set)
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


def cleanup_service(service: str, dry_run: bool) -> tuple[int, int]:
  if service in BACKEND_SERVICES:
    return cleanup_backend_pg_pollution(service, dry_run)

  keep = SERVICE_KEEP.get(service)
  if keep is None:
    print(f"SKIP unknown service: {service}")
    return 0, 0

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
  services = sorted(set(SERVICE_KEEP.keys()) | BACKEND_SERVICES)
  if "--service" in sys.argv:
    idx = sys.argv.index("--service")
    services = [sys.argv[idx + 1]]

  total = 0
  removed = 0
  for svc in services:
    print(f"\n=== {svc} ===")
    n, d = cleanup_service(svc, dry_run)
    print(f"  -> {d}/{n} removed")
    total += n
    removed += d

  print(f"\nDone: {removed}/{total} variables removed" + (" (dry-run)" if dry_run else ""))


if __name__ == "__main__":
  main()
