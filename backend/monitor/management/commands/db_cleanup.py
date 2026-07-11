from datetime import timedelta
from typing import Any

from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone
from utils.retention import (
  OUTBOX_DLQ_RETENTION_DAYS,
  OUTBOX_PUBLISHED_RETENTION_DAYS,
  RAW_TELEMETRY_RETENTION_DAYS,
  REPORT_ARCHIVE_RETENTION_DAYS,
)

from monitor.models import AuditLog, CookieConsent, Endpoints, OutboxEvent, ReportArchive


class Command(BaseCommand):
  help = (
    f"Cleans up raw telemetry, audit logs, and cookie consent older than "
    f"{RAW_TELEMETRY_RETENTION_DAYS} days; purges stale outbox events."
  )

  def handle(self, *args: Any, **options: Any) -> None:
    cutoff = timezone.now() - timedelta(days=RAW_TELEMETRY_RETENTION_DAYS)
    outbox_published_cutoff = timezone.now() - timedelta(days=OUTBOX_PUBLISHED_RETENTION_DAYS)
    outbox_dlq_cutoff = timezone.now() - timedelta(days=OUTBOX_DLQ_RETENTION_DAYS)
    archive_cutoff = timezone.now().date() - timedelta(days=REPORT_ARCHIVE_RETENTION_DAYS)

    threat_dupes_deleted = self._purge_legacy_threat_intel_dupes()

    endpoints_deleted, _ = Endpoints.objects.filter(last_tested__lt=cutoff).delete()

    stale_audit_logs = list(AuditLog.objects.filter(timestamp__lt=cutoff)[:5000])
    if stale_audit_logs:
      from telemetry.services.security_events import archive_audit_logs

      archive_audit_logs(stale_audit_logs)
    audit_logs_deleted, _ = AuditLog.objects.filter(timestamp__lt=cutoff).delete()
    cookie_consents_deleted, _ = CookieConsent.objects.filter(created_at__lt=cutoff).delete()

    outbox_published_deleted, _ = OutboxEvent.objects.filter(
      is_published=True, published_at__lt=outbox_published_cutoff
    ).delete()
    outbox_dlq_deleted, _ = OutboxEvent.objects.filter(
      is_published=False, attempts__gte=5, created_at__lt=outbox_dlq_cutoff
    ).delete()

    # Purge expired report archives (older than 180 days)
    archive_deleted, _ = ReportArchive.objects.filter(report_date__lt=archive_cutoff).delete()

    self.stdout.write(
      self.style.SUCCESS(
        f"Cleanup completed: {endpoints_deleted} Endpoints, "
        f"{audit_logs_deleted} AuditLogs, "
        f"{cookie_consents_deleted} CookieConsents older than "
        f"{RAW_TELEMETRY_RETENTION_DAYS} days deleted; "
        f"{threat_dupes_deleted} legacy ThreatIntelligence duplicates removed; "
        f"{outbox_published_deleted} published outbox events and "
        f"{outbox_dlq_deleted} DLQ outbox events purged; "
        f"{archive_deleted} ReportArchive records older than "
        f"{REPORT_ARCHIVE_RETENTION_DAYS} days archived to ClickHouse."
      )
    )

    # ThreatIntelligence, BugReport, and user configuration (profiles, API keys)
    # are kept indefinitely. Long-term raw metrics are routed to ClickHouse for OLAP.

    self.stdout.write(self.style.SUCCESS("Database raw telemetry cleanup completed successfully."))

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