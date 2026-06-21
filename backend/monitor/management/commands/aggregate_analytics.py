import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Avg, Count
from django.utils import timezone

from monitor.models import (
  AggregatedAnalytics,
  CookieConsent,
  Endpoints,
  Incident,
  ThreatIntelligence,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
  help = "Aggregates analytical data into the AggregatedAnalytics table"

  def handle(self, *args, **options):
    self.stdout.write("Starting analytics aggregation...")
    now = timezone.now()

    # Aggregate for the previous hour
    hour_start = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
    hour_end = hour_start + timedelta(hours=1)

    # 1. Traffic & Telemetry
    endpoints_data = Endpoints.objects.filter(last_tested__gte=hour_start, last_tested__lt=hour_end)
    total_requests = endpoints_data.count()
    avg_resp = endpoints_data.aggregate(Avg("response_time"))["response_time__avg"]
    avg_latency_ms = int(avg_resp.total_seconds() * 1000) if avg_resp else 0.0
    p99_latency_ms = avg_latency_ms * 1.5 if avg_latency_ms else 0.0

    failed_requests = endpoints_data.filter(status_code__gte=400).count()
    error_rate_percent = (failed_requests / total_requests * 100) if total_requests > 0 else 0.0

    # 2. Security & Threats
    from monitor.models import Vulnerability

    threat_intel_count = ThreatIntelligence.objects.filter(
      timestamp__gte=hour_start, timestamp__lt=hour_end
    ).count()
    vulnerability_count = Vulnerability.objects.filter(
      created_at__gte=hour_start, created_at__lt=hour_end
    ).count()
    threats_detected = threat_intel_count + vulnerability_count
    active_incidents = Incident.objects.filter(
      status__in=["Investigating", "Identified", "Monitoring"]
    ).count()

    # 3. Cookies
    cookies_data = CookieConsent.objects.filter(created_at__gte=hour_start, created_at__lt=hour_end)
    cookie_consents_analytical = cookies_data.filter(analytical=True).count()
    cookie_consents_marketing = cookies_data.filter(marketing=True).count()

    unique_visitors_endpoints = endpoints_data.values("ip_address").distinct().count()
    unique_visitors = max(unique_visitors_endpoints, cookies_data.count())

    # 4. Widget Signals
    widget_interactions = 0
    for ep in endpoints_data.exclude(telemetry_context__isnull=True):
      try:
        if isinstance(ep.telemetry_context, dict):
          global_agent_data = ep.telemetry_context.get("global_agent_data", {})
          clicks = global_agent_data.get("clicks", 0)
          widget_interactions += clicks
      except Exception as e:
        logger.warning(f"Failed to parse telemetry context for endpoint {ep.id}: {e}")

    # 5. Metadata Enrichment
    statuses_agg = list(endpoints_data.values("status_code").annotate(count=Count("id")))
    origin_agg = list(
      endpoints_data.exclude(location__isnull=True)
      .exclude(location__in=["Unknown", "Localhost", ""])
      .values("location")
      .annotate(count=Count("id"))
      .order_by("-count")[:5]
    )

    metadata = {
      "http_statuses": {str(s["status_code"]): s["count"] for s in statuses_agg},
      "top_traffic_origins": {o["location"]: o["count"] for o in origin_agg},
    }

    obj, created = AggregatedAnalytics.objects.update_or_create(
      timestamp=hour_start,
      bucket_size="1h",
      defaults={
        "total_requests": total_requests,
        "avg_latency_ms": avg_latency_ms,
        "p99_latency_ms": p99_latency_ms,
        "error_rate_percent": error_rate_percent,
        "threats_detected": threats_detected,
        "active_incidents": active_incidents,
        "unique_visitors": unique_visitors,
        "cookie_consents_analytical": cookie_consents_analytical,
        "cookie_consents_marketing": cookie_consents_marketing,
        "widget_interactions": widget_interactions,
        "metadata": metadata,
      },
    )

    self.stdout.write(
      self.style.SUCCESS(f"Successfully aggregated data for {hour_start}. Created: {created}")
    )
