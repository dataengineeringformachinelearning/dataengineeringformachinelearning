from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender="ml.TrainingRun")
def notify_training_run_completed(sender, instance, created, **kwargs):
  if created:
    from utils.discord import send_discord_alert
    from utils.email import get_recent_stats_text, send_alert_email

    subject = f"Alert: ML Model Training Run Completed - {instance.id}"
    message = f"An ML model training run has completed:\n\nRun ID: {instance.id}\nAverage SLA: {instance.average_sla:.2f}\nLoss: {instance.loss:.4f}\n\n"
    message += get_recent_stats_text()
    send_alert_email(subject, message)
    send_discord_alert(subject, message)


@receiver(post_save, sender="ml.ThreatReport")
def notify_ml_threat_report_created(sender, instance, created, **kwargs):
  if created:
    from utils.discord import send_discord_alert
    from utils.email import get_recent_stats_text, send_alert_email

    subject = f"Alert: ML Threat Report Generated - Anomaly Score {instance.anomaly_score:.2%}"
    message = (
      f"A new ML Threat Report was generated:\n\n"
      f"Report ID: {instance.id}\n"
      f"Anomaly Score: {instance.anomaly_score:.2%}\n"
      f"Top Location: {instance.top_location}\n"
      f"Location Weight: {instance.location_weight:.2%}\n"
      f"Suspicious Ratio: {instance.suspicious_ratio:.2%}\n\n"
    )
    message += get_recent_stats_text()
    send_alert_email(subject, message)
    send_discord_alert(subject, message)
