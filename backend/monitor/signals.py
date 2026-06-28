from corsheaders.signals import check_request_enabled
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(check_request_enabled)
def cors_allow_monitored_domains(sender, request, **kwargs):
  origin = request.META.get("HTTP_ORIGIN")
  from monitor.cors_utils import is_domain_registered

  return is_domain_registered(origin)


@receiver(post_save, sender="monitor.Vulnerability")
def notify_vulnerability_created(sender, instance, created, **kwargs):
  if created and instance.user:
    from utils.discord import send_discord_alert
    from utils.email import get_recent_stats_text, send_alert_email

    subject = f"Alert: New Vulnerability Detected for {instance.user.username} - {instance.title}"
    message = f"A new vulnerability was logged:\n\nTitle: {instance.title}\nSeverity: {instance.severity}\nDescription: {instance.description}\n\n"
    message += get_recent_stats_text()
    send_alert_email(subject, message)
    send_discord_alert(subject, message)


@receiver(post_save, sender="monitor.Incident")
def notify_incident_created(sender, instance, created, **kwargs):
  # Routine incident logging alerts are deferred to the daily status report
  pass


@receiver(post_save, sender="monitor.ThreatIntelligence")
def notify_threat_detected(sender, instance, created, **kwargs):
  if created and instance.is_malicious:
    from utils.discord import send_discord_alert
    from utils.email import get_recent_stats_text, send_alert_email

    scope = (
      "platform"
      if instance.is_platform
      else (instance.user.username if instance.user else "unknown")
    )
    subject = f"Alert: Malicious Threat Detected for {scope} from {instance.ip_address or instance.location}"
    message = f"A new malicious threat was detected:\n\nSource: {instance.source}\nIP: {instance.ip_address}\nLocation: {instance.location}\nAbuse Score: {instance.abuse_confidence_score}\n\n"
    message += get_recent_stats_text()
    send_alert_email(subject, message)
    send_discord_alert(subject, message)


def ensure_platform_status_page_exists(sender, **kwargs):
  """Guarantee the public platform-status page exists after migrations."""
  from account.platform import ensure_platform_status_page

  ensure_platform_status_page()
