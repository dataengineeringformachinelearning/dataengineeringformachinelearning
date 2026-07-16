"""Purge old archived data from ClickHouse based on retention policies.

ClickHouse retention schedule (from utils/retention.py):
- audit_archive: CH_AUDIT_ARCHIVE_RETENTION_DAYS (180) retention
- security_events: CH_SECURITY_EVENTS_RETENTION_DAYS (365) retention
- asset_vulnerability_ledger: 730 days (2 years)
- otel_traces/metrics: TTL managed by ClickHouse MergeTree (730+ days)

NOTE: This command is now Rust-native. The deml-daemon:scheduler executes
run_cleanup_clickhouse directly. This file remains as fallback for PYTHON_EMBEDDED_SCHEDULERS_ENABLED=1.
"""

from __future__ import annotations

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from utils.clickhouse import ensure_retention_tables, execute_clickhouse_http
from utils.env import clickhouse_uri
from utils.retention import (
  CH_AUDIT_ARCHIVE_RETENTION_DAYS,
  CH_SECURITY_EVENTS_RETENTION_DAYS,
  CH_TELEMETRY_RETENTION_DAYS,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
  help = "Clean up old data from ClickHouse archival storage"

  def handle(self, *args, **options):
    uri = clickhouse_uri()
    purged_any = False
    failures: list[str] = []
    ensure_retention_tables(uri=uri)

    # Purge audit_archive (CH_AUDIT_ARCHIVE_RETENTION_DAYS = 180)
    audit_cutoff = (timezone.now() - timedelta(days=CH_AUDIT_ARCHIVE_RETENTION_DAYS)).date()
    try:
      query = f"DELETE FROM audit_archive WHERE timestamp < '{audit_cutoff}'"
      execute_clickhouse_http(query, uri=uri)
      self.stdout.write(self.style.SUCCESS(f"Purged audit_archive before {audit_cutoff}"))
      purged_any = True
    except Exception as e:
      logger.warning("ClickHouse audit_archive cleanup skipped: %s", e)
      failures.append(f"audit_archive: {e}")

    # Purge security_events (CH_SECURITY_EVENTS_RETENTION_DAYS = 365)
    security_cutoff = (timezone.now() - timedelta(days=CH_SECURITY_EVENTS_RETENTION_DAYS)).date()
    try:
      query = f"DELETE FROM security_events WHERE timestamp < '{security_cutoff}'"
      execute_clickhouse_http(query, uri=uri)
      self.stdout.write(self.style.SUCCESS(f"Purged security_events before {security_cutoff}"))
      purged_any = True
    except Exception as e:
      logger.warning("ClickHouse security_events cleanup skipped: %s", e)
      failures.append(f"security_events: {e}")

    # Purge asset_vulnerability_ledger (2 years for vulnerability history)
    vuln_cutoff = (timezone.now() - timedelta(days=CH_TELEMETRY_RETENTION_DAYS)).date()
    try:
      query = f"DELETE FROM asset_vulnerability_ledger WHERE timestamp < '{vuln_cutoff}'"
      execute_clickhouse_http(query, uri=uri)
      self.stdout.write(
        self.style.SUCCESS(f"Purged asset_vulnerability_ledger before {vuln_cutoff}")
      )
      purged_any = True
    except Exception as e:
      logger.warning("ClickHouse asset_vulnerability_ledger cleanup skipped: %s", e)
      failures.append(f"asset_vulnerability_ledger: {e}")

    if failures:
      raise CommandError("ClickHouse cleanup failed: " + "; ".join(failures))

    if not purged_any:
      self.stdout.write("ClickHouse cleanup ran (no tables purged).")

    self.stdout.write(self.style.SUCCESS("ClickHouse cleanup completed."))
