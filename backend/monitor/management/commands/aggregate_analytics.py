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
    self.stdout.write("Starting analytics aggregation with tenant isolation...")
    now = timezone.now()

    # Aggregate for the previous hour
    hour_start = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
    hour_end = hour_start + timedelta(hours=1)

    from monitor.models import Tenant, Vulnerability

    # We aggregate for each tenant, plus a global bucket (tenant=None) for unassociated data
    tenants_to_process = [*list(Tenant.objects.all()), None]

    for tenant in tenants_to_process:
      # 1. Traffic & Telemetry
      endpoints_data = Endpoints.objects.filter(
        tenant=tenant, last_tested__gte=hour_start, last_tested__lt=hour_end
      )
      total_requests = endpoints_data.count()

      # If no requests and not global, we still might have threats, but usually skip if completely dead
      # But let's process it to be safe

      avg_resp = endpoints_data.aggregate(Avg("response_time"))["response_time__avg"]
      avg_latency_ms = int(avg_resp.total_seconds() * 1000) if avg_resp else 0.0
      p99_latency_ms = avg_latency_ms * 1.5 if avg_latency_ms else 0.0

      failed_requests = endpoints_data.filter(status_code__gte=400).count()
      error_rate_percent = (failed_requests / total_requests * 100) if total_requests > 0 else 0.0

      # 2. Security & Threats
      threat_intel_qs = ThreatIntelligence.objects.filter(
        tenant=tenant, timestamp__gte=hour_start, timestamp__lt=hour_end
      )
      threat_intel_count = threat_intel_qs.count()

      vuln_qs = Vulnerability.objects.filter(
        tenant=tenant, created_at__gte=hour_start, created_at__lt=hour_end
      )
      vulnerability_count = vuln_qs.count()

      threats_detected = threat_intel_count + vulnerability_count

      active_incidents = Incident.objects.filter(
        tenant=tenant, status__in=["Investigating", "Identified", "Monitoring"]
      ).count()

      # 3. Cookies
      cookies_data = CookieConsent.objects.filter(
        tenant=tenant, created_at__gte=hour_start, created_at__lt=hour_end
      )
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

      # Avoid creating completely empty rows to save space, unless there's an active incident
      if (
        total_requests == 0
        and threats_detected == 0
        and active_incidents == 0
        and cookies_data.count() == 0
      ):
        continue

      obj, created = AggregatedAnalytics.objects.update_or_create(
        tenant=tenant,
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
      self.style.SUCCESS(f"Successfully aggregated data per tenant for {hour_start}.")
    )
