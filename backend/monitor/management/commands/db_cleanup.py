from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from monitor.models import Endpoints


class Command(BaseCommand):
  help = "Cleans up old raw telemetry records older than 30 days"

  def handle(self, *args, **options):
    cutoff = timezone.now() - timedelta(days=30)

    # 1. Clean up telemetry endpoints older than 30 days
    deleted_endpoints, _ = Endpoints.objects.filter(last_tested__lt=cutoff).delete()
    self.stdout.write(
      self.style.SUCCESS(
        f"Deleted {deleted_endpoints} raw telemetry endpoint records older than 30 days."
      )
    )

    # Note: BugReport, ThreatReport, and TrainingRun are high-value business objects
    # and are kept indefinitely as the system of record. Long-term raw metrics
    # are routed to ClickHouse for OLAP.

    self.stdout.write(self.style.SUCCESS("Database raw telemetry cleanup completed successfully."))
