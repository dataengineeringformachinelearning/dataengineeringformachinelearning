from __future__ import annotations

import asyncio
from datetime import timedelta
from typing import Final

from account.lifecycle import process_pending_lifecycle_jobs
from agent.api import _record_delivery_failure, deliver_bug_report
from asgiref.sync import sync_to_async
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from forjd.client import close_forjd_connector

from monitor.models import BugReport

REPORT_DELIVERY_CONCURRENCY: Final[int] = 8


class Command(BaseCommand):
  help = "Retry durable DEML issue-report outbox rows against FORJD"

  def add_arguments(self, parser) -> None:
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--watch", action="store_true")
    parser.add_argument("--interval", type=float, default=30.0)

  def handle(self, *args, **options) -> None:
    limit = max(1, min(int(options["limit"]), 1000))
    interval = max(5.0, min(float(options["interval"]), 300.0))
    asyncio.run(
      self._run(
        limit=limit,
        watch=bool(options["watch"]),
        interval=interval,
      )
    )

  async def _run(self, *, limit: int, watch: bool, interval: float) -> None:
    """Keep one event loop and connector alive for the worker's whole process."""
    try:
      while True:
        lifecycle_completed = await sync_to_async(process_pending_lifecycle_jobs)(
          limit=min(limit, 20)
        )
        delivered, deferred = await self._reconcile_once(limit)
        self.stdout.write(
          self.style.SUCCESS(
            "DEML durable reconciliation complete "
            f"lifecycle_completed={lifecycle_completed} "
            f"reports_delivered={delivered} reports_deferred={deferred}"
          )
        )
        if not watch:
          return
        await asyncio.sleep(interval)
    finally:
      await close_forjd_connector()

  async def _reconcile_once(self, limit: int) -> tuple[int, int]:
    """Claim only work that can begin immediately under the active lease."""
    remaining = limit
    delivered_total = 0
    deferred_total = 0
    while remaining > 0:
      claim_size = min(remaining, REPORT_DELIVERY_CONCURRENCY)
      reports = await sync_to_async(self._claim_reports)(claim_size)
      if not reports:
        break
      delivered, deferred = await self._deliver_reports(reports)
      delivered_total += delivered
      deferred_total += deferred
      remaining -= len(reports)
    return delivered_total, deferred_total

  def _claim_reports(self, limit: int) -> list[BugReport]:
    # next_delivery_at doubles as a bounded claim lease. SKIP LOCKED permits
    # multiple app machines without holding a DB transaction over the network.
    with transaction.atomic():
      reports = list(
        BugReport.objects.select_for_update(skip_locked=True)
        .select_related("user")
        .filter(delivery_status=BugReport.DeliveryStatus.PENDING)
        .filter(Q(next_delivery_at__isnull=True) | Q(next_delivery_at__lte=timezone.now()))
        .order_by("created_at")[:limit]
      )
      lease_until = timezone.now() + timedelta(minutes=5)
      BugReport.objects.filter(pk__in=[report.pk for report in reports]).update(
        next_delivery_at=lease_until
      )
    return reports

  async def _deliver_report(
    self,
    report: BugReport,
    semaphore: asyncio.Semaphore,
  ) -> bool:
    async with semaphore:
      try:
        await deliver_bug_report(report, account_id=report.account_id)
        return True
      except Exception as exc:
        await _record_delivery_failure(report, exc)
        return False

  async def _deliver_reports(self, reports: list[BugReport]) -> tuple[int, int]:
    semaphore = asyncio.Semaphore(REPORT_DELIVERY_CONCURRENCY)
    outcomes = await asyncio.gather(
      *(self._deliver_report(report, semaphore) for report in reports)
    )
    delivered = sum(outcomes)
    return delivered, len(outcomes) - delivered
