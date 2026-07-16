"""Database cleanup for Neon - wipes raw telemetry to prevent bloat.

Retention strategy:
- Raw telemetry (Endpoints): 30 days
- Hourly AggregatedAnalytics: 30 days (after daily rollups materialized)
- AuditLog: 30 days (archived to ClickHouse first)
- CookieConsent: 30 days (compliance)
- LighthouseScan: 30 days (site-scoped quality history)
- ReportArchive and status-page uptime daily rollups: 90 days
- ThreatIntelligence: 90 days (security data)

NOTE: This command is now Rust-native. The deml-daemon:scheduler executes
run_db_cleanup directly. This file remains as fallback for PYTHON_EMBEDDED_SCHEDULERS_ENABLED=1.
"""

from __future__ import annotations

import os
from datetime import timedelta
from typing import Any

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.db.models import Q
from django.utils import timezone
from utils.retention import (
  BENCHMARK_RUN_RETENTION_DAYS,
  HONEYPOT_INTERACTION_RETENTION_DAYS,
  LIGHTHOUSE_SCAN_RETENTION_DAYS,
  OUTBOX_DLQ_RETENTION_DAYS,
  OUTBOX_PUBLISHED_RETENTION_DAYS,
  RAW_TELEMETRY_RETENTION_DAYS,
  REPORT_ARCHIVE_RETENTION_DAYS,
  SCHEDULED_TASK_RUN_RETENTION_DAYS,
  SEARCH_QUERY_RETENTION_DAYS,
  STATUS_PAGE_UPTIME_RETENTION_DAYS,
  TELEMETRY_INGEST_RECEIPT_RETENTION_DAYS,
  THREAT_INTELLIGENCE_RETENTION_DAYS,
)

from monitor.models import (
  AggregatedAnalytics,
  AuditLog,
  BenchmarkRun,
  CookieConsent,
  Endpoints,
  HealthProbeObservation,
  HoneypotInteraction,
  LighthouseScan,
  OutboxEvent,
  ReportArchive,
  ScheduledTaskRun,
  SearchQuery,
  StatusPageUptimeDaily,
  TelemetryIngestReceipt,
  ThreatIntelligence,
)


