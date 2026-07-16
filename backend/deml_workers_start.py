"""
deml-workers: Merged Python background worker container.

Runs in a single process — three coroutines in parallel via asyncio.gather():

  1. ml_worker         — Kafka ml-training-events consumer (periodic scheduling disabled)
  2. lifecycle_worker  — continuous account deletion queue + auth/Stripe/sites reconciliation retries
  3. task_consumer     — consumes durable Redpanda task runs published by the Rust
                         scheduler and dispatches Django management commands.

Replaces the former ML/security interval schedulers with one execution service.
Rust owns schedule publication; this process owns only command execution.

Usage (set as `command:` in docker-compose / Railway startCommand):
    python deml_workers_start.py
"""

from __future__ import annotations

import asyncio
import datetime
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
from utils.kafka import (
  decode_kafka_value,
  get_kafka_brokers,
  get_kafka_client_config,
  get_kafka_producer,
  send_kafka_value,
)

logger = logging.getLogger("deml_workers")

# ── Allowed task names from internal-tasks topic ──────────────────────────────
# Only whitelisted commands can be triggered via the Redpanda task trigger.
# This prevents arbitrary command injection if the Redpanda topic is compromised.
#
# Rust-native tasks (db_cleanup, optimize_database, archive_reports, cleanup_clickhouse)
# are executed directly by deml-daemon:scheduler and NOT published to Kafka.
# They are listed here for documentation but should not be dispatched by workers.
ALLOWED_TASKS: frozenset[str] = frozenset(
  {
    "aggregate_analytics",
    "sync_subscriptions",
    "reconcile_accounts",
    "train_all_models",
    "fetch_threat_intel",
    "generate_export",
    "ingest_taxii",
    "run_lighthouse_scans",
    "enrich_web_technologies",
    "rotate_keys_if_due",
    "scan_dark_web",
  }
)


# ── Worker coroutines ─────────────────────────────────────────────────────────


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

  raise RuntimeError("ml_worker thread exited")


async def run_lifecycle_worker() -> None:
  """Process pending account deletion jobs continuously."""
  import threading

  logger.info("deml_workers: starting lifecycle_worker thread")

  def _run() -> None:
    try:
      call_command("lifecycle_worker")
    except Exception as exc:
      logger.exception("lifecycle_worker thread exited with error: %s", exc)

  thread = threading.Thread(target=_run, name="lifecycle_worker", daemon=True)
  thread.start()

  while thread.is_alive():
    await asyncio.sleep(10)

  raise RuntimeError("lifecycle_worker thread exited")


