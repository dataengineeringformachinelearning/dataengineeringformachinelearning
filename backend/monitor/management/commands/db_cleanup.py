from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from ml.models import ThreatReport, TrainingRun

from monitor.models import BugReport, Endpoints


class Command(BaseCommand):
  help = "Cleans up old telemetry records and error logs older than 30 days"

  def handle(self, *args, **options):
    cutoff = timezone.now() - timedelta(days=30)

    # 1. Clean up telemetry endpoints older than 30 days
    deleted_endpoints, _ = Endpoints.objects.filter(last_tested__lt=cutoff).delete()
    self.stdout.write(
      self.style.SUCCESS(
        f"Deleted {deleted_endpoints} telemetry endpoint records older than 30 days."
      )
    )

    # 2. Clean up bug reports older than 30 days
    deleted_bugs, _ = BugReport.objects.filter(created_at__lt=cutoff).delete()
    self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_bugs} bug reports older than 30 days."))

    # 3. Clean up threat reports older than 30 days
    deleted_threats, _ = ThreatReport.objects.filter(created_at__lt=cutoff).delete()
    self.stdout.write(
      self.style.SUCCESS(f"Deleted {deleted_threats} threat reports older than 30 days.")
    )

    # 4. Clean up model training runs older than 30 days
    deleted_runs, _ = TrainingRun.objects.filter(created_at__lt=cutoff).delete()
    self.stdout.write(
      self.style.SUCCESS(f"Deleted {deleted_runs} training run records older than 30 days.")
    )

    self.stdout.write(
      self.style.SUCCESS("Database telemetry and error logs cleanup completed successfully.")
    )
