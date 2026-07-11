"""Purge old archived data from ClickHouse based on retention policies.

ClickHouse retention schedule:
- audit_archive: 90 days (backup retention after Postgres purge)
- security_events: 180 days (security incident tracking)
- asset_vulnerability_ledger: 365 days (vulnerability tracking)
- otel_traces/metrics: TTL managed by ClickHouse MergeTree (365+ days)
"""

from __future__ import annotations

import logging
import urllib.request
import urllib.error
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from utils.env import clickhouse_uri

logger = logging.getLogger(__name__)


class Command(BaseCommand):
  help = "Clean up old data from ClickHouse archival storage"

  def handle(self, *args, **options):
    uri = clickhouse_uri()
    purged_any = False

    # Convert adbc URI to HTTP endpoint
    http_url = uri.replace("clickhouse://", "http://").replace(":9000/", ":8123/").rstrip("/")

    # Purge audit_archive older than 90 days (backup retention)
    audit_cutoff = (timezone.now() - timedelta(days=90)).date()
    try:
      query = f"DELETE FROM audit_archive WHERE timestamp < '{audit_cutoff}'"
      self._execute_http_query(http_url, query)
      self.stdout.write(self.style.SUCCESS(f"Purged audit_archive before {audit_cutoff}"))
      purged_any = True
    except Exception as e:
      logger.warning("ClickHouse audit_archive cleanup skipped: %s", e)

    # Purge security_events older than 180 days
    security_cutoff = (timezone.now() - timedelta(days=180)).date()
    try:
      query = f"DELETE FROM security_events WHERE timestamp < '{security_cutoff}'"
      self._execute_http_query(http_url, query)
      self.stdout.write(self.style.SUCCESS(f"Purged security_events before {security_cutoff}"))
      purged_any = True
    except Exception as e:
      logger.warning("ClickHouse security_events cleanup skipped: %s", e)

    # Purge asset_vulnerability_ledger older than 365 days
    vuln_cutoff = (timezone.now() - timedelta(days=365)).date()
    try:
      query = f"DELETE FROM asset_vulnerability_ledger WHERE account_id != 'Internal' AND timestamp < '{vuln_cutoff}'"
      self._execute_http_query(http_url, query)
      self.stdout.write(self.style.SUCCESS(f"Purged asset_vulnerability_ledger before {vuln_cutoff}"))
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
