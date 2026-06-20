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

    # Determine tenant_id (For the platform's own API/site traffic, we use "platform")
    # In a multi-tenant widget scenario, this would be extracted from the request headers or URL
    tenant_id = request.headers.get("X-Tenant-ID", "platform")

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
    # For now, we log it so vector/otel or a Django Celery task can pick it up.
    logger.info(f"NETWORK_TELEMETRY: {json.dumps(log_data)}")

    return response
