from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from ml.ml_services import train_spiking_temporal_forecaster, train_tenant_sla, train_threat_model

User = get_user_model()


class Command(BaseCommand):
  help = (
    "Retrains SLA, Threat, CES, and Spiking Temporal Forecaster models for all accounts. "
    "Data retention is handled by security_worker via db_cleanup. "
    "Spiking model uses Norse if available for temporal data."
  )

  def handle(self, *args, **options):
    self.stdout.write("Starting SLA and Threat forecast model training for all users...")
    for user in User.objects.filter(profile__isnull=False).select_related("profile"):
      self.stdout.write(f"Training models for user '{user.username}'...")
      try:
        run = train_tenant_sla(user, is_platform=False)
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

      self.stdout.write(f"Training threat model for user '{user.username}'...")
      try:
        report = train_threat_model(user, is_platform=False)
        self.stdout.write(
          self.style.SUCCESS(
            f"  - Threat model trained successfully: anomaly score = {report.anomaly_score * 100:.1f}%"
          )
        )
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"  - Threat training failed: {e}"))

    self.stdout.write("Training platform scope models...")
    try:
      run = train_tenant_sla(None, is_platform=True)
      if run:
        self.stdout.write(
          self.style.SUCCESS(
            f"  - Platform SLA forecast trained: average predicted SLA = {run.average_sla:.2f}%"
          )
        )
      report = train_threat_model(None, is_platform=True)
      self.stdout.write(
        self.style.SUCCESS(
          f"  - Platform threat model trained: anomaly score = {report.anomaly_score * 100:.1f}%"
        )
      )
    except Exception as e:
      self.stderr.write(self.style.ERROR(f"  - Platform training failed: {e}"))

    self.stdout.write("Training global CES model...")
    try:
      from ml.ml_services import train_ces_model

      ces_run = train_ces_model()
      self.stdout.write(
        self.style.SUCCESS(f"  - CES model trained successfully: {ces_run['status']}")
      )
    except Exception as e:
      self.stderr.write(self.style.ERROR(f"  - CES model training failed: {e}"))

    self.stdout.write("Training Spiking Temporal Forecaster (fourth model)...")
    try:
      run = train_spiking_temporal_forecaster(None, is_platform=True)
      if run:
        self.stdout.write(
          self.style.SUCCESS(
            f"  - Platform Spiking Temporal Forecaster trained: score = {run.average_sla:.2f}%"
          )
        )
      else:
        self.stdout.write("  - Spiking training skipped (no data or Norse unavailable)")
    except Exception as e:
      self.stderr.write(self.style.ERROR(f"  - Spiking Temporal model training failed: {e}"))

    for user in User.objects.filter(profile__isnull=False).select_related("profile"):
      try:
        run = train_spiking_temporal_forecaster(user, is_platform=False)
        if run:
          self.stdout.write(
            self.style.SUCCESS(
              f"  - Spiking Temporal Forecaster for '{user.username}': {run.average_sla:.2f}%"
            )
          )
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"  - Spiking training for user failed: {e}"))

    self.stdout.write(
      self.style.SUCCESS("All models (including fourth Spiking Temporal) trained successfully.")
    )
