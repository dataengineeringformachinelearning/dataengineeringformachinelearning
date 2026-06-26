from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from monitor.models import AuditLog, CookieConsent, Endpoints


class Command(BaseCommand):
  help = "Cleans up old raw telemetry records older than 30 days"

  def handle(self, *args, **options):
    cutoff = timezone.now() - timedelta(days=30)

    # Deduplicate ThreatIntelligence records before time-based cleanup
    from django.db.models import Count, Min

    from monitor.models import ThreatIntelligence

    self.stdout.write("Security Worker: Removing duplicate ThreatIntelligence records...")
    duplicates = (
      ThreatIntelligence.objects.values("user", "source", "ip_address", "location")
      .annotate(count=Count("id"), min_id=Min("id"))
      .filter(count__gt=1)
    )

    threat_dupes_deleted = 0
    for duplicate in duplicates:
      dupes = ThreatIntelligence.objects.filter(
        user=duplicate["user"],
        source=duplicate["source"],
        ip_address=duplicate["ip_address"],
        location=duplicate["location"],
      ).exclude(id=duplicate["min_id"])
      deleted, _ = dupes.delete()
      threat_dupes_deleted += deleted

    self.stdout.write(
      self.style.SUCCESS(f"Deleted {threat_dupes_deleted} duplicate ThreatIntelligence records.")
    )
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
