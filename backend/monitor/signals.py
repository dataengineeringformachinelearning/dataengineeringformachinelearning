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
    from monitor.models import Endpoints, MonitoredService, Tenant

    # Match exact origin (e.g., https://example.com) or subpaths (e.g., https://example.com/)
    q_exact = Q(url=origin)
    q_slash = Q(url__startswith=origin + "/")

    if Endpoints.objects.filter(q_exact | q_slash).exists():
      return True

    if MonitoredService.objects.filter(q_exact | q_slash).exists():
      return True

    q_target_exact = Q(target_url=origin)
    q_target_slash = Q(target_url__startswith=origin + "/")

    if Tenant.objects.filter(q_target_exact | q_target_slash).exists():
      return True

  except Exception:
    pass

  return False


@receiver(post_save, sender="monitor.Vulnerability")
def notify_vulnerability_created(sender, instance, created, **kwargs):
  if created and instance.tenant:
    from utils.discord import send_discord_alert
    from utils.email import get_recent_stats_text, send_alert_email

    subject = (
      f"Alert: New Vulnerability Detected for Tenant '{instance.tenant.name}' - {instance.title}"
    )
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
  if created and instance.is_malicious and instance.tenant:
    from utils.discord import send_discord_alert
    from utils.email import get_recent_stats_text, send_alert_email

    subject = f"Alert: Malicious Threat Detected for Tenant '{instance.tenant.name}' from {instance.ip_address or instance.location}"
    message = f"A new malicious threat was detected:\n\nSource: {instance.source}\nIP: {instance.ip_address}\nLocation: {instance.location}\nAbuse Score: {instance.abuse_confidence_score}\n\n"
    message += get_recent_stats_text()
    send_alert_email(subject, message)
    send_discord_alert(subject, message)


def ensure_tenant0_exists(sender, **kwargs):
  """
  A post_migrate signal receiver that guarantees the DEML Platform
  (Tenant0) always exists in the database.
  """
  from monitor.models import Tenant

  Tenant.objects.get_or_create(
    is_platform_tenant=True,
    defaults={
      "name": "DEML Platform",
      "slug": "platform",
      "target_url": "https://dataengineeringformachinelearning.com",
    },
  )
