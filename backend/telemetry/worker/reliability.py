"""Operational visibility for Event Projections reliability controls."""

from __future__ import annotations

import asyncio
import datetime
import logging
from typing import Any, Final

from asgiref.sync import sync_to_async
from django.db import close_old_connections
from utils.kafka import get_kafka_consumer_lag
from utils.structured_log import log_event

logger = logging.getLogger(__name__)

PROJECTION_DLQ_TOPIC: Final[str] = "frontend-events-dlq"
PROJECTION_DLQ_REPLAY_GROUP: Final[str] = "projection-dlq-replay"
PROJECTION_DLQ_SERVICE_NAME: Final[str] = "Event Projections DLQ"
DLQ_MONITOR_INTERVAL_SECONDS: Final[int] = 60


@sync_to_async
def _record_dlq_health(status: str, depth: int | None, detail: str) -> None:
  """Materialize the latest DLQ state for the Tenant0 status surface."""
  close_old_connections()
  try:
    from monitor.models import SyntheticMonitor

    SyntheticMonitor.objects.update_or_create(
      name=PROJECTION_DLQ_SERVICE_NAME,
      defaults={
        "status": status,
        "latency_ms": None,
        "detail": detail[:500],
        "checked_at": datetime.datetime.now(datetime.timezone.utc),
      },
    )
  finally:
    close_old_connections()


async def projection_dlq_monitor_scheduler(stdout: Any, stderr: Any, style: Any) -> None:
  """Continuously report replay-group lag for the projection DLQ."""
  stdout.write(style.SUCCESS("Starting Event Projections DLQ monitor..."))
  await asyncio.sleep(20)
  while True:
    try:
      depth = await get_kafka_consumer_lag(
        PROJECTION_DLQ_TOPIC,
        PROJECTION_DLQ_REPLAY_GROUP,
      )
      status = "Operational" if depth == 0 else "Degraded"
      detail = f"{depth} projection event(s) awaiting operator replay"
      await _record_dlq_health(status, depth, detail)
      log_event(
        logger,
        logging.INFO if depth == 0 else logging.WARNING,
        "frontend_projection_dlq_depth",
        depth=depth,
        topic=PROJECTION_DLQ_TOPIC,
        replay_group=PROJECTION_DLQ_REPLAY_GROUP,
      )
      message = f"Event Projections DLQ depth: {depth}"
      if depth == 0:
        stdout.write(style.SUCCESS(message))
      else:
        stderr.write(style.WARNING(message))
    except Exception as exc:
      detail = f"Unable to read DLQ depth: {exc}"
      await _record_dlq_health("Outage", None, detail)
      log_event(
        logger,
        logging.ERROR,
        "frontend_projection_dlq_depth_failed",
        error=str(exc)[:500],
        topic=PROJECTION_DLQ_TOPIC,
      )
      stderr.write(style.ERROR(detail))
    await asyncio.sleep(DLQ_MONITOR_INTERVAL_SECONDS)
