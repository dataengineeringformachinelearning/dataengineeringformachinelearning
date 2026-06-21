from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender="ml.TrainingRun")
def notify_training_run_completed(sender, instance, created, **kwargs):
  # Routine training runs are now aggregated into the 24-hour daily status report
  pass


@receiver(post_save, sender="ml.ThreatReport")
def notify_ml_threat_report_created(sender, instance, created, **kwargs):
  # Routine ML threat reports are now aggregated into the 24-hour daily status report
  pass
