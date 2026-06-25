from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from monitor.models import AuditLog, CookieConsent, Endpoints


class Command(BaseCommand):
  help = "Cleans up old raw telemetry records older than 30 days"

  def handle(self, *args, **options):
    cutoff = timezone.now() - timedelta(days=30)

    # Delete records older than 30 days
    endpoints_deleted, _ = Endpoints.objects.filter(last_tested__lt=cutoff).delete()
    audit_logs_deleted, _ = AuditLog.objects.filter(timestamp__lt=cutoff).delete()
    cookie_consents_deleted, _ = CookieConsent.objects.filter(created_at__lt=cutoff).delete()

    self.stdout.write(
      self.style.SUCCESS(
        f"Cleanup completed: {endpoints_deleted} Endpoints, "
        f"{audit_logs_deleted} AuditLogs, and "
        f"{cookie_consents_deleted} CookieConsents older than 30 days were deleted."
      )
    )

    # ThreatIntelligence, BugReport, and user configuration (Tenants, API keys)
    # are kept indefinitely as requested.

    # Note: BugReport, ThreatReport, and TrainingRun are high-value business objects
    # and are kept indefinitely as the system of record. Long-term raw metrics
    # are routed to ClickHouse for OLAP.

    self.stdout.write(self.style.SUCCESS("Database raw telemetry cleanup completed successfully."))
