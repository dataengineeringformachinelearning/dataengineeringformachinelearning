"""Uptime/SLA/P99 — rollups first, raw Endpoints for current partial hour only."""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Any

from django.contrib.auth import get_user_model
from django.db.models import Count, F, Q, Window
from django.db.models.functions import RowNumber, TruncDate
from django.utils import timezone
from utils.service_urls import endpoint_storage_url

from monitor.models import (
  AggregatedAnalytics,
  Endpoints,
  HealthProbeObservation,
  MonitoredService,
  StatusPage,
  StatusPageUptimeDaily,
)

User = get_user_model()


@dataclass(frozen=True)
class UptimeDay:
  date: dt.date
  status: str
  uptime: float | None


@dataclass(frozen=True)
class ServiceSnapshot:
  status: str = "Operational"
  sla: float = 100.0


@dataclass(frozen=True)
class PageMetrics:
  cumulative_sla: float = 100.0
  overall_uptime: float = 100.0
  uptime_history: list[UptimeDay] = field(default_factory=list)
  p99_latency: float = 0.0
  total_requests: int = 0
  threats_detected_24h: int = 0


class MetricsService:
  """Compute status-page metrics; prefers AggregatedAnalytics for 24h totals."""

  @staticmethod
  def for_status_page(page: StatusPage) -> PageMetrics:
    """Build page metrics from dimensionally correct uptime and account rollups."""
    is_platform = page.is_platform or page.slug == "platform-status"
    urls = [service.url for service in page.services.all()]
    return MetricsService.for_urls(
      urls,
      user=page.user,
      is_platform=is_platform,
      status_page=page,
    )

  @staticmethod
  def for_urls(
    urls: list[str],
    *,
    user: User | None = None,
    is_platform: bool = False,
    status_page: StatusPage | None = None,
  ) -> PageMetrics:
    if not urls:
      return PageMetrics(uptime_history=MetricsService._empty_history())
    if not is_platform and user is None:
      # An orphan/private page has no valid account scope. Fail closed rather
      # than falling through to an unfiltered cross-account analytics query.
      return PageMetrics(uptime_history=MetricsService._empty_history())

    lookup_urls = list(
      {u for raw in urls for u in (raw, endpoint_storage_url(raw, is_platform=is_platform)) if u}
    )

    endpoint_qs = Endpoints.objects.filter(url__in=lookup_urls).exclude(status_code=0)
    if is_platform:
      endpoint_qs = endpoint_qs.filter(is_platform=True, user__isnull=True)
    elif user:
      endpoint_qs = endpoint_qs.filter(user=user, is_platform=False)

    if status_page is not None:
      history, overall_uptime = MetricsService._uptime_history_for_status_page(
        status_page, endpoint_qs
      )
      cumulative_sla = overall_uptime
    else:
      total_count = endpoint_qs.count()
      up_count = endpoint_qs.filter(is_active=True, status_code__lt=500).count()
      cumulative_sla = round((up_count / total_count) * 100.0, 2) if total_count > 0 else 100.0
      history, overall_uptime = MetricsService._uptime_history_30d(endpoint_qs)
    p99, total_requests, threats_detected = MetricsService._metrics_24h(
      urls, user=user, is_platform=is_platform
    )

    return PageMetrics(
      cumulative_sla=cumulative_sla,
      overall_uptime=overall_uptime,
      uptime_history=history,
      p99_latency=p99,
      total_requests=total_requests,
      threats_detected_24h=threats_detected,
    )

  @staticmethod
  def _empty_history() -> list[UptimeDay]:
    today = timezone.localdate()
    days = [today - dt.timedelta(days=offset) for offset in range(29, -1, -1)]
    return [UptimeDay(date=day, status="no_data", uptime=None) for day in days]

  @staticmethod
  def _uptime_history_30d(endpoint_qs: Any) -> tuple[list[UptimeDay], float]:
    """Legacy URL-keyed fallback, aggregated in Postgres without a sample cap."""
    cutoff = timezone.now() - dt.timedelta(days=30)
    daily_rows = (
      endpoint_qs.filter(last_tested__gte=cutoff)
      .annotate(report_date=TruncDate("last_tested"))
      .values("report_date")
      .annotate(
        total_checks=Count("id"),
        successful_checks=Count("id", filter=Q(is_active=True, status_code__lt=500)),
      )
      .order_by("report_date")
    )

    today = timezone.localdate()
    days_list = [today - dt.timedelta(days=i) for i in range(30)]
    days_list.reverse()
    counts = {
      row["report_date"]: (row["successful_checks"], row["total_checks"]) for row in daily_rows
    }
    return MetricsService._history_from_counts(days_list, counts)

  @staticmethod
  def _uptime_history_for_status_page(
    status_page: StatusPage,
    endpoint_qs: Any,
  ) -> tuple[list[UptimeDay], float]:
    """Read daily page rollups and use raw probes only for missing/current days."""
    today = timezone.localdate()
    days_list = [today - dt.timedelta(days=i) for i in range(30)]
    days_list.reverse()
    first_day = days_list[0]

    rollups = StatusPageUptimeDaily.objects.filter(
      status_page=status_page,
      report_date__gte=first_day,
      report_date__lt=today,
    ).values("report_date", "successful_checks", "total_checks")
    counts: dict[dt.date, tuple[int, int]] = {
      row["report_date"]: (row["successful_checks"], row["total_checks"])
      for row in rollups
      if int(row["total_checks"] or 0) > 0
    }

    page_start = max(first_day, timezone.localtime(status_page.created_at).date())
    expected_days = {day for day in days_list if page_start <= day < today}
    missing_completed_days = expected_days.difference(counts)

    raw_start_day = min(missing_completed_days, default=today)
    raw_start = timezone.make_aware(dt.datetime.combine(raw_start_day, dt.time.min))
    raw_rows = (
      HealthProbeObservation.objects.filter(
        monitored_service__status_page=status_page,
        observed_at__gte=raw_start,
      )
      .annotate(report_date=TruncDate("observed_at"))
      .values("report_date")
      .annotate(
        total_checks=Count("id"),
        successful_checks=Count("id", filter=Q(is_active=True, status_code__lt=500)),
      )
      .order_by("report_date")
    )
    for row in raw_rows:
      report_date = row["report_date"]
      if report_date == today or report_date in missing_completed_days:
        counts[report_date] = (row["successful_checks"], row["total_checks"])

    # Compatibility for observations collected before the Rust probe projection
    # existed, and for degraded deployments where the probe writer is unavailable.
    missing_days = {day for day in days_list if day >= page_start and day not in counts}
    if missing_days:
      endpoint_start = timezone.make_aware(dt.datetime.combine(min(missing_days), dt.time.min))
      endpoint_rows = (
        endpoint_qs.filter(last_tested__gte=endpoint_start)
        .annotate(report_date=TruncDate("last_tested"))
        .values("report_date")
        .annotate(
          total_checks=Count("id"),
          successful_checks=Count("id", filter=Q(is_active=True, status_code__lt=500)),
        )
        .order_by("report_date")
      )
      for row in endpoint_rows:
        report_date = row["report_date"]
        if report_date in missing_days:
          counts[report_date] = (row["successful_checks"], row["total_checks"])

    return MetricsService._history_from_counts(days_list, counts)

  @staticmethod
  def _history_from_counts(
    days_list: list[dt.date],
    counts: dict[dt.date, tuple[int, int]],
  ) -> tuple[list[UptimeDay], float]:
    """Convert daily successful/total counts into the public uptime contract."""

    history: list[UptimeDay] = []
    total_up = 0
    total_count = 0

    for day in days_list:
      up, tot = counts.get(day, (0, 0))
      if tot <= 0:
        history.append(UptimeDay(date=day, status="no_data", uptime=None))
        continue
      ratio = up / tot
      total_up += up
      total_count += tot
      if ratio == 1.0:
        status = "operational"
      elif ratio >= 0.95:
        status = "partial_outage"
      else:
        status = "major_outage"
      history.append(UptimeDay(date=day, status=status, uptime=round(ratio * 100.0, 2)))

    overall = round((total_up / total_count) * 100.0, 2) if total_count > 0 else 100.0
    return history, overall

  @staticmethod
  def sla_for_service(service: MonitoredService) -> float:
    """Return one service SLA through the batched implementation."""
    snapshot = MetricsService.for_services([service], page=service.status_page).get(service.id)
    return snapshot.sla if snapshot else 100.0

  @staticmethod
  def for_services(
    services: list[MonitoredService],
    *,
    page: StatusPage,
  ) -> dict[Any, ServiceSnapshot]:
    """Batch current status and 30-day SLA without N raw-probe scans."""
    if not services:
      return {}

    cutoff = timezone.now() - dt.timedelta(days=30)
    today = timezone.localdate()
    service_ids = [service.id for service in services]
    probe_rows = (
      HealthProbeObservation.objects.filter(
        monitored_service_id__in=service_ids,
        observed_at__gte=cutoff,
      )
      .annotate(report_date=TruncDate("observed_at"))
      .values("monitored_service_id", "report_date")
      .annotate(
        total_checks=Count("id"),
        successful_checks=Count("id", filter=Q(is_active=True, status_code__lt=500)),
      )
    )
    probe_counts = {
      (row["monitored_service_id"], row["report_date"]): (
        int(row["successful_checks"] or 0),
        int(row["total_checks"] or 0),
      )
      for row in probe_rows
    }
    latest_probes = list(
      HealthProbeObservation.objects.filter(
        monitored_service_id__in=service_ids,
        observed_at__gte=cutoff,
      )
      .annotate(
        row_number=Window(
          expression=RowNumber(),
          partition_by=[F("monitored_service_id")],
          order_by=F("observed_at").desc(),
        )
      )
      .filter(row_number=1)
      .values("monitored_service_id", "observed_at", "is_active", "status_code")
    )
    latest_probe_by_service = {row["monitored_service_id"]: row for row in latest_probes}

    is_platform = page.is_platform or page.slug == "platform-status"
    service_urls: dict[Any, set[str]] = {}
    all_urls: set[str] = set()
    from utils.service_urls import metrics_url_for_service

    for service in services:
      metrics_url = metrics_url_for_service(service.url, is_platform=is_platform)
      urls = {
        service.url,
        metrics_url,
        endpoint_storage_url(service.url, is_platform=is_platform),
        endpoint_storage_url(metrics_url, is_platform=is_platform),
      }
      clean_urls = {url for url in urls if url}
      service_urls[service.id] = clean_urls
      all_urls.update(clean_urls)

    endpoint_qs = Endpoints.objects.filter(
      url__in=all_urls,
      last_tested__gte=cutoff,
    ).exclude(status_code=0)
    if is_platform:
      endpoint_qs = endpoint_qs.filter(is_platform=True, user__isnull=True)
    elif page.user_id:
      endpoint_qs = endpoint_qs.filter(user_id=page.user_id, is_platform=False)
    else:
      endpoint_qs = endpoint_qs.none()

    endpoint_rows = (
      endpoint_qs.annotate(report_date=TruncDate("last_tested"))
      .values("url", "report_date")
      .annotate(
        total_checks=Count("id"),
        successful_checks=Count("id", filter=Q(is_active=True, status_code__lt=500)),
      )
    )
    endpoint_counts = {
      (row["url"], row["report_date"]): (
        int(row["successful_checks"] or 0),
        int(row["total_checks"] or 0),
      )
      for row in endpoint_rows
    }
    latest_endpoints = list(
      endpoint_qs.annotate(
        row_number=Window(
          expression=RowNumber(),
          partition_by=[F("url")],
          order_by=F("last_tested").desc(),
        )
      )
      .filter(row_number=1)
      .values("url", "last_tested", "is_active", "status_code")
    )
    latest_endpoint_by_url = {row["url"]: row for row in latest_endpoints}

    snapshots: dict[Any, ServiceSnapshot] = {}
    days = [today - dt.timedelta(days=offset) for offset in range(29, -1, -1)]
    for service in services:
      successful = 0
      total = 0
      for report_date in days:
        probe_count = probe_counts.get((service.id, report_date))
        if probe_count is not None:
          day_successful, day_total = probe_count
        else:
          day_successful = 0
          day_total = 0
          for url in service_urls[service.id]:
            url_successful, url_total = endpoint_counts.get((url, report_date), (0, 0))
            day_successful += url_successful
            day_total += url_total
        successful += day_successful
        total += day_total

      latest_candidates = [
        latest_endpoint_by_url[url]
        for url in service_urls[service.id]
        if url in latest_endpoint_by_url
      ]
      latest_probe = latest_probe_by_service.get(service.id)
      if latest_probe is not None:
        latest_candidates.append(latest_probe)
      latest = max(
        latest_candidates,
        key=lambda row: row.get("observed_at") or row.get("last_tested"),
        default=None,
      )
      status = "Operational"
      if latest and (not latest["is_active"] or int(latest["status_code"]) >= 500):
        status = "Outage"
      sla = round((successful / total) * 100.0, 2) if total > 0 else 100.0
      snapshots[service.id] = ServiceSnapshot(status=status, sla=sla)

    return snapshots

  @staticmethod
  def _metrics_24h(
    urls: list[str],
    *,
    user: User | None,
    is_platform: bool,
  ) -> tuple[float, int, int]:
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
    threats_detected = sum(a.threats_detected for a in aggregated)

    agg_p99 = max((a.p99_latency_ms for a in aggregated), default=0.0)
    latencies = list(raw_qs.values_list("response_time", flat=True).order_by("-last_tested")[:5000])
    raw_p99 = 0.0
    if latencies:
      ms_list = sorted(lat.total_seconds() * 1000 for lat in latencies if lat)
      if ms_list:
        idx = min(int(len(ms_list) * 0.99), len(ms_list) - 1)
        raw_p99 = ms_list[idx]

    return round(max(agg_p99, raw_p99), 2), total_requests, threats_detected
