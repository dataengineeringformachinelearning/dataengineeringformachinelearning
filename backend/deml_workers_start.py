"""
deml-workers: Merged Python background worker container.

Runs in a single process — three coroutines in parallel via asyncio.gather():

  1. security_worker   — threat intel, TAXII, key rotation, dark web, VACUUM ANALYZE
  2. ml_worker         — PyTorch SLA/threat model training, Kafka ml-training-events consumer
  3. task_consumer     — consumes Redpanda `internal-tasks` topic published by deml-daemon
                         cron_publisher and dispatches to Django management commands.

Replaces three separate Docker containers (ml_worker, security_worker, and the
deml-daemon cron trigger consumer) with one container sharing a Django process.

Usage (set as `command:` in docker-compose / Railway startCommand):
    python deml_workers_start.py
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys

# Ensure Django is configured before any imports.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from aiokafka import AIOKafkaConsumer
from asgiref.sync import sync_to_async
from django.core.management import call_command
from utils.kafka import get_kafka_brokers

logger = logging.getLogger("deml_workers")

# ── Allowed task names from internal-tasks topic ──────────────────────────────
# Only whitelisted commands can be triggered via the Redpanda task trigger.
# This prevents arbitrary command injection if the Redpanda topic is compromised.
ALLOWED_TASKS: frozenset[str] = frozenset(
  {
    "aggregate_analytics",
    "sync_subscriptions",
    "train_all_models",
    "db_cleanup",
  }
)


# ── Worker coroutines ─────────────────────────────────────────────────────────


async def run_security_worker() -> None:
  """Delegate to the existing security_worker management command.

  The security_worker command runs its own asyncio event loop internally via
  `asyncio.run()` — we bridge into it by calling it in an executor thread so it
  doesn't block the shared event loop.
  """
  import threading

  logger.info("deml_workers: starting security_worker thread")

  def _run() -> None:
    try:
      # call_command runs synchronously inside its own asyncio.run() call.
      call_command("security_worker")
    except Exception as exc:
      logger.exception("security_worker thread exited with error: %s", exc)

  thread = threading.Thread(target=_run, name="security_worker", daemon=True)
  thread.start()

  # Keep this coroutine alive — the thread is daemon so it will die with the process.
  while thread.is_alive():
    await asyncio.sleep(10)

  logger.error("deml_workers: security_worker thread exited — container will restart")


async def run_ml_worker() -> None:
  """Delegate to the existing ml_worker management command (same pattern)."""
  import threading

  logger.info("deml_workers: starting ml_worker thread")

  def _run() -> None:
    try:
      call_command("ml_worker")
    except Exception as exc:
      logger.exception("ml_worker thread exited with error: %s", exc)

  thread = threading.Thread(target=_run, name="ml_worker", daemon=True)
  thread.start()

  while thread.is_alive():
    await asyncio.sleep(10)

  logger.error("deml_workers: ml_worker thread exited — container will restart")


async def run_task_consumer() -> None:
  """Consume the `internal-tasks` Redpanda topic published by deml-daemon cron_publisher.

  Message schema:
      { "task": "<management_command_name>", "triggered_at": "<ISO-8601>", "source": "..." }

  On receipt the command is dispatched via Django's `call_command`. Only tasks in
  ALLOWED_TASKS are executed — all others are logged and discarded.
  """
  brokers = get_kafka_brokers()
  logger.info("deml_workers: task_consumer connecting to %s", brokers)

  consumer = AIOKafkaConsumer(
    "internal-tasks",
    bootstrap_servers=brokers,
    group_id="deml-workers-task-consumer",
    auto_offset_reset="latest",
    enable_auto_commit=True,
  )

  # Retry connection until Redpanda is healthy (mirrors existing worker pattern).
  while True:
    try:
      await consumer.start()
      logger.info("deml_workers: task_consumer connected to Redpanda")
      break
    except Exception as exc:
      logger.warning("task_consumer: connection failed — %s — retrying in 5s", exc)
      await asyncio.sleep(5)

  @sync_to_async
  def dispatch(task_name: str, triggered_at: str) -> None:
    from django.db import close_old_connections

    close_old_connections()
    try:
      logger.info("task_consumer: executing %s (triggered_at=%s)", task_name, triggered_at)
      call_command(task_name)
      logger.info("task_consumer: %s completed", task_name)
    except Exception as exc:
      logger.error("task_consumer: %s failed — %s", task_name, exc)
    finally:
      close_old_connections()

  try:
    while True:
      try:
        result = await consumer.getmany(timeout_ms=2000, max_records=10)
      except Exception as exc:
        logger.warning("task_consumer: poll error — %s — retrying in 5s", exc)
        await asyncio.sleep(5)
        continue

      if not result:
        continue

      for _tp, messages in result.items():
        for msg in messages:
          try:
            payload = json.loads(msg.value.decode("utf-8"))
            task_name: str | None = payload.get("task")
            triggered_at: str = payload.get("triggered_at", "unknown")

            if not task_name:
              logger.warning("task_consumer: message missing 'task' field — skipping")
              continue

            if task_name not in ALLOWED_TASKS:
              logger.warning(
                "task_consumer: task '%s' not in ALLOWED_TASKS — skipping",
                task_name,
              )
              continue

            await dispatch(task_name, triggered_at)

          except json.JSONDecodeError as exc:
            logger.error("task_consumer: failed to decode message — %s", exc)
          except Exception as exc:
            logger.error("task_consumer: unhandled error processing message — %s", exc)
  finally:
    await consumer.stop()
    logger.warning("deml_workers: task_consumer stopped")


# ── Entry point ───────────────────────────────────────────────────────────────


async def main() -> None:
  logger.info("deml_workers: starting all workers")
  await asyncio.gather(
    run_security_worker(),
    run_ml_worker(),
    run_task_consumer(),
    return_exceptions=True,  # Log errors from each worker independently
  )
  # If gather() returns it means all workers have exited — that's fatal.
  logger.error(
    "deml_workers: all coroutines exited — this should not happen. Container will restart."
  )
  sys.exit(1)


if __name__ == "__main__":
  logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
  )
  asyncio.run(main())
