"""Safely replay acknowledged Event Projections DLQ records."""

from __future__ import annotations

import asyncio
import logging
from argparse import ArgumentParser
from typing import Any

from aiokafka import AIOKafkaConsumer
from django.core.management.base import BaseCommand, CommandParser
from utils.kafka import get_kafka_brokers, get_kafka_producer
from utils.structured_log import log_event

from telemetry.worker.reliability import PROJECTION_DLQ_REPLAY_GROUP, PROJECTION_DLQ_TOPIC

logger = logging.getLogger(__name__)


class Command(BaseCommand):
  help = "Replay a bounded batch from frontend-events-dlq to frontend-events."

  def add_arguments(self, parser: ArgumentParser | CommandParser) -> None:
    parser.add_argument(
      "--max-records",
      type=int,
      default=100,
      help="Maximum DLQ records to inspect or replay (default: 100).",
    )
    parser.add_argument(
      "--timeout-ms",
      type=int,
      default=5000,
      help="How long to wait for DLQ records (default: 5000).",
    )
    parser.add_argument(
      "--dry-run",
      action="store_true",
      help="Inspect the pending batch without publishing or committing offsets.",
    )

  def handle(self, *args: Any, **options: Any) -> None:
    max_records = max(1, min(int(options["max_records"]), 1000))
    timeout_ms = max(100, min(int(options["timeout_ms"]), 30000))
    asyncio.run(self._replay(max_records, timeout_ms, bool(options["dry_run"])))

  async def _replay(self, max_records: int, timeout_ms: int, dry_run: bool) -> None:
    consumer = AIOKafkaConsumer(
      PROJECTION_DLQ_TOPIC,
      bootstrap_servers=get_kafka_brokers(),
      group_id=PROJECTION_DLQ_REPLAY_GROUP,
      auto_offset_reset="earliest",
      enable_auto_commit=False,
    )
    await consumer.start()
    try:
      records = await consumer.getmany(timeout_ms=timeout_ms, max_records=max_records)
      messages = [message for partition in records.values() for message in partition]
      if not messages:
        self.stdout.write(self.style.SUCCESS("Projection DLQ has no pending records."))
        return

      self.stdout.write(f"Found {len(messages)} pending projection DLQ record(s).")
      if dry_run:
        for message in messages:
          self.stdout.write(
            f"partition={message.partition} offset={message.offset} key={message.key!r}"
          )
        self.stdout.write(self.style.WARNING("Dry run: no records replayed or committed."))
        return

      producer = await get_kafka_producer()
      for message in messages:
        await producer.send_and_wait(
          "frontend-events",
          message.value,
          key=message.key,
          headers=[("x-deml-replayed-from", PROJECTION_DLQ_TOPIC.encode("utf-8"))],
        )

      await consumer.commit()
      log_event(
        logger,
        logging.WARNING,
        "frontend_projection_dlq_replayed",
        count=len(messages),
        source_topic=PROJECTION_DLQ_TOPIC,
        destination_topic="frontend-events",
      )
      self.stdout.write(
        self.style.SUCCESS(f"Replayed and committed {len(messages)} projection record(s).")
      )
    finally:
      await consumer.stop()
