import logging
import time

from utils.request import anonymize_ip
from utils.structured_log import log_event

logger = logging.getLogger(__name__)


class NetworkTelemetryMiddleware:
  """
  Middleware to log incoming network traffic (Application-Level Zeek equivalent).
  Logs IPs, User-Agents, Methods, Paths, and processing time.
  These logs can be shipped to Redpanda/ClickHouse for analysis.
  """

  def __init__(self, get_response):
    self.get_response = get_response

  def __call__(self, request):
    start_time = time.time()

    # Get client IP
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
      ip = x_forwarded_for.split(",")[0]
    else:
      ip = request.META.get("REMOTE_ADDR")

    response = self.get_response(request)

    duration = time.time() - start_time

    # Determine account_id
    from account.platform import PLATFORM_ACCOUNT_ID

    account_id = request.headers.get("X-Account-ID") or request.headers.get("X-Tenant-ID")

    # Dynamic zero-latency fallback mapping based on Host domain
    if not account_id or account_id == PLATFORM_ACCOUNT_ID:
      from django.core.cache import cache

      host = request.get_host().split(":")[0]
      cache_key = f"account_host_map_{host}"
      account_id = cache.get(cache_key)

      if not account_id:
        from monitor.models import MonitoredService, ValidatedSite

        # 1. Map by validated customer domain
        site = ValidatedSite.objects.filter(domain=host).select_related("user__profile").first()
        if site and hasattr(site.user, "profile") and site.user.profile.account_id:
          account_id = str(site.user.profile.account_id)
        else:
          # 2. Map by monitored service URL
          service = (
            MonitoredService.objects.filter(url__icontains=host)
            .select_related("status_page__user__profile")
            .first()
          )
          if (
            service
            and service.status_page
            and service.status_page.user
            and hasattr(service.status_page.user, "profile")
            and service.status_page.user.profile.account_id
          ):
            account_id = str(service.status_page.user.profile.account_id)
          else:
            # 3. Fallback to platform showcase scope
            account_id = PLATFORM_ACCOUNT_ID

        if account_id:
          cache.set(cache_key, account_id, 3600)

    # Log anonymized IP only — raw IP is persisted in Endpoints via projectors when needed.
    log_event(
      logger,
      logging.INFO,
      "network_traffic",
      account_id=account_id,
      ip_address=anonymize_ip(ip),
      method=request.method,
      path=request.path,
      status_code=response.status_code,
      duration_ms=int(duration * 1000),
      correlation_id=getattr(request, "correlation_id", ""),
    )

    return response
