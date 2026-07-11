"""Materialize nightly report archives from hourly rollups.

Supports 180-day report queries via ReportArchive. The worker processes
yesterday's data into daily rollups, keeping materialized data for fast reads.
Beyond 180 days, analytics are available via ClickHouse for long-term storage.
"""

import logging
from datetime import timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from monitor.models import AggregatedAnalytics, ReportArchive

logger = logging.getLogger(__name__)
User = get_user_model()


# Number of days to process in backfill mode
MAX_BACKFILL_DAYS = 180


class Command(BaseCommand):
  help = "Create nightly report archives from hourly AggregatedAnalytics rollups"

  def add_arguments(self, parser):
    parser.add_argument(
      "--backfill-days",
      type=int,
      default=0,
      help="Backfill archives for the last N days (max 180). Useful for initial migration.",
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

    hourly_qs = AggregatedAnalytics.objects.filter(**lookup)
    hourly_qs = hourly_qs.filter(timestamp__gte=date_start, timestamp__lt=date_end)

    # Aggregate hourly rollups into daily
    total_requests = sum(a.total_requests for a in hourly_qs)
    avg_latency_ms = self._weighted_avg(hourly_qs, "avg_latency_ms", "total_requests")
    p99_latency_ms = max((a.p99_latency_ms for a in hourly_qs), default=0.0)
    threat_count = sum(a.threats_detected for a in hourly_qs)
    incident_count = sum(a.active_incidents for a in hourly_qs)
    unique_visitors = max((a.unique_visitors for a in hourly_qs), default=0)

    # Error rate from weighted average
    total_errors = sum(
      int((a.error_rate_percent / 100.0) * a.total_requests) for a in hourly_qs
    )
    error_rate_percent = (
      round((total_errors / total_requests) * 100, 2) if total_requests > 0 else 0.0
    )

    if total_requests == 0 and threat_count == 0:
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
        "summary_json": {"hourly_bucket_count": hourly_qs.count()},
      },
    )
    logger.info(
      "Archived %s report for %s: %s requests, %s threats",
      "platform" if is_platform else "user",
      report_date,
      total_requests,
      threat_count,
    )

  def _weighted_avg(
    self, qs: Any, field: str, weight_field: str, default: float = 0.0
  ) -> float:
    """Calculate weighted average from queryset."""
    total_weight = sum(getattr(a, weight_field, 0) for a in qs)
    if total_weight == 0:
      return default
    weighted_sum = sum(getattr(a, field, 0) * getattr(a, weight_field, 0) for a in qs)
    return round(weighted_sum / total_weight, 2)

  def handle(self, *args, **options):
    backfill_days = int(options.get("backfill_days", 0))
    backfill_days = max(0, min(backfill_days, MAX_BACKFILL_DAYS))

    self.stdout.write(
      f"Starting nightly report archive (backfill: {backfill_days} days)..."
    )
    self.stdout.write("Using symmetrical multi-tenant processing (includes platform scope).")

    processed_count = 0

    # Determine date range to process
    if backfill_days > 0:
      date_range = [
        timezone.now().date() - timedelta(days=i) for i in range(1, backfill_days + 1)
      ]
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

    self.stdout.write(
      self.style.SUCCESS(
        f"Successfully archived {processed_count} reports across {len(date_range)} days."
      )
    )