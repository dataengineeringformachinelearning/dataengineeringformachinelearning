import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.models import Avg, Count, Q
from django.utils import timezone

from monitor.models import (
  AggregatedAnalytics,
  CookieConsent,
  Endpoints,
  Incident,
  ThreatIntelligence,
  Vulnerability,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
  help = "Aggregates analytical data into the AggregatedAnalytics table"

  def _aggregate_scope(self, *, user=None, is_platform: bool, hour_start, hour_end):
    if is_platform:
      endpoint_filter = Q(is_platform=True, user__isnull=True)
      threat_filter = Q(is_platform=True, user__isnull=True)
      vuln_filter = Q(user__isnull=True)
      incident_filter = Q(status_page__is_platform=True)
      cookie_filter = Q(is_platform=True, user__isnull=True)
    else:
      endpoint_filter = Q(user=user, is_platform=False)
      threat_filter = Q(user=user, is_platform=False)
      vuln_filter = Q(user=user)
      incident_filter = Q(status_page__user=user)
      cookie_filter = Q(user=user, is_platform=False)

    endpoints_data = Endpoints.objects.filter(
      endpoint_filter, last_tested__gte=hour_start, last_tested__lt=hour_end
    )
    total_requests = endpoints_data.count()

    avg_resp = endpoints_data.aggregate(Avg("response_time"))["response_time__avg"]
    avg_latency_ms = float(avg_resp.total_seconds() * 1000) if avg_resp else 0.0

    raw_latencies = list(
      endpoints_data.values_list("response_time", flat=True).order_by("response_time")[:5000]
    )
    if raw_latencies:
      p99_idx = max(0, int(len(raw_latencies) * 0.99) - 1)
      p99_latency_ms = round(raw_latencies[p99_idx].total_seconds() * 1000, 2)
    else:
      p99_latency_ms = 0.0

    failed_requests = endpoints_data.filter(status_code__gte=400).count()
    error_rate_percent = (failed_requests / total_requests * 100) if total_requests > 0 else 0.0

    threat_intel_qs = ThreatIntelligence.objects.filter(
      threat_filter, timestamp__gte=hour_start, timestamp__lt=hour_end
    )
    threat_intel_count = threat_intel_qs.count()

    vuln_qs = Vulnerability.objects.filter(
      vuln_filter, created_at__gte=hour_start, created_at__lt=hour_end
    )
    vulnerability_count = vuln_qs.count()
    threats_detected = threat_intel_count + vulnerability_count

    active_incidents = Incident.objects.filter(
      incident_filter, status__in=["Investigating", "Identified", "Monitoring"]
    ).count()

    cookies_data = CookieConsent.objects.filter(
      cookie_filter, created_at__gte=hour_start, created_at__lt=hour_end
    )
    cookie_consents_analytical = cookies_data.filter(analytical=True).count()
    cookie_consents_marketing = cookies_data.filter(marketing=True).count()

    unique_visitors_endpoints = endpoints_data.values("ip_address").distinct().count()
    unique_visitors = max(unique_visitors_endpoints, cookies_data.count())

    widget_interactions = 0
    for ep in endpoints_data.exclude(telemetry_context__isnull=True):
      try:
        if isinstance(ep.telemetry_context, dict):
          global_agent_data = ep.telemetry_context.get("global_agent_data", {})
          clicks = global_agent_data.get("clicks", 0)
          widget_interactions += clicks
      except Exception as e:
        logger.warning(f"Failed to parse telemetry context for endpoint {ep.id}: {e}")

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

    if (
      total_requests == 0
      and threats_detected == 0
      and active_incidents == 0
      and cookies_data.count() == 0
    ):
      return

    lookup = {"timestamp": hour_start, "bucket_size": "1h", "is_platform": is_platform}
    if is_platform:
      lookup["user"] = None
    else:
      lookup["user"] = user

    AggregatedAnalytics.objects.update_or_create(
      **lookup,
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

  def handle(self, *args, **options):
    self.stdout.write("Starting analytics aggregation with user isolation...")
    now = timezone.now()

    hour_start = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
    hour_end = hour_start + timedelta(hours=1)

    for user in User.objects.filter(profile__isnull=False).select_related("profile"):
      self._aggregate_scope(user=user, is_platform=False, hour_start=hour_start, hour_end=hour_end)

    self._aggregate_scope(user=None, is_platform=True, hour_start=hour_start, hour_end=hour_end)

    self.stdout.write(
      self.style.SUCCESS(f"Successfully aggregated data per account for {hour_start}.")
    )
