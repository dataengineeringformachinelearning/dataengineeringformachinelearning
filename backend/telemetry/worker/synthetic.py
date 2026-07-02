"""Automated synthetic health probe for the Event Projections loop.

Replaces the old manual "Event Projections Verification" button in Settings. The
telemetry worker periodically publishes a synthetic event to Redpanda and verifies it
is projected into Firestore, then records the result into a ``SyntheticMonitor`` row
that the platform status page renders as a component.

Exercised path: worker -> Redpanda ``frontend-events`` -> worker consumer ->
``_project_frontend_event`` -> Firestore ``users/{uid}/data/stats``.
"""

from __future__ import annotations

import asyncio
import datetime
import json
import os
import time

from asgiref.sync import sync_to_async
from django.db import close_old_connections
from utils.kafka import get_kafka_producer

# Reserved, non-real user id used only by the synthetic probe. The projector skips
# idempotency dedup for this uid so every probe re-projects (see projectors.py).
SYNTHETIC_HEALTH_UID = "deml_projection_healthcheck"

# Name of the component shown on the platform status page.
EVENT_PROJECTIONS_SERVICE_NAME = "Event Projections"

PROBE_INTERVAL_SECONDS = 60
PROBE_TIMEOUT_SECONDS = 45
PROBE_POLL_SECONDS = 2
DIRECT_PROJECTION_FALLBACK_SECONDS = 12


@sync_to_async
def _read_stats_probe_marker():
  """Return (last_updated, probe_nonce) for exact verification of this run's projection."""
  from firebase_admin import firestore

  db = firestore.client(database_id="deml")
  snap = (
    db.collection("users").document(SYNTHETIC_HEALTH_UID).collection("data").document("stats").get()
  )
  if not snap.exists:
    return (None, None)
  data = snap.to_dict() or {}
  return (data.get("last_updated"), data.get("probe_nonce"))


@sync_to_async
def _record_health(status: str, latency_ms: int | None, detail: str) -> None:
  close_old_connections()
  try:
    from monitor.models import SyntheticMonitor

    SyntheticMonitor.objects.update_or_create(
      name=EVENT_PROJECTIONS_SERVICE_NAME,
      defaults={
        "status": status,
        "latency_ms": latency_ms,
        "detail": (detail or "")[:500],
        "checked_at": datetime.datetime.now(datetime.timezone.utc),
      },
    )
  finally:
    close_old_connections()


async def _run_probe() -> tuple[str, int | None, str]:
  """Publish a synthetic event and wait for the projection. Returns (status, latency_ms, detail)."""
  from telemetry.worker.projectors import _project_frontend_event

  start = time.monotonic()
  probe_nonce = f"probe_{int(time.time() * 1000)}_{os.urandom(3).hex()}"
  event = {
    "uid": SYNTHETIC_HEALTH_UID,
    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "version": "1.0",
    "payload": {"action": "get_stats", "source": "synthetic_monitor", "probe_nonce": probe_nonce},
  }

  kafka_ok = False
  try:
    producer = await get_kafka_producer()
    await producer.send_and_wait(
      "frontend-events",
      value=json.dumps(event).encode("utf-8"),
      key=SYNTHETIC_HEALTH_UID.encode("utf-8"),
    )
    kafka_ok = True
  except Exception as e:  # broker unreachable / not producing
    # Fall back to direct projection so Firestore path is still validated.
    try:
      await sync_to_async(_project_frontend_event)(
        None,
        None,
        SYNTHETIC_HEALTH_UID,
        "get_stats",
        event["payload"],
        None,
      )
      _, current_nonce = await _read_stats_probe_marker()
      if current_nonce and current_nonce == probe_nonce:
        latency_ms = int((time.monotonic() - start) * 1000)
        return (
          "Degraded",
          latency_ms,
          f"Broker publish failed ({e}); direct projection OK",
        )
    except Exception as direct_err:
      return "Outage", None, f"Broker publish failed: {e}; direct projection failed: {direct_err}"

  deadline = time.monotonic() + PROBE_TIMEOUT_SECONDS
  direct_fallback_used = False
  while time.monotonic() < deadline:
    await asyncio.sleep(PROBE_POLL_SECONDS)
    _, current_nonce = await _read_stats_probe_marker()
    if current_nonce and current_nonce == probe_nonce:
      latency_ms = int((time.monotonic() - start) * 1000)
      if direct_fallback_used:
        return (
          "Degraded",
          latency_ms,
          "Projection OK via direct fallback; Kafka consumer lag or unavailable",
        )
      return "Operational", latency_ms, "Projection round-trip OK"

    elapsed = time.monotonic() - start
    if kafka_ok and not direct_fallback_used and elapsed >= DIRECT_PROJECTION_FALLBACK_SECONDS:
      try:
        await sync_to_async(_project_frontend_event)(
          None,
          None,
          SYNTHETIC_HEALTH_UID,
          "get_stats",
          event["payload"],
          None,
        )
        direct_fallback_used = True
      except Exception:
        pass

  return "Outage", None, f"No Firestore projection within {PROBE_TIMEOUT_SECONDS}s"


async def event_projections_monitor_scheduler(stdout, stderr, style) -> None:
  """Background coroutine: probe the projection loop every PROBE_INTERVAL_SECONDS."""
  stdout.write(style.SUCCESS("Starting Event Projections synthetic monitor..."))
  # Give the Kafka consumer + broker time to come up before the first probe.
  await asyncio.sleep(20)
  while True:
    try:
      status, latency_ms, detail = await _run_probe()
      await _record_health(status, latency_ms, detail)
      msg = f"Event Projections probe: {status}" + (
        f" ({latency_ms}ms)" if latency_ms is not None else f" — {detail}"
      )
      if status == "Operational":
        stdout.write(style.SUCCESS(msg))
      else:
        stderr.write(style.WARNING(msg))
    except Exception as e:
      stderr.write(style.ERROR(f"Event Projections monitor error: {e}"))
      try:
        await _record_health("Outage", None, f"monitor error: {e}")
      except Exception:
        pass
    await asyncio.sleep(PROBE_INTERVAL_SECONDS)
