"""Materialize nightly report archives from hourly rollups.

Supports REPORT_ARCHIVE_RETENTION_DAYS (90) queryable days in Neon.

NOTE: This command is Rust-native. The deml-daemon:scheduler executes
run_archive_reports directly. This file remains as fallback AND for the
--backfill-days feature which provides user-by-user archival.
"""

import logging
from datetime import timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from utils.retention import REPORT_ARCHIVE_RETENTION_DAYS
from utils.service_urls import endpoint_storage_url, metrics_url_for_service

from monitor.models import (
  AggregatedAnalytics,
  Endpoints,
  HealthProbeObservation,
  ReportArchive,
  StatusPage,
  StatusPageUptimeDaily,
  Vulnerability,
)

logger = logging.getLogger(__name__)
User = get_user_model()

# Number of days to process in backfill mode
MAX_BACKFILL_DAYS = REPORT_ARCHIVE_RETENTION_DAYS


class Command(BaseCommand):
  help = "Create nightly report archives from hourly AggregatedAnalytics rollups"

  def add_arguments(self, parser):
    parser.add_argument(
      "--backfill-days",
      type=int,
      default=0,
      help=f"Backfill archives for the last N completed days (max {MAX_BACKFILL_DAYS}).",
    )

  def _archive_scope(self, *, user=None, is_platform: bool, report_date) -> None:
    """Aggregate hourly data into daily archive for a user/platform scope."""
    date_start = timezone.make_aware(
      timezone.datetime.combine(report_date, timezone.datetime.min.time())
    )
    date_end = date_start + timedelta(days=1)

    lookup = {
      "bucket_size": "1h",
      "is_platform": is_platform,
    }
    if is_platform:
      lookup["user"] = None
    else:
      lookup["user"] = user

    hourly_rows = list(
      AggregatedAnalytics.objects.filter(
        **lookup, timestamp__gte=date_start, timestamp__lt=date_end
      )
    )

    # Aggregate hourly rollups into daily
    total_requests = sum(a.total_requests for a in hourly_rows)
    avg_latency_ms = self._weighted_avg(hourly_rows, "avg_latency_ms", "total_requests")
    p99_latency_ms = max((a.p99_latency_ms for a in hourly_rows), default=0.0)
    threat_count = sum(a.threats_detected for a in hourly_rows)
    incident_count = max((a.active_incidents for a in hourly_rows), default=0)
    unique_visitors = max((a.unique_visitors for a in hourly_rows), default=0)
    vulnerability_filter = {"user__isnull": True} if is_platform else {"user": user}
    vulnerability_count = Vulnerability.objects.filter(
      **vulnerability_filter,
      created_at__gte=date_start,
      created_at__lt=date_end,
    ).count()

    # Error rate from weighted average
    total_errors = sum(int((a.error_rate_percent / 100.0) * a.total_requests) for a in hourly_rows)
    error_rate_percent = (
      round((total_errors / total_requests) * 100, 2) if total_requests > 0 else 0.0
    )

    if (
      total_requests == 0 and threat_count == 0 and incident_count == 0 and vulnerability_count == 0
    ):
      logger.info(
        "No data to archive for %s on %s", "platform" if is_platform else user, report_date
      )
      return

    ReportArchive.objects.update_or_create(
      user=user,
      is_platform=is_platform,
      report_date=report_date,
      defaults={
        "period_start": date_start,
        "period_end": date_end,
        "total_requests": total_requests,
        "avg_latency_ms": avg_latency_ms,
        "p99_latency_ms": p99_latency_ms,
        "error_rate_percent": error_rate_percent,
        "threats_detected": threat_count,
        "active_incidents": incident_count,
        "unique_visitors": unique_visitors,
        "total_vulnerabilities": vulnerability_count,
        "summary_json": {
          "aggregation_version": 2,
          "hourly_bucket_count": len(hourly_rows),
          "source_max_updated_at": (
            max(row.updated_at for row in hourly_rows).isoformat() if hourly_rows else None
          ),
        },
      },
    )
    logger.info(
      "Archived %s report for %s: %s requests, %s threats",
      "platform" if is_platform else "user",
      report_date,
      total_requests,
      threat_count,
    )

  def _archive_status_uptime(self, report_dates: list[timezone.datetime.date]) -> int:
    """Materialize page-scoped probe availability for the requested UTC days."""
    if not report_dates:
      return 0
    first_date = min(report_dates)
    last_date = max(report_dates)
    start = timezone.make_aware(timezone.datetime.combine(first_date, timezone.datetime.min.time()))
    end = timezone.make_aware(
      timezone.datetime.combine(last_date + timedelta(days=1), timezone.datetime.min.time())
    )
    selected_dates = set(report_dates)
    pages = list(
      StatusPage.objects.filter(created_at__lt=end)
      .only("id", "user_id", "is_platform", "slug", "created_at")
      .prefetch_related("services")
    )
    page_days = [
      (page, report_date)
      for page in pages
      for report_date in report_dates
      if timezone.localtime(page.created_at).date() <= report_date
    ]
    counts: dict[tuple[Any, Any], tuple[int, int]] = {
      (page.id, report_date): (0, 0) for page, report_date in page_days
    }
    rows = (
      HealthProbeObservation.objects.filter(observed_at__gte=start, observed_at__lt=end)
      .annotate(report_date=TruncDate("observed_at"))
      .values(
        "monitored_service__status_page_id",
        "monitored_service__status_page__user_id",
        "monitored_service__status_page__is_platform",
        "report_date",
      )
      .annotate(
        total_checks=Count("id"),
        successful_checks=Count("id", filter=Q(is_active=True, status_code__lt=500)),
      )
    )

    for row in rows:
      report_date = row["report_date"]
      total_checks = int(row["total_checks"] or 0)
      if report_date not in selected_dates or total_checks <= 0:
        continue
      successful_checks = int(row["successful_checks"] or 0)
      counts[(row["monitored_service__status_page_id"], report_date)] = (
        successful_checks,
        total_checks,
      )

    # Before native probes existed, Endpoints was the retained source. Seed only
    # zero-probe page/days from that isolated legacy evidence, then persist the
    # result so public reads stay on compact rollups instead of rescanning raw rows.
    page_urls: dict[Any, set[str]] = {}
    all_urls: set[str] = set()
    for page in pages:
      is_platform = page.is_platform or page.slug == "platform-status"
      urls: set[str] = set()
      for service in page.services.all():
        metrics_url = metrics_url_for_service(service.url, is_platform=is_platform)
        urls.update(
          {
            service.url,
            metrics_url,
            endpoint_storage_url(service.url, is_platform=is_platform),
            endpoint_storage_url(metrics_url, is_platform=is_platform),
          }
        )
      page_urls[page.id] = {url for url in urls if url}
      all_urls.update(page_urls[page.id])

    legacy_rows = (
      Endpoints.objects.filter(
        url__in=all_urls,
        last_tested__gte=start,
        last_tested__lt=end,
      )
      .exclude(status_code=0)
      .annotate(report_date=TruncDate("last_tested"))
      .values("user_id", "is_platform", "url", "report_date")
      .annotate(
        total_checks=Count("id"),
        successful_checks=Count("id", filter=Q(is_active=True, status_code__lt=500)),
      )
    )
    legacy_counts = {
      (row["user_id"], row["is_platform"], row["url"], row["report_date"]): (
        int(row["successful_checks"] or 0),
        int(row["total_checks"] or 0),
      )
      for row in legacy_rows
    }

    now = timezone.now()
    rollups: list[StatusPageUptimeDaily] = []
    for page, report_date in page_days:
      successful_checks, total_checks = counts[(page.id, report_date)]
      is_platform = page.is_platform or page.slug == "platform-status"
      if total_checks == 0:
        scope_user_id = None if is_platform else page.user_id
        for url in page_urls[page.id]:
          legacy_successful, legacy_total = legacy_counts.get(
            (scope_user_id, is_platform, url, report_date),
            (0, 0),
          )
          successful_checks += legacy_successful
          total_checks += legacy_total
      rollups.append(
        StatusPageUptimeDaily(
          status_page=page,
          user_id=page.user_id,
          is_platform=is_platform,
          report_date=report_date,
          total_checks=total_checks,
          successful_checks=successful_checks,
          uptime_percent=(
            round((successful_checks / total_checks) * 100.0, 2) if total_checks > 0 else 100.0
          ),
          created_at=now,
          updated_at=now,
        )
      )
    StatusPageUptimeDaily.objects.bulk_create(
      rollups,
      batch_size=1000,
      update_conflicts=True,
      update_fields=[
        "user",
        "is_platform",
        "total_checks",
        "successful_checks",
        "uptime_percent",
        "updated_at",
      ],
      unique_fields=["status_page", "report_date"],
    )
    return len(rollups)

  def _weighted_avg(self, qs: Any, field: str, weight_field: str, default: float = 0.0) -> float:
    """Calculate weighted average from queryset."""
    total_weight = sum(getattr(a, weight_field, 0) for a in qs)
    if total_weight == 0:
      return default
    weighted_sum = sum(getattr(a, field, 0) * getattr(a, weight_field, 0) for a in qs)
    return round(weighted_sum / total_weight, 2)

  def handle(self, *args, **options):
    backfill_days = int(options.get("backfill_days", 0))
    backfill_days = max(0, min(backfill_days, MAX_BACKFILL_DAYS))

    self.stdout.write(f"Starting nightly report archive (backfill: {backfill_days} days)...")
    self.stdout.write("Using symmetrical multi-tenant processing (includes platform scope).")

    processed_count = 0

    # Determine date range to process
    if backfill_days > 0:
      date_range = [timezone.now().date() - timedelta(days=i) for i in range(1, backfill_days + 1)]
    else:
      date_range = [timezone.now().date() - timedelta(days=1)]

    for report_date in date_range:
      # Platform scope first (Tenant0 dogfooding)
      self._archive_scope(user=None, is_platform=True, report_date=report_date)

      # Now process all tenants symmetrically
      for user in User.objects.filter(profile__isnull=False).select_related("profile"):
        self._archive_scope(user=user, is_platform=False, report_date=report_date)
        processed_count += 1

      # +1 for platform scope
      processed_count += 1

    uptime_count = self._archive_status_uptime(date_range)

    self.stdout.write(
      self.style.SUCCESS(
        f"Successfully archived {processed_count} reports and {uptime_count} status-page "
        f"uptime rollups across {len(date_range)} days."
      )
    )
