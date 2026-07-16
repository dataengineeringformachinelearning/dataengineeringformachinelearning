"""Periodic aggregation, health checks, and Lighthouse quality scans."""

from __future__ import annotations

import asyncio
import math
import uuid
from collections.abc import Mapping
from typing import Any

from account.platform import PLATFORM_STATUS_SLUG
from asgiref.sync import sync_to_async
from django.db import close_old_connections
from django.utils import timezone
from monitor.models import Endpoints, LighthouseScan, StatusPage


@sync_to_async
def log_telemetry_metrics(stdout: Any, style: Any) -> None:
  total = Endpoints.objects.count()
  active = Endpoints.objects.filter(is_active=True).count()
  stdout.write(
    style.SUCCESS(
      f"Telemetry Pipeline Check: {active} active endpoints ({total} total records in database)."
    )
  )


@sync_to_async
def run_aggregation_command(stdout: Any) -> None:
  from django.core.management import call_command

  stdout.write("Triggering aggregate_analytics command from worker...")
  call_command("aggregate_analytics")


async def periodic_scheduler(stdout: Any, stderr: Any, style: Any) -> None:
  stdout.write(style.SUCCESS("Starting periodic telemetry health scheduler..."))
  await asyncio.sleep(10)
  while True:
    try:
      await log_telemetry_metrics(stdout, style)
    except Exception as e:
      stderr.write(style.ERROR(f"Telemetry Scheduler: Hourly check failed: {e}"))
    try:
      await run_aggregation_command(stdout)
    except Exception as e:
      stderr.write(style.ERROR(f"Telemetry Scheduler: Aggregation failed: {e}"))
    await asyncio.sleep(3600)


def _lighthouse_account_id(page: StatusPage) -> uuid.UUID | None:
  """Resolve a native UUID scope without leaking the legacy platform sentinel."""
  if page.is_platform or page.slug == PLATFORM_STATUS_SLUG:
    return page.id
  profile = getattr(page.user, "profile", None) if page.user is not None else None
  return getattr(profile, "account_id", None)


def _normalized_lighthouse_score(scores: Mapping[str, Any], key: str) -> float:
  raw_score = scores.get(key, 0.0)
  try:
    score = float(raw_score or 0.0)
  except (TypeError, ValueError):
    return 0.0
  if not math.isfinite(score):
    return 0.0
  return round(min(100.0, max(0.0, score)), 2)


def run_lighthouse_scans_sync(stdout: Any, style: Any) -> None:
  from telemetry.tasks.lighthouse_scanner import LighthouseScanner

  close_old_connections()
  try:
    scan_targets: dict[tuple[uuid.UUID, str], dict[uuid.UUID, StatusPage]] = {}
    pages = (
      StatusPage.objects.all().select_related("user", "user__profile").prefetch_related("services")
    )
    for page in pages:
      account_id = _lighthouse_account_id(page)
      if account_id is None:
        continue
      for service in page.services.all():
        if not service.url:
          continue
        target_pages = scan_targets.setdefault((account_id, service.url), {})
        target_pages[page.id] = page

    scan_bucket = timezone.now().replace(minute=0, second=0, microsecond=0)
    for (account_id, url), target_pages in scan_targets.items():
      raw_scores = LighthouseScanner.scan_url(url, account_id=str(account_id))
      if not isinstance(raw_scores, Mapping) or not raw_scores:
        continue

      scores = {
        "performance": _normalized_lighthouse_score(raw_scores, "performance"),
        "accessibility": _normalized_lighthouse_score(raw_scores, "accessibility"),
        "best_practices": _normalized_lighthouse_score(raw_scores, "best_practices"),
        "seo": _normalized_lighthouse_score(raw_scores, "seo"),
      }
      for page in target_pages.values():
        is_platform = page.is_platform or page.slug == PLATFORM_STATUS_SLUG
        LighthouseScan.objects.update_or_create(
          status_page=page,
          url=url,
          scanned_at=scan_bucket,
          defaults={
            "user": None if is_platform else page.user,
            "account_id": account_id,
            "is_platform": is_platform,
            **scores,
          },
        )
        label = "platform" if is_platform else page.user.username
        stdout.write(style.SUCCESS(f"[{label}] Lighthouse Scores for {url}: {scores}"))
  finally:
    close_old_connections()


run_lighthouse_scans = sync_to_async(run_lighthouse_scans_sync)


async def quality_scanner_scheduler(stdout: Any, stderr: Any, style: Any) -> None:
  stdout.write(style.SUCCESS("Starting quality (Lighthouse) scanner scheduler..."))
  await asyncio.sleep(60)
  while True:
    try:
      await run_lighthouse_scans(stdout, style)
    except Exception as e:
      stderr.write(style.ERROR(f"Error in lighthouse scanner task: {e}"))
    await asyncio.sleep(21600)
