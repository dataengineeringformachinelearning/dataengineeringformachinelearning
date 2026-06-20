from corsheaders.signals import check_request_enabled
from django.db.models import Q
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(check_request_enabled)
def cors_allow_monitored_domains(sender, request, **kwargs):
  origin = request.META.get("HTTP_ORIGIN")
  if not origin:
    return False

  try:
    from monitor.models import Endpoints, MonitoredService

    # Match exact origin (e.g., https://example.com) or subpaths (e.g., https://example.com/)
    q_exact = Q(url=origin)
    q_slash = Q(url__startswith=origin + "/")

    if Endpoints.objects.filter(q_exact | q_slash).exists():
      return True

    if MonitoredService.objects.filter(q_exact | q_slash).exists():
      return True

  except Exception:
    pass

  return False


@receiver(post_save, sender="monitor.Vulnerability")
def notify_vulnerability_created(sender, instance, created, **kwargs):
  if created:
    from utils.discord import send_discord_alert
    from utils.email import get_recent_stats_text, send_alert_email

    subject = f"Alert: New Vulnerability Detected - {instance.title}"
    message = f"A new vulnerability was logged:\n\nTitle: {instance.title}\nSeverity: {instance.severity}\nDescription: {instance.description}\n\n"
    message += get_recent_stats_text()
    send_alert_email(subject, message)
    send_discord_alert(subject, message)


@receiver(post_save, sender="monitor.Incident")
def notify_incident_created(sender, instance, created, **kwargs):
  if created:
    from utils.discord import send_discord_alert
    from utils.email import get_recent_stats_text, send_alert_email

    subject = f"Alert: New Incident/Outage Logged - {instance.title}"
    message = f"An incident was created:\n\nTitle: {instance.title}\nStatus: {instance.status}\nMessage: {instance.message}\n\n"
    message += get_recent_stats_text()
    send_alert_email(subject, message)
    send_discord_alert(subject, message)


@receiver(post_save, sender="monitor.ThreatIntelligence")
def notify_threat_detected(sender, instance, created, **kwargs):
  if created and instance.is_malicious:
    from utils.discord import send_discord_alert
    from utils.email import get_recent_stats_text, send_alert_email

    subject = f"Alert: Malicious Threat Detected from {instance.ip_address or instance.location}"
    message = f"A new malicious threat was detected:\n\nSource: {instance.source}\nIP: {instance.ip_address}\nLocation: {instance.location}\nAbuse Score: {instance.abuse_confidence_score}\n\n"
    message += get_recent_stats_text()
    send_alert_email(subject, message)
    send_discord_alert(subject, message)
