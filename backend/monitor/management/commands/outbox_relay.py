import asyncio
import json
import logging
from datetime import timedelta

from asgiref.sync import sync_to_async
from django.core.management.base import BaseCommand
from django.utils import timezone
from utils.kafka import get_kafka_producer

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

  def handle(self, *args, **options):
    max_age = options["max_age_hours"]
    batch_size = options["batch_size"]
    run_once = options["once"]

    self.stdout.write(self.style.SUCCESS("Starting Outbox Relay..."))

    if run_once:
      asyncio.run(self.run_once(max_age, batch_size))
    else:
      # For daemon mode, loop
      while True:
        asyncio.run(self.run_once(max_age, batch_size))
        asyncio.run(asyncio.sleep(5))  # poll every 5s in daemon

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

    for event in events:
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

        self.stdout.write(self.style.SUCCESS(f"Published outbox event {event.id} to {event.topic}"))

      except Exception as e:
        event.attempts += 1
        event.last_error = str(e)[:1000]
        await sync_to_async(event.save)(update_fields=["attempts", "last_error"])
        logger.error(f"Failed to publish outbox {event.id}: {e}")

        # After 5 attempts, mark for DLQ or alert (simple: leave as is)
        if event.attempts >= 5:
          logger.error(f"Outbox event {event.id} failed {event.attempts} times - consider DLQ")

    self.stdout.write(self.style.SUCCESS(f"Processed {len(events)} outbox events"))