async def run_task_consumer() -> None:
  """Consume the `internal-tasks` Redpanda topic published by deml-daemon cron_publisher.

  Message schema:
      { "task": "<management_command_name>", "triggered_at": "<ISO-8601>", "source": "..." }

  On receipt the command is dispatched via Django's `call_command`. Only tasks in
  ALLOWED_TASKS are executed. Invalid records are committed only after the task
  DLQ acknowledges them.
  """
  brokers = get_kafka_brokers()
  logger.info("deml_workers: task_consumer connecting to %s", brokers)

  consumer = AIOKafkaConsumer(
    "internal-tasks",
    **get_kafka_client_config(),
    group_id="deml-workers-task-consumer",
    auto_offset_reset="latest",
    enable_auto_commit=False,
    max_poll_records=1,
    max_poll_interval_ms=86_400_000,
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
  def claim_run(run_id: str) -> str:
    from django.db import close_old_connections, transaction
    from django.utils import timezone
    from monitor.models import ScheduledTaskRun

    close_old_connections()
    try:
      with transaction.atomic():
        try:
          run = ScheduledTaskRun.objects.select_for_update().get(id=run_id)
        except ScheduledTaskRun.DoesNotExist:
          return "missing"
        if run.state == ScheduledTaskRun.State.COMPLETED:
          return "completed"
        now = timezone.now()
        # Reclaim RUNNING only after lease expiry (worker crash / deploy mid-task).
        # Before expiry another worker still owns the run — do not spin forever.
        if run.state == ScheduledTaskRun.State.RUNNING:
          if run.lease_expires_at and run.lease_expires_at > now:
            return "busy"
          # Lease expired: allow reclaim
        elif run.state not in {
          ScheduledTaskRun.State.PUBLISHED,
          ScheduledTaskRun.State.FAILED,
        }:
          return "busy"
        run.state = ScheduledTaskRun.State.RUNNING
        run.started_at = now
        run.lease_expires_at = now + datetime.timedelta(hours=24)
        run.save(update_fields=["state", "started_at", "lease_expires_at", "updated_at"])
        return "claimed"
    finally:
      close_old_connections()

  async def dead_letter(msg: object, reason: str) -> None:
    producer = await get_kafka_producer()
    raw_value = getattr(msg, "value", b"")
    source_topic = str(getattr(msg, "topic", "internal-tasks"))
    plaintext = decode_kafka_value(raw_value, source_topic)
    await send_kafka_value(
      producer,
      "internal-tasks-dlq",
      value=plaintext,
      headers=[
        ("x-deml-error", reason[:500].encode("utf-8", errors="replace")),
        ("x-deml-source-topic", source_topic.encode("utf-8")),
      ],
    )

  @sync_to_async
  def dispatch(
    run_id: str,
    task_name: str,
    triggered_at: str,
    scheduled_for: str,
  ) -> None:
    from django.db import close_old_connections
    from django.utils import timezone
    from monitor.models import ScheduledTaskRun

    close_old_connections()
    try:
      logger.info("task_consumer: executing %s (triggered_at=%s)", task_name, triggered_at)
      if task_name == "aggregate_analytics":
        call_command(task_name, scheduled_for=scheduled_for)
      else:
        call_command(task_name)
      ScheduledTaskRun.objects.filter(id=run_id).update(
        state=ScheduledTaskRun.State.COMPLETED,
        completed_at=timezone.now(),
        claimed_by=None,
        lease_expires_at=None,
        last_error="",
      )
      logger.info("task_consumer: %s completed", task_name)
    except Exception as exc:
      ScheduledTaskRun.objects.filter(id=run_id).update(
        state=ScheduledTaskRun.State.FAILED,
        claimed_by=None,
        lease_expires_at=timezone.now() + datetime.timedelta(seconds=30),
        last_error=str(exc)[:1000],
      )
      logger.exception("task_consumer: %s failed", task_name)
      raise
    finally:
      close_old_connections()

  try:
    while True:
      try:
        result = await consumer.getmany(timeout_ms=2000, max_records=1)
      except Exception as exc:
        logger.warning("task_consumer: poll error — %s — retrying in 5s", exc)
        await asyncio.sleep(5)
        continue

      if not result:
        continue

      for _tp, messages in result.items():
        for msg in messages:
          try:
            payload = json.loads(decode_kafka_value(msg.value, _tp.topic))
            task_name: str | None = payload.get("task")
            run_id: str | None = payload.get("run_id")
            triggered_at: str = payload.get("triggered_at", "unknown")
            scheduled_for: str = payload.get("scheduled_for", triggered_at)

            if not task_name or not run_id:
              logger.warning("task_consumer: message missing task or run_id — dead-lettering")
              await dead_letter(msg, "message missing task or run_id")
              await consumer.commit()
              continue

            if task_name not in ALLOWED_TASKS:
              logger.warning(
                "task_consumer: task '%s' not in ALLOWED_TASKS — dead-lettering",
                task_name,
              )
              await dead_letter(msg, f"task {task_name!r} is not allowed")
              await consumer.commit()
              continue

            claim_state = await claim_run(run_id)
            if claim_state == "completed":
              logger.info("task_consumer: run %s already completed", run_id)
              await consumer.commit()
              continue
            if claim_state == "missing":
              logger.warning("task_consumer: run %s does not exist — dead-lettering", run_id)
              await dead_letter(msg, f"scheduled run {run_id!r} does not exist")
              await consumer.commit()
              continue
            if claim_state != "claimed":
              # Busy lease: skip this offset so later tasks on the partition can run.
              # Scheduler republishes after lease expiry; claim_run reclaims then.
              logger.warning(
                "task_consumer: run %s is currently owned elsewhere — committing past offset",
                run_id,
              )
              await consumer.commit()
              continue

            try:
              await dispatch(run_id, task_name, triggered_at, scheduled_for)
            finally:
              # Success is durable before acknowledgement. Failure is also durable;
              # the Rust scheduler will republish the same run after its retry lease.
              await consumer.commit()

          except json.JSONDecodeError as exc:
            logger.error("task_consumer: failed to decode message — %s", exc)
            await dead_letter(msg, f"invalid JSON: {exc}")
            await consumer.commit()
          except Exception as exc:
            logger.error("task_consumer: unhandled error processing message — %s", exc)
  finally:
    await consumer.stop()
    logger.warning("deml_workers: task_consumer stopped")


# ── Entry point ───────────────────────────────────────────────────────────────


async def main() -> None:
  logger.info("deml_workers: starting all workers")
  await asyncio.gather(
    run_ml_worker(),
    run_lifecycle_worker(),
    run_task_consumer(),
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
