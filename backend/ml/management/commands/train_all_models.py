from django.core.management import call_command
from django.core.management.base import BaseCommand
from ml.ml_services import train_tenant_sla, train_threat_model


class Command(BaseCommand):
  help = "Purges logs/telemetry older than 7 days and retrains SLA & Threat forecast models for all tenants."

  def handle(self, *args, **options):
    self.stdout.write("Starting database telemetry/log cleanup...")
    try:
      call_command("db_cleanup")
    except Exception as e:
      self.stderr.write(self.style.ERROR(f"Database cleanup failed: {e}"))

    from monitor.models import Tenant

    self.stdout.write("Starting SLA and Threat forecast model training for all tenants...")
    tenants = Tenant.objects.all()
    for tenant in tenants:
      self.stdout.write(f"Training models for tenant '{tenant.name}'...")
      try:
        run = train_tenant_sla(tenant)
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

      self.stdout.write(f"Training threat model for tenant '{tenant.name}'...")
      try:
        report = train_threat_model(tenant)
        self.stdout.write(
          self.style.SUCCESS(
            f"  - Threat model trained successfully: anomaly score = {report.anomaly_score * 100:.1f}%"
          )
        )
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"  - Threat training failed: {e}"))

    self.stdout.write("Training global CES model...")
    try:
      from ml.ml_services import train_ces_model

      ces_run = train_ces_model()
      self.stdout.write(
        self.style.SUCCESS(f"  - CES model trained successfully: {ces_run['status']}")
      )
    except Exception as e:
      self.stderr.write(self.style.ERROR(f"  - CES model training failed: {e}"))

    self.stdout.write(self.style.SUCCESS("All models trained and database cleaned successfully."))
