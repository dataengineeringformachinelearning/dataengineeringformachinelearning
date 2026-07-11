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
import urllib.error
import urllib.request
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
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

    # Convert adbc URI to HTTP endpoint
    http_url = uri.replace("clickhouse://", "http://").replace(":9000/", ":8123/").rstrip("/")

    # Purge audit_archive (CH_AUDIT_ARCHIVE_RETENTION_DAYS = 180)
    audit_cutoff = (timezone.now() - timedelta(days=CH_AUDIT_ARCHIVE_RETENTION_DAYS)).date()
    try:
      query = f"DELETE FROM audit_archive WHERE timestamp < '{audit_cutoff}'"
      self._execute_http_query(http_url, query)
      self.stdout.write(self.style.SUCCESS(f"Purged audit_archive before {audit_cutoff}"))
      purged_any = True
    except Exception as e:
      logger.warning("ClickHouse audit_archive cleanup skipped: %s", e)

    # Purge security_events (CH_SECURITY_EVENTS_RETENTION_DAYS = 365)
    security_cutoff = (timezone.now() - timedelta(days=CH_SECURITY_EVENTS_RETENTION_DAYS)).date()
    try:
      query = f"DELETE FROM security_events WHERE timestamp < '{security_cutoff}'"
      self._execute_http_query(http_url, query)
      self.stdout.write(self.style.SUCCESS(f"Purged security_events before {security_cutoff}"))
      purged_any = True
    except Exception as e:
      logger.warning("ClickHouse security_events cleanup skipped: %s", e)

    # Purge asset_vulnerability_ledger (2 years for vulnerability history)
    vuln_cutoff = (timezone.now() - timedelta(days=CH_TELEMETRY_RETENTION_DAYS)).date()
    try:
      query = f"DELETE FROM asset_vulnerability_ledger WHERE timestamp < '{vuln_cutoff}'"
      self._execute_http_query(http_url, query)
      self.stdout.write(
        self.style.SUCCESS(f"Purged asset_vulnerability_ledger before {vuln_cutoff}")
      )
      purged_any = True
    except Exception as e:
      logger.debug("ClickHouse asset_vulnerability_ledger cleanup skipped: %s", e)

    if not purged_any:
      self.stdout.write("ClickHouse cleanup ran (no tables purged).")

    self.stdout.write(self.style.SUCCESS("ClickHouse cleanup completed."))

  def _execute_http_query(self, base_url: str, query: str) -> None:
    """Execute a ClickHouse query via HTTP interface."""
    url = f"{base_url}/?query={query}&default_week_start=0"
    req = urllib.request.Request(url, method="POST")
    with urllib.request.urlopen(req, timeout=30) as response:
      if response.status != 200:
        raise RuntimeError(f"ClickHouse query failed: {response.status}")
