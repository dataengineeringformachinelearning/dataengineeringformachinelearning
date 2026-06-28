"""Async telemetry worker — thin orchestrator over worker/* modules."""

from __future__ import annotations

import asyncio
import os

from aiokafka import AIOKafkaConsumer
from django.core.management.base import BaseCommand
from utils.kafka import get_kafka_brokers

from telemetry.worker import pingers, projectors, schedulers

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django

django.setup()


class Command(BaseCommand):
  help = "Runs the async telemetry background worker"

  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.background_tasks: set = set()

  def handle(self, *args, **options):
    self.stdout.write(self.style.SUCCESS("Starting Telemetry Worker..."))
    asyncio.run(self.run_worker())

  async def run_worker(self):
    for coro in (
      schedulers.periodic_scheduler(self.stdout, self.stderr, self.style),
      pingers.active_pinger_scheduler(self.stdout, self.stderr, self.style),
      schedulers.quality_scanner_scheduler(self.stdout, self.stderr, self.style),
    ):
      task = asyncio.create_task(coro)
      self.background_tasks.add(task)
      task.add_done_callback(self.background_tasks.discard)

    brokers = get_kafka_brokers()
    consumer = AIOKafkaConsumer(
      "app-events",
      "user-issues",
      "frontend-events",
      bootstrap_servers=brokers,
      group_id="telemetry-group",
      auto_offset_reset="earliest",
      enable_auto_commit=False,
      max_poll_records=100,
    )

    while True:
      try:
        await consumer.start()
        self.stdout.write(self.style.SUCCESS(f"Connected to Redpanda at {brokers}"))
        break
      except Exception as e:
        self.stderr.write(
          self.style.ERROR(f"Failed to start Kafka consumer: {e}. Retrying in 5s...")
        )
        await asyncio.sleep(5)

    try:
      while True:
        ok = await projectors.consume_kafka_batch(consumer, self.stdout, self.stderr, self.style)
        if not ok:
          await asyncio.sleep(5)
    finally:
      await consumer.stop()
      self.stdout.write(self.style.WARNING("Worker stopped."))

  # Delegates kept for tests and backward compatibility
  save_to_db = staticmethod(projectors.save_to_db)
  save_threat_intel_to_db = staticmethod(projectors.save_threat_intel_to_db)
  process_frontend_event = staticmethod(projectors.process_frontend_event)
  update_bug_report = staticmethod(projectors.update_bug_report)
  ping_services = staticmethod(pingers.ping_services)
