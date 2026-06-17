from corsheaders.signals import check_request_enabled
from django.db.models import Q
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
