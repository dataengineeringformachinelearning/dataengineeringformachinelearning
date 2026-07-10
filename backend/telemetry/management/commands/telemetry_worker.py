"""Async telemetry worker — thin orchestrator over worker/* modules."""

from __future__ import annotations

import asyncio
import os

from aiokafka import AIOKafkaConsumer
from django.core.management.base import BaseCommand
from utils.kafka import get_kafka_brokers

from telemetry.worker import pingers, projectors, reliability, schedulers, synthetic

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
    coros = []

    # Rollback-only switch. Production ownership belongs to the Rust scheduler and
    # probe roles; enabling this while those roles run would duplicate work.
    if os.environ.get("PYTHON_EMBEDDED_SCHEDULERS_ENABLED", "0") == "1":
      coros.extend(
        [
          schedulers.periodic_scheduler(self.stdout, self.stderr, self.style),
          pingers.active_pinger_scheduler(self.stdout, self.stderr, self.style),
          schedulers.quality_scanner_scheduler(self.stdout, self.stderr, self.style),
        ]
      )

    # Firestore inbox poller is the resilient fallback for client commands
    # (e.g. when Cloud Functions cannot reach Redpanda). With a public SASL-authenticated
    # Redpanda endpoint the direct publish path is used and this is rarely exercised.
    # Set FIRESTORE_INBOX_POLL_ENABLED=0 to disable if you want zero polling.
    if os.environ.get("FIRESTORE_INBOX_POLL_ENABLED", "1") != "0":
      coros.append(projectors.poll_firestore_inbox(self.stdout, self.stderr, self.style))

    # Automated synthetic health probe for the Event Projections loop (replaces the old
    # manual Settings verification button); result surfaces on the platform status page.
    # Set EVENT_PROJECTIONS_MONITOR_ENABLED=0 to disable.
    if os.environ.get("EVENT_PROJECTIONS_MONITOR_ENABLED", "1") != "0":
      coros.append(
        synthetic.event_projections_monitor_scheduler(self.stdout, self.stderr, self.style)
      )

    if os.environ.get("EVENT_PROJECTIONS_DLQ_MONITOR_ENABLED", "1") != "0":
      coros.append(
        reliability.projection_dlq_monitor_scheduler(self.stdout, self.stderr, self.style)
      )

    brokers = get_kafka_brokers()
    coros.extend(
      [
        self.consume_topic(brokers, "frontend-events", "frontend-projection-group-v2"),
        self.consume_topic(brokers, "user-issues", "user-issues-group-v1"),
        self.consume_topic(brokers, "app-events", "app-control-group-v1"),
      ]
    )
    # Any uncaught loop failure is fatal so the orchestrator restarts the service;
    # no background task is allowed to disappear silently.
    await asyncio.gather(*coros)

  async def consume_topic(self, brokers: str, topic: str, group_id: str) -> None:
    consumer = AIOKafkaConsumer(
      topic,
      bootstrap_servers=brokers,
      group_id=group_id,
      auto_offset_reset="earliest",
      enable_auto_commit=False,
      max_poll_records=100,
    )
    while True:
      try:
        await consumer.start()
        self.stdout.write(self.style.SUCCESS(f"Connected {group_id} to {topic} at {brokers}"))
        break
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Failed to start {group_id}: {e}; retrying in 5s"))
        await asyncio.sleep(5)
    try:
      while True:
        ok = await projectors.consume_kafka_batch(consumer, self.stdout, self.stderr, self.style)
        if not ok:
          await asyncio.sleep(5)
    finally:
      await consumer.stop()

  # Delegates kept for tests and backward compatibility
  save_to_db = staticmethod(projectors.save_to_db)
  save_threat_intel_to_db = staticmethod(projectors.save_threat_intel_to_db)
  process_frontend_event = staticmethod(projectors.process_frontend_event)
  process_pending_frontend_commands = staticmethod(projectors.process_pending_frontend_commands)
  update_bug_report = staticmethod(projectors.update_bug_report)
  ping_services = staticmethod(pingers.ping_services)
