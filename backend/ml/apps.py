import asyncio
import json
import logging
import os
import threading

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class MlConfig(AppConfig):
  default_auto_field = "django.db.models.BigAutoField"
  name = "ml"

  def ready(self):
    import ml.signals  # noqa

    # Only start the thread in the main process (skip Django's auto-reloader process)
    if os.environ.get("RUN_MAIN") == "true" or not os.environ.get("DJANGO_SETTINGS_MODULE"):
      threading.Thread(target=self.start_scheduler, daemon=True).start()

  def start_scheduler(self):
    import time

    # Give Django setup a brief moment to settle down
    time.sleep(5)

    self.trigger_training_job()

    # Run every hour
    while True:
      time.sleep(3600)
      self.trigger_training_job()

  def trigger_training_job(self):
    logger.info("ML Engine Scheduler: Publishing training trigger to Redpanda...")
    try:
      asyncio.run(self.publish_trigger())
      logger.info("ML Engine Scheduler: Training trigger published successfully.")
    except Exception as e:
      logger.error(f"ML Engine Scheduler: Failed to publish training trigger: {e}")

  async def publish_trigger(self):
    # Lazy import: avoids pulling aiokafka (and Redpanda stack) at module load.
    # Enables clean core test runs (sqlite) and keeps worker deps isolated to runtime paths.
    # Cursor - Grok 4.3
    from utils.kafka import create_kafka_producer

    producer = create_kafka_producer()
    async with producer:
      msg = {"action": "train_all_tenants"}
      await producer.send_and_wait("ml-training-events", json.dumps(msg).encode("utf-8"))
