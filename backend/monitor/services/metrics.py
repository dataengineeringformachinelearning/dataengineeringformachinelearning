"""Uptime/SLA/P99 — rollups first, raw Endpoints for current partial hour only."""

from __future__ import annotations

import datetime as dt
from collections import defaultdict
from dataclasses import dataclass, field

from django.contrib.auth import get_user_model
from django.utils import timezone
from utils.service_urls import endpoint_storage_url

from monitor.models import AggregatedAnalytics, Endpoints

User = get_user_model()


@dataclass(frozen=True)
class UptimeDay:
  status: str
  uptime: float


@dataclass(frozen=True)
class PageMetrics:
  cumulative_sla: float = 100.0
  overall_uptime: float = 100.0
  uptime_history: list[UptimeDay] = field(default_factory=list)
  p99_latency: float = 0.0
  total_requests: int = 0


class MetricsService:
  """Compute status-page metrics; prefers AggregatedAnalytics for 24h totals."""

  @staticmethod
  def for_urls(
    urls: list[str],
    *,
    user: User | None = None,
    is_platform: bool = False,
  ) -> PageMetrics:
    if not urls:
      return PageMetrics(uptime_history=[UptimeDay("no_data", 100.0) for _ in range(30)])

    lookup_urls = list(
      {u for raw in urls for u in (raw, endpoint_storage_url(raw, is_platform=is_platform)) if u}
    )

    endpoint_qs = Endpoints.objects.filter(url__in=lookup_urls).exclude(status_code=0)
    if is_platform:
      endpoint_qs = endpoint_qs.filter(is_platform=True, user__isnull=True)
    elif user:
      endpoint_qs = endpoint_qs.filter(user=user, is_platform=False)

    total_count = endpoint_qs.count()
    up_count = endpoint_qs.filter(is_active=True, status_code__lt=500).count()
    cumulative_sla = round((up_count / total_count) * 100.0, 2) if total_count > 0 else 100.0

    history, overall_uptime = MetricsService._uptime_history_30d(endpoint_qs)
    p99, total_requests = MetricsService._metrics_24h(urls, user=user, is_platform=is_platform)

    return PageMetrics(
      cumulative_sla=cumulative_sla,
      overall_uptime=overall_uptime,
      uptime_history=history,
      p99_latency=p99,
      total_requests=total_requests,
    )

  @staticmethod
  def _uptime_history_30d(endpoint_qs) -> tuple[list[UptimeDay], float]:
    cutoff = timezone.now() - dt.timedelta(days=30)
    logs = (
      endpoint_qs.filter(last_tested__gte=cutoff)
      .values_list("last_tested", "is_active", "status_code")
      .order_by("-last_tested")[:15000]
    )

    today = timezone.now().date()
    days_list = [today - dt.timedelta(days=i) for i in range(30)]
    days_list.reverse()

    daily_logs: dict = defaultdict(list)
    for last_tested, is_active, status_code in logs:
      daily_logs[last_tested.date()].append((is_active, status_code))

    history: list[UptimeDay] = []
    total_up = 0
    total_count = 0

    for day in days_list:
      day_logs = daily_logs[day]
      if not day_logs:
        history.append(UptimeDay("no_data", 100.0))
        continue
      tot = len(day_logs)
      up = sum(1 for active, code in day_logs if active and code < 500)
      ratio = up / tot if tot else 1.0
      total_up += up
      total_count += tot
      if ratio == 1.0:
        status = "operational"
      elif ratio >= 0.95:
        status = "partial_outage"
      else:
        status = "major_outage"
      history.append(UptimeDay(status, round(ratio * 100.0, 2)))

    overall = round((total_up / total_count) * 100.0, 2) if total_count > 0 else 100.0
    return history, overall

  @staticmethod
  def _metrics_24h(
    urls: list[str],
    *,
    user: User | None,
    is_platform: bool,
  ) -> tuple[float, int]:
    now = timezone.now()
    last_24h = now - dt.timedelta(hours=24)

    if is_platform:
      agg_filter = {"is_platform": True, "user__isnull": True}
      ep_filter = {"is_platform": True, "user__isnull": True}
    elif user:
      agg_filter = {"user": user, "is_platform": False}
      ep_filter = {"user": user, "is_platform": False}
    else:
      agg_filter = {}
      ep_filter = {}

    aggregated = list(
      AggregatedAnalytics.objects.filter(
        **agg_filter, timestamp__gte=last_24h, bucket_size="1h"
      ).order_by("timestamp")
    )

    raw_start = last_24h
    if aggregated:
      raw_start = max(a.timestamp for a in aggregated) + dt.timedelta(hours=1)

    raw_qs = Endpoints.objects.filter(
      url__in=list(
        {u for raw in urls for u in (raw, endpoint_storage_url(raw, is_platform=is_platform)) if u}
      ),
      last_tested__gte=raw_start,
      last_tested__lt=now,
      **ep_filter,
    ).exclude(status_code=0)
    raw_count = raw_qs.count()
    total_requests = sum(a.total_requests for a in aggregated) + raw_count

    agg_p99 = max((a.p99_latency_ms for a in aggregated), default=0.0)
    latencies = list(raw_qs.values_list("response_time", flat=True).order_by("-last_tested")[:5000])
    raw_p99 = 0.0
    if latencies:
      ms_list = sorted(lat.total_seconds() * 1000 for lat in latencies if lat)
      if ms_list:
        idx = min(int(len(ms_list) * 0.99), len(ms_list) - 1)
        raw_p99 = ms_list[idx]

    return round(max(agg_p99, raw_p99), 2), total_requests
