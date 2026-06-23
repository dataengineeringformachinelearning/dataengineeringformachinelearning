import json
import logging
import time

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

    # Determine tenant_id
    tenant_id = request.headers.get("X-Tenant-ID")

    # Dynamic zero-latency fallback mapping based on Host domain
    if not tenant_id or tenant_id == "platform":
      from django.core.cache import cache

      host = request.get_host().split(":")[0]
      cache_key = f"tenant_host_map_{host}"
      tenant_id = cache.get(cache_key)

      if not tenant_id:
        from monitor.models import Tenant

        # 1. First attempt to map by target_url (for customer custom domains)
        tenant = Tenant.objects.filter(target_url__icontains=host).first()

        # 2. Fallback to Tenant0 (Platform) if no customer matches or it explicitly requested 'platform'
        if not tenant:
          tenant = Tenant.objects.filter(is_platform_tenant=True).first()

        tenant_id = str(tenant.id) if tenant else None

        if tenant_id:
          # Cache for 1 hour to ensure zero database latency on subsequent requests
          cache.set(cache_key, tenant_id, 3600)

    log_data = {
      "tenant_id": tenant_id,
      "event_type": "network_traffic",
      "ip_address": ip,
      "method": request.method,
      "path": request.path,
      "status_code": response.status_code,
      "user_agent": request.META.get("HTTP_USER_AGENT", ""),
      "duration_ms": int(duration * 1000),
      "payload_size": len(response.content) if hasattr(response, "content") else 0,
    }

    # In a real setup, this would be pushed to Redpanda.
    # For now, we log it so vector/otel or a Django cron worker can pick it up.
    logger.info(f"NETWORK_TELEMETRY: {json.dumps(log_data)}")

    return response
