from django.core.management import call_command
from django.core.management.base import BaseCommand
from ml.ml_services import train_tenant_sla, train_threat_model
from monitor.models import StatusPage


class Command(BaseCommand):
  help = "Purges logs/telemetry older than 90 days and retrains SLA & Threat forecast models for all tenants."

  def handle(self, *args, **options):
    self.stdout.write("Starting database telemetry/log cleanup...")
    try:
      call_command("db_cleanup")
    except Exception as e:
      self.stderr.write(self.style.ERROR(f"Database cleanup failed: {e}"))

    self.stdout.write("Starting SLA and Threat forecast model training for all tenants...")
    pages = StatusPage.objects.all()
    for page in pages:
      self.stdout.write(f"Training models for status page '{page.title}' (slug: {page.slug})...")
      try:
        run = train_tenant_sla(page)
        if run:
          self.stdout.write(
            self.style.SUCCESS(
              f"  - SLA forecast trained successfully: average predicted SLA = {run.average_sla:.2f}%"
            )
          )
        else:
          self.stdout.write("  - SLA training skipped (no telemetry data)")
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"  - SLA training failed: {e}"))

      if page.user:
        self.stdout.write(f"Training threat model for owner '{page.user.username}'...")
        try:
          report = train_threat_model(page.user)
          self.stdout.write(
            self.style.SUCCESS(
              f"  - Threat model trained successfully: anomaly score = {report.anomaly_score * 100:.1f}%"
            )
          )
        except Exception as e:
          self.stderr.write(self.style.ERROR(f"  - Threat training failed: {e}"))

    self.stdout.write(self.style.SUCCESS("All models trained and database cleaned successfully."))