class Command(BaseCommand):
  help = (
    f"Cleans up Neon raw telemetry older than {RAW_TELEMETRY_RETENTION_DAYS} days; "
    f"purges stale outbox events and old analytics rollups. "
    "(Rust-native fallback)"
  )

  def handle(self, *args: Any, **options: Any) -> None:
    # Check if embedded schedulers are disabled (production mode)
    embedded = os.environ.get("PYTHON_EMBEDDED_SCHEDULERS_ENABLED", "0") == "1"
    if not embedded:
      self.stdout.write(
        "Embedded schedulers disabled (PYTHON_EMBEDDED_SCHEDULERS_ENABLED=0); "
        "this command is not used in production. Rust scheduler handles db_cleanup."
      )
      return

    # Fallback: run the actual cleanup
    self._run_cleanup()

  def _run_cleanup(self) -> None:
    now = timezone.now()
    cutoff = now - timedelta(days=RAW_TELEMETRY_RETENTION_DAYS)
    outbox_published_cutoff = now - timedelta(days=OUTBOX_PUBLISHED_RETENTION_DAYS)
    outbox_dlq_cutoff = now - timedelta(days=OUTBOX_DLQ_RETENTION_DAYS)
    threat_cutoff = now - timedelta(days=THREAT_INTELLIGENCE_RETENTION_DAYS)
    report_cutoff = now.date() - timedelta(days=REPORT_ARCHIVE_RETENTION_DAYS)
    uptime_cutoff = now.date() - timedelta(days=STATUS_PAGE_UPTIME_RETENTION_DAYS)
    receipt_cutoff = now - timedelta(days=TELEMETRY_INGEST_RECEIPT_RETENTION_DAYS)
    task_cutoff = now - timedelta(days=SCHEDULED_TASK_RUN_RETENTION_DAYS)
    search_cutoff = now - timedelta(days=SEARCH_QUERY_RETENTION_DAYS)
    honeypot_cutoff = now - timedelta(days=HONEYPOT_INTERACTION_RETENTION_DAYS)
    benchmark_cutoff = now - timedelta(days=BENCHMARK_RUN_RETENTION_DAYS)
    lighthouse_cutoff = now - timedelta(days=LIGHTHOUSE_SCAN_RETENTION_DAYS)

    # Match the Rust-native fail-closed ordering: repair every daily projection
    # before deleting any raw rows that may be needed to reconstruct it.
    # The public 30-slot window is today plus 29 completed days. Rebuilding a
    # 30th completed calendar day after rolling raw pruning would downgrade its
    # existing complete archive to a partial suffix.
    call_command("archive_reports", backfill_days=RAW_TELEMETRY_RETENTION_DAYS - 1)
    self._assert_raw_analytics_coverage(cutoff)

    from telemetry.services.security_events import archive_audit_logs

    audit_logs_deleted = 0
    while True:
      stale_audit_logs = list(
        AuditLog.objects.filter(timestamp__lt=cutoff).order_by("timestamp", "id")[:5000]
      )
      if not stale_audit_logs:
        break
      if not archive_audit_logs(stale_audit_logs):
        raise CommandError(
          "Refusing to delete audit logs because ClickHouse archival did not acknowledge the batch"
        )
      batch_deleted, _ = AuditLog.objects.filter(
        id__in=[log.id for log in stale_audit_logs]
      ).delete()
      audit_logs_deleted += batch_deleted

    self._purge_legacy_threat_intel_dupes()

    endpoints_deleted, _ = Endpoints.objects.filter(last_tested__lt=cutoff).delete()
    probes_deleted, _ = HealthProbeObservation.objects.filter(observed_at__lt=cutoff).delete()
    receipts_deleted, _ = TelemetryIngestReceipt.objects.filter(
      processed_at__lt=receipt_cutoff
    ).delete()
    cookie_consents_deleted, _ = CookieConsent.objects.filter(created_at__lt=cutoff).delete()

    outbox_published_deleted, _ = OutboxEvent.objects.filter(
      is_published=True, published_at__lt=outbox_published_cutoff
    ).delete()
    outbox_dlq_deleted, _ = OutboxEvent.objects.filter(
      is_published=False, attempts__gte=5, dlq_at__lt=outbox_dlq_cutoff
    ).delete()

    # Purge old hourly AggregatedAnalytics (after daily rollups materialized)
    hourly_analytics_deleted, _ = AggregatedAnalytics.objects.filter(
      bucket_size="1h", timestamp__lt=cutoff
    ).delete()

    # Purge old threat intelligence
    threat_deleted, _ = ThreatIntelligence.objects.filter(timestamp__lt=threat_cutoff).delete()
    reports_deleted, _ = ReportArchive.objects.filter(report_date__lt=report_cutoff).delete()
    uptime_rollups_deleted, _ = StatusPageUptimeDaily.objects.filter(
      report_date__lt=uptime_cutoff
    ).delete()
    task_runs_deleted, _ = (
      ScheduledTaskRun.objects.filter(scheduled_for__lt=task_cutoff)
      .filter(
        Q(state=ScheduledTaskRun.State.COMPLETED)
        | Q(state=ScheduledTaskRun.State.FAILED, attempts__gte=5)
      )
      .delete()
    )
    search_queries_deleted, _ = SearchQuery.objects.filter(timestamp__lt=search_cutoff).delete()
    honeypot_interactions_deleted, _ = HoneypotInteraction.objects.filter(
      timestamp__lt=honeypot_cutoff
    ).delete()
    benchmark_runs_deleted, _ = BenchmarkRun.objects.filter(
      created_at__lt=benchmark_cutoff
    ).delete()
    lighthouse_scans_deleted, _ = LighthouseScan.objects.filter(
      scanned_at__lt=lighthouse_cutoff
    ).delete()

    self.stdout.write(
      self.style.SUCCESS(
        f"Cleanup completed: {endpoints_deleted} Endpoints, "
        f"{probes_deleted} HealthProbeObservations, "
        f"{receipts_deleted} TelemetryIngestReceipts, "
        f"{audit_logs_deleted} AuditLogs, "
        f"{cookie_consents_deleted} CookieConsents older than {RAW_TELEMETRY_RETENTION_DAYS} days; "
        f"{hourly_analytics_deleted} hourly AggregatedAnalytics; "
        f"{threat_deleted} ThreatIntelligence older than {THREAT_INTELLIGENCE_RETENTION_DAYS} days; "
        f"{reports_deleted} ReportArchives and {uptime_rollups_deleted} uptime rollups; "
        f"{task_runs_deleted} scheduled task runs; "
        f"{search_queries_deleted} search queries, "
        f"{honeypot_interactions_deleted} honeypot interactions, and "
        f"{benchmark_runs_deleted} benchmark runs; "
        f"{lighthouse_scans_deleted} Lighthouse scans; "
        f"{outbox_published_deleted} published outbox events and "
        f"{outbox_dlq_deleted} DLQ outbox events purged."
      )
    )

    self.stdout.write(
      self.style.SUCCESS(f"Daily rollups retained for {REPORT_ARCHIVE_RETENTION_DAYS} days.")
    )

  def _purge_legacy_threat_intel_dupes(self) -> int:
    """Remove pre-constraint duplicates in one pass (UniqueConstraint prevents new ones)."""
    if connection.vendor != "postgresql":
      return 0

    self.stdout.write("Removing legacy duplicate ThreatIntelligence records...")
    with connection.cursor() as cursor:
      cursor.execute(
        """
        DELETE FROM threat_intelligence AS newer
        USING threat_intelligence AS older
        WHERE newer.id > older.id
          AND newer.user_id IS NOT DISTINCT FROM older.user_id
          AND newer.source = older.source
          AND newer.ip_address IS NOT DISTINCT FROM older.ip_address
          AND newer.location IS NOT DISTINCT FROM older.location
        """
      )
      deleted = cursor.rowcount

    self.stdout.write(
      self.style.SUCCESS(f"Deleted {deleted} legacy duplicate ThreatIntelligence records.")
    )
    return deleted

  def _assert_raw_analytics_coverage(self, cutoff: Any) -> None:
    """Fail closed when a raw endpoint hour has no durable aggregate."""
    if connection.vendor != "postgresql":
      return
    with connection.cursor() as cursor:
      cursor.execute(
        """
        SELECT EXISTS (
          WITH raw_buckets AS (
            SELECT
              endpoints.user_id,
              endpoints.is_platform,
              date_trunc('hour', endpoints.last_tested AT TIME ZONE 'UTC')
                AT TIME ZONE 'UTC' AS bucket_start
            FROM endpoints
            WHERE endpoints.last_tested >= %s - INTERVAL '1 day'
              AND endpoints.last_tested < %s
              AND (
                (endpoints.is_platform = true AND endpoints.user_id IS NULL)
                OR (
                  endpoints.is_platform = false
                  AND endpoints.user_id IS NOT NULL
                  AND EXISTS (
                    SELECT 1 FROM user_profiles
                    WHERE user_profiles.user_id = endpoints.user_id
                  )
                )
              )
            GROUP BY endpoints.user_id, endpoints.is_platform, bucket_start
            UNION
            SELECT
              cookie_consents.user_id,
              cookie_consents.is_platform,
              date_trunc('hour', cookie_consents.created_at AT TIME ZONE 'UTC')
                AT TIME ZONE 'UTC' AS bucket_start
            FROM cookie_consents
            WHERE cookie_consents.created_at >= %s - INTERVAL '1 day'
              AND cookie_consents.created_at < %s
              AND (
                (cookie_consents.is_platform = true AND cookie_consents.user_id IS NULL)
                OR (
                  cookie_consents.is_platform = false
                  AND cookie_consents.user_id IS NOT NULL
                  AND EXISTS (
                    SELECT 1 FROM user_profiles
                    WHERE user_profiles.user_id = cookie_consents.user_id
                  )
                )
              )
            GROUP BY cookie_consents.user_id, cookie_consents.is_platform, bucket_start
          )
          SELECT 1
          FROM raw_buckets
          LEFT JOIN aggregated_analytics AS analytics
            ON analytics.bucket_size = '1h'
           AND analytics.timestamp = raw_buckets.bucket_start
           AND COALESCE(analytics.metadata->>'aggregation_version', '0') = '2'
           AND analytics.is_platform = raw_buckets.is_platform
           AND analytics.user_id IS NOT DISTINCT FROM raw_buckets.user_id
          WHERE analytics.id IS NULL
          LIMIT 1
        )
        """,
        [cutoff, cutoff, cutoff, cutoff],
      )
      missing_bucket = bool(cursor.fetchone()[0])
    if missing_bucket:
      raise CommandError(
        "Refusing to prune raw analytics before every boundary-hour bucket is materialized"
      )
