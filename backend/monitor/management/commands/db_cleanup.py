from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from monitor.models import Endpoints, BugReport

class Command(BaseCommand):
    help = 'Cleans up old telemetry records and error logs older than 90 days'

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=90)
        
        # 1. Clean up telemetry endpoints older than 90 days
        deleted_endpoints, _ = Endpoints.objects.filter(last_tested__lt=cutoff).delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_endpoints} telemetry endpoint records older than 90 days."))
        
        # 2. Clean up bug reports older than 90 days
        deleted_bugs, _ = BugReport.objects.filter(created_at__lt=cutoff).delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_bugs} bug reports older than 90 days."))

        self.stdout.write(self.style.SUCCESS("Database telemetry and error logs cleanup completed successfully."))
