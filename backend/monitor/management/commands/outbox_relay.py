import asyncio
import json
import logging
from datetime import timedelta

from asgiref.sync import sync_to_async
from django.core.management.base import BaseCommand
from django.utils import timezone
from utils.kafka import get_kafka_producer
from utils.structured_log import log_event, set_correlation_id

from monitor.models import OutboxEvent

logger = logging.getLogger(__name__)


class Command(BaseCommand):
  help = "Relay pending OutboxEvents to Redpanda. Run periodically or as a daemon."

  def add_arguments(self, parser):
    parser.add_argument(
      "--max-age-hours",
      type=int,
      default=24,
      help="Ignore events older than this many hours.",
    )
    parser.add_argument(
      "--batch-size",
      type=int,
      default=100,
      help="Number of events to process per batch.",
    )
    parser.add_argument(
      "--once",
      action="store_true",
      help="Run once and exit (for cron).",
    )
    parser.add_argument(
      "--poll-interval",
      type=int,
      default=5,
      help="Seconds between daemon polls.",
    )

  def handle(self, *args, **options):
    max_age = options["max_age_hours"]
    batch_size = options["batch_size"]
    run_once = options["once"]
    poll_interval = options["poll_interval"]

    log_event(logger, logging.INFO, "outbox_relay_start", run_once=run_once)

    if run_once:
      asyncio.run(self.run_once(max_age, batch_size))
    else:
      # Single long-lived event loop — avoids recreating loops every poll.
      asyncio.run(self.daemon_loop(max_age, batch_size, poll_interval))

  async def daemon_loop(self, max_age_hours: int, batch_size: int, poll_interval: int):
    while True:
      try:
        await self.run_once(max_age_hours, batch_size)
      except Exception as exc:
        log_event(
          logger,
          logging.ERROR,
          "outbox_relay_poll_error",
          error=str(exc)[:500],
        )
      await asyncio.sleep(poll_interval)

  async def run_once(self, max_age_hours: int, batch_size: int):
    cutoff = timezone.now() - timedelta(hours=max_age_hours)
    events = await sync_to_async(list)(
      OutboxEvent.objects.filter(is_published=False, created_at__gte=cutoff).order_by("created_at")[
        :batch_size
      ]
    )

    if not events:
      return

    producer = await get_kafka_producer()
    published = 0
    failed = 0

    for event in events:
      set_correlation_id(f"outbox-{event.id}")
      try:
        value = json.dumps(event.payload).encode("utf-8")
        key = event.key.encode("utf-8") if event.key else None
        headers = (
          [(k, str(v).encode()) for k, v in event.headers.items()] if event.headers else None
        )

        await producer.send_and_wait(
          event.topic,
          value=value,
          key=key,
          headers=headers,
        )

        event.is_published = True
        event.published_at = timezone.now()
        event.last_error = None
        await sync_to_async(event.save)(
          update_fields=["is_published", "published_at", "last_error"]
        )
        published += 1
        log_event(
          logger,
          logging.INFO,
          "outbox_published",
          event_id=str(event.id),
          topic=event.topic,
        )

      except Exception as e:
        failed += 1
        event.attempts += 1
        event.last_error = str(e)[:1000]
        await sync_to_async(event.save)(update_fields=["attempts", "last_error"])
        log_event(
          logger,
          logging.ERROR,
          "outbox_publish_failed",
          event_id=str(event.id),
          attempts=event.attempts,
          error=str(e)[:500],
        )

        if event.attempts >= 5:
          log_event(
            logger,
            logging.ERROR,
            "outbox_dlq_candidate",
            event_id=str(event.id),
            attempts=event.attempts,
          )

    log_event(
      logger,
      logging.INFO,
      "outbox_batch_complete",
      total=len(events),
      published=published,
      failed=failed,
    )
