"""Periodic aggregation, health checks, and Lighthouse quality scans."""

from __future__ import annotations

import asyncio

from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from django.db import close_old_connections
from monitor.models import AggregatedAnalytics, Endpoints, MonitoredService, StatusPage


@sync_to_async
def log_telemetry_metrics(stdout, style):
  total = Endpoints.objects.count()
  active = Endpoints.objects.filter(is_active=True).count()
  stdout.write(
    style.SUCCESS(
      f"Telemetry Pipeline Check: {active} active endpoints ({total} total records in database)."
    )
  )


@sync_to_async
def run_aggregation_command(stdout):
  from django.core.management import call_command

  stdout.write("Triggering aggregate_analytics command from worker...")
  call_command("aggregate_analytics")


async def periodic_scheduler(stdout, stderr, style):
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


@sync_to_async
def run_lighthouse_scans(stdout, style):
  from django.utils import timezone

  from telemetry.tasks.lighthouse_scanner import LighthouseScanner

  User = get_user_model()
  close_old_connections()
  try:
    scan_targets: list[tuple[str, object | None, bool]] = []
    for page in StatusPage.objects.filter(is_platform=True):
      service = page.services.first()
      if service and service.url:
        scan_targets.append((service.url, None, True))

    for user in User.objects.filter(profile__isnull=False).select_related("profile"):
      page = StatusPage.objects.filter(user=user, is_platform=False).first()
      if not page:
        continue
      service = MonitoredService.objects.filter(status_page=page).first()
      if service and service.url:
        scan_targets.append((service.url, user, False))

    for url, user, is_platform in scan_targets:
      account_id = "platform" if is_platform else str(user.profile.account_id)
      scores = LighthouseScanner.scan_url(url, account_id=account_id)
      if not scores:
        continue

      current_hour = timezone.now().replace(minute=0, second=0, microsecond=0)
      lookup = {
        "timestamp": current_hour,
        "bucket_size": "1h",
        "is_platform": is_platform,
        "user": None if is_platform else user,
      }
      latest_agg, created = AggregatedAnalytics.objects.get_or_create(
        **lookup,
        defaults={"metadata": {"lighthouse_scores": scores}},
      )
      if not created:
        if not isinstance(latest_agg.metadata, dict):
          latest_agg.metadata = {}
        latest_agg.metadata["lighthouse_scores"] = scores
        latest_agg.save()

      label = "platform" if is_platform else user.username
      stdout.write(style.SUCCESS(f"[{label}] Lighthouse Scores: {scores}"))
  finally:
    close_old_connections()


async def quality_scanner_scheduler(stdout, stderr, style):
  stdout.write(style.SUCCESS("Starting quality (Lighthouse) scanner scheduler..."))
  await asyncio.sleep(60)
  while True:
    try:
      await run_lighthouse_scans(stdout, style)
    except Exception as e:
      stderr.write(style.ERROR(f"Error in lighthouse scanner task: {e}"))
    await asyncio.sleep(21600)
