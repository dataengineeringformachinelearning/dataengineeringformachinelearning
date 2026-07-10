"""Kafka consumers and DB projection writers for telemetry events."""

from __future__ import annotations

import json
import logging
from datetime import timedelta
from typing import Any, Final

import polars as pl
from account.context import resolve_scope_from_account_id
from account.platform import PLATFORM_ACCOUNT_ID
from asgiref.sync import sync_to_async
from django.core.cache import cache
from monitor.models import BugReport, Endpoints, ThreatIntelligence
from utils.enrichment import get_ip_enrichment_batch, parse_user_agent
from utils.kafka import get_kafka_producer
from utils.request import anonymize_ip
from utils.service_urls import get_normalized_service_info
from utils.structured_log import log_event

from telemetry.event_contract import (
  IdempotencyConflictError,
  projection_payload_hash,
  validate_idempotency_key,
)

logger = logging.getLogger(__name__)
MAX_PROJECTION_ATTEMPTS: Final[int] = 5


def _write(stream: Any, message: str) -> None:
  """Write to a Django command stream when one is available."""
  if stream is not None:
    stream.write(message)


def _project_frontend_event(
  stdout: Any,
  stderr: Any,
  uid: str,
  action: str,
  event_payload: dict[str, Any],
  idempotency_key: str | None = None,
) -> bool:
  """Synchronous core projector. Callable directly from sync contexts (e.g. the
  Firestore inbox poller) and via the `process_frontend_event` async wrapper from the
  Kafka consume loop."""
  from firebase_admin import firestore

  db = firestore.client(database_id="deml")

  validated_key = validate_idempotency_key(idempotency_key)
  payload_hash = projection_payload_hash(action, event_payload)
  dedup_doc_id = f"dedup_{validated_key}"
  dedup_ref = (
    db.collection("users").document(uid).collection("processed_events").document(dedup_doc_id)
  )
  existing = dedup_ref.get()
  if existing.exists:
    existing_data = existing.to_dict() or {}
    existing_hash = existing_data.get("payload_hash")
    if existing_hash and existing_hash != payload_hash:
      raise IdempotencyConflictError(
        f"idempotency_key {validated_key} was already used for a different payload"
      )
    _write(stderr, f"Skipping duplicate frontend-event {validated_key} for {uid}")
    return False

  try:
    from telemetry.worker.synthetic import SYNTHETIC_HEALTH_UID

    result_data = {
      "last_updated": firestore.SERVER_TIMESTAMP,
      "action_processed": action,
      "status": "success",
    }

    if action == "get_stats":
      active_count = Endpoints.objects.filter(is_active=True).count()
      result_data["active_endpoints"] = active_count
      result_data["message"] = "Real-time stats updated from Django worker."
      # Echo probe_nonce for the synthetic health check to verify exact projection round-trip.
      if uid == SYNTHETIC_HEALTH_UID:
        try:
          nonce = None
          if isinstance(event_payload, dict):
            nonce = event_payload.get("probe_nonce")
          if nonce:
            result_data["probe_nonce"] = nonce
        except Exception:
          pass

    doc_ref = db.collection("users").document(uid).collection("data").document("stats")
    doc_ref.set(result_data, merge=True)

    dedup_ref.set(
      {
        "processed_at": firestore.SERVER_TIMESTAMP,
        "idempotency_key": validated_key,
        "payload_hash": payload_hash,
      },
      merge=True,
    )

    _write(stdout, f"Successfully processed {action} for user {uid} (key={validated_key})")
    return True
  except Exception as exc:
    _write(stderr, f"Error processing frontend event for user {uid}: {exc}")
    log_event(
      logger,
      logging.ERROR,
      "frontend_projection_failed",
      uid=uid,
      action=action,
      idempotency_key=validated_key,
      error=str(exc)[:500],
    )
    raise


# Async wrapper used by the Kafka consume loop (which is async and awaits it).
process_frontend_event = sync_to_async(_project_frontend_event)


@sync_to_async
def process_pending_frontend_commands(stdout: Any, stderr: Any, style: Any) -> None:
  """Poll the frontend_command_inbox (written by ingestEvent fallback) and project via same path.
  Successful commands are deleted. Failures remain retryable and move to a dedicated
  Firestore DLQ after ``MAX_PROJECTION_ATTEMPTS`` acknowledged failures.
  """

  from firebase_admin import firestore as admin_firestore

  db = admin_firestore.client(database_id="deml")
  try:
    inbox = db.collection("frontend_command_inbox")
    # Bound the scan to a reasonable number; dedup inside process_frontend_event protects against replays.
    # stream() all under limit; for command volume this is tiny
    docs = list(inbox.limit(100).stream())
    count = 0
    for d in docs:
      data: dict[str, Any] = {}
      try:
        data = d.to_dict() or {}
        uid = data.get("uid")
        event_version = data.get("version")
        outer_payload = data.get("payload") or data
        action = (
          outer_payload.get("action") if isinstance(outer_payload, dict) else data.get("action")
        )
        idem = data.get("idempotency_key") or (
          outer_payload.get("idempotency_key") if isinstance(outer_payload, dict) else None
        )
        if event_version != "1.0":
          raise ValueError(f"unsupported fallback event version {event_version!r}")
        if isinstance(uid, str) and uid and isinstance(action, str) and action:
          # Call the SYNC core directly. This poller already runs in a sync context
          # (@sync_to_async), so it must NOT call the async `process_frontend_event`
          # wrapper — doing so returned an un-awaited coroutine and the projection
          # silently never ran (inbox docs were deleted without writing stats).
          _project_frontend_event(stdout, stderr, uid, action, outer_payload, idem)
          count += 1
        else:
          raise ValueError("fallback command requires uid and payload.action")
        d.reference.delete()
      except Exception as inner:
        _write(stderr, f"Error handling inbox doc {d.id}: {inner}")
        attempts = int(data.get("projection_attempts", 0)) + 1
        failure = {
          "projection_attempts": attempts,
          "last_projection_error": str(inner)[:500],
          "last_projection_attempt_at": admin_firestore.SERVER_TIMESTAMP,
        }
        try:
          if attempts >= MAX_PROJECTION_ATTEMPTS:
            dlq_ref = db.collection("frontend_command_dlq").document(d.id)
            dlq_ref.set(
              {
                **data,
                **failure,
                "failed_at": admin_firestore.SERVER_TIMESTAMP,
              },
              merge=True,
            )
            d.reference.delete()
            log_event(
              logger,
              logging.ERROR,
              "frontend_fallback_dlq_published",
              document_id=d.id,
              attempts=attempts,
              error=str(inner)[:500],
            )
          else:
            d.reference.set(failure, merge=True)
        except Exception as dlq_error:
          _write(stderr, f"Failed to retain or DLQ inbox doc {d.id}: {dlq_error}")
    if count:
      stdout.write(style.SUCCESS(f"Projected {count} frontend command(s) from Firestore inbox"))
  except Exception as e:
    stderr.write(style.ERROR(f"Error polling frontend_command_inbox: {e}"))


@sync_to_async
def update_bug_report(stdout, stderr, bug_report_id: str, report_text: str):
  try:
    bug_report = BugReport.objects.get(id=bug_report_id)
    bug_report.processed_report = report_text
    bug_report.save()
    stdout.write(f"Successfully updated BugReport {bug_report_id} with AI report.")
  except BugReport.DoesNotExist:
    stderr.write(f"BugReport {bug_report_id} not found in database.")


@sync_to_async
def save_threat_intel_to_db(threat_data_list: list):
  from django.contrib.auth import get_user_model

  User = get_user_model()
  objects_to_create = []
  users_cache: dict = {}
  scope_cache: dict = {}

  for payload in threat_data_list:
    user_id = payload.get("user_id")
    account_key = payload.get("account_id") or payload.get("tenant_id")
    user_obj = None
    is_platform = False

    if user_id:
      if user_id not in users_cache:
        try:
          users_cache[user_id] = User.objects.get(id=user_id)
        except User.DoesNotExist:
          users_cache[user_id] = None
      user_obj = users_cache[user_id]

    if account_key:
      if account_key not in scope_cache:
        scope_cache[account_key] = resolve_scope_from_account_id(account_key)
      resolved_user, is_platform = scope_cache[account_key]
      if resolved_user:
        user_obj = resolved_user

    if not is_platform and not user_obj:
      continue

    ti = ThreatIntelligence(
      user=None if is_platform else user_obj,
      is_platform=is_platform,
      source=payload.get("source"),
      ip_address=payload.get("ip"),
      location=payload.get("location"),
      abuse_confidence_score=payload.get("abuse_confidence_score", 0),
      otx_pulses=payload.get("otx_pulses", 0),
      is_malicious=payload.get("is_malicious", False),
      active_users=payload.get("active_users"),
      suspicious_requests=payload.get("suspicious_requests"),
      raw_payload=payload.get("raw_payload"),
    )
    objects_to_create.append(ti)

  if objects_to_create:
    ThreatIntelligence.objects.bulk_create(objects_to_create, ignore_conflicts=True)
    # Invalidate the Dragonfly malicious-IP cache so the next Kafka batch
    # picks up newly classified IPs within the next projection cycle.
    cache.delete("threat:malicious_ips")
    from telemetry.services.soc_orchestrator import process_threat_intel_batch

    process_threat_intel_batch(threat_data_list)


@sync_to_async
def save_to_db(df: pl.DataFrame):
  normalized_data = []
  for row in df.iter_rows(named=True):
    url_val = row.get("url")
    if not url_val:
      continue
    norm_url, _ = get_normalized_service_info(url_val)
    row_dict = dict(row)
    row_dict["url"] = norm_url
    normalized_data.append(row_dict)

  if not normalized_data:
    return

  df = pl.DataFrame(normalized_data)

  unique_ips = [ip for ip in df["ip_address"].to_list() if ip]
  malicious_ips: set[str] = set()
  if unique_ips:
    # Cache the malicious IP set in Dragonfly — this query fires on every Kafka batch.
    # ThreatIntelligence is written rarely but read on every telemetry row.
    _mal_cache_key = "threat:malicious_ips"
    _cached_ips = cache.get(_mal_cache_key)
    if _cached_ips is not None:
      malicious_ips = set(_cached_ips) & set(unique_ips)
    else:
      all_malicious = set(
        ThreatIntelligence.objects.filter(is_malicious=True).values_list("ip_address", flat=True)
      )
      cache.set(_mal_cache_key, list(all_malicious), 300)  # 5 min in Dragonfly
      malicious_ips = all_malicious & set(unique_ips)

  # Batch enrichment: one cache lookup per unique IP, not per row.
  ip_enrichment = get_ip_enrichment_batch(df["ip_address"].to_list())

  objects_to_create = []
  security_contexts: list[dict] = []
  for row in df.iter_rows(named=True):
    duration = timedelta(seconds=row["response_time"])
    ip = row.get("ip_address")
    ua = row.get("user_agent", "")
    ip_data = ip_enrichment.get(ip) or {"location": "Unknown", "asn": "Unknown", "isp": "Unknown"}
    ua_data = parse_user_agent(ua)

    account_key = row.get("account_id") or row.get("tenant_id") or PLATFORM_ACCOUNT_ID
    user_obj, is_platform = resolve_scope_from_account_id(account_key)

    if is_platform:
      user_obj = None
    elif not user_obj:
      continue

    telemetry_context = row.get("telemetry_context") or {}
    if ip in malicious_ips:
      telemetry_context["malicious_ip_detected"] = True
      telemetry_context["threat_match"] = True
      account_key = row.get("account_id") or row.get("tenant_id") or PLATFORM_ACCOUNT_ID
      security_contexts.append(
        {
          "ip_address": ip,
          "account_id": account_key,
          "user_id": user_obj.id if user_obj else None,
          "source": "endpoint_telemetry",
          "telemetry_context": telemetry_context,
          "behavioral": telemetry_context.get("behavioral"),
          "behavioral_entropy": (telemetry_context.get("behavioral") or {}).get("entropy"),
        }
      )

    objects_to_create.append(
      Endpoints(
        user=user_obj,
        is_platform=is_platform,
        url=row["url"],
        status_code=row["status_code"],
        response_time=duration,
        ip_address=anonymize_ip(ip),
        location=ip_data["location"],
        asn=ip_data["asn"],
        isp=ip_data["isp"],
        device_type=ua_data["device_type"],
        os_name=ua_data["os_name"],
        browser_name=ua_data["browser_name"],
        is_bot=ua_data["is_bot"] or (ip in malicious_ips),
        is_active=row["is_active"],
        telemetry_context=telemetry_context,
      )
    )

  if objects_to_create:
    Endpoints.objects.bulk_create(objects_to_create, ignore_conflicts=True)

  if security_contexts:
    from telemetry.services.soc_orchestrator import process_endpoint_batch

    process_endpoint_batch(malicious_ips, security_contexts)


async def consume_kafka_batch(consumer, stdout, stderr, style):
  """Process one poll batch from Redpanda; returns when idle."""

  try:
    result = await consumer.getmany(timeout_ms=1000, max_records=100)
  except Exception as e:
    stderr.write(style.ERROR(f"Kafka connection error: {e}. Retrying in 5s..."))
    return False

  if not result:
    return True

  for tp, messages in result.items():
    if not messages:
      continue

    if tp.topic == "app-events":
      data_list = []
      threat_data_list = []
      for msg in messages:
        try:
          payload = json.loads(msg.value.decode("utf-8"))
          if "source" in payload and payload["source"].endswith("_threat_intel"):
            threat_data_list.append(payload)
          else:
            data_list.append(payload)
        except Exception as e:
          stderr.write(style.ERROR(f"Failed to parse msg: {e}"))

      if not data_list and not threat_data_list:
        continue

      success = False
      while not success:
        try:
          if data_list:
            await save_to_db(pl.DataFrame(data_list))
          if threat_data_list:
            await save_threat_intel_to_db(threat_data_list)
          success = True
          await consumer.commit()
          stdout.write(
            style.SUCCESS(
              f"Processed batch of {len(data_list)} telemetry and {len(threat_data_list)} threat messages"
            )
          )
        except Exception as e:
          stderr.write(style.ERROR(f"Database insertion failed: {e}"))
          stderr.write(style.WARNING("Backing off for 5 seconds before retrying..."))
          import asyncio

          await asyncio.sleep(5)

    elif tp.topic == "user-issues":
      for msg in messages:
        try:
          payload = json.loads(msg.value.decode("utf-8"))
          if payload.get("event_type") == "user_issue":
            bug_report_id = payload.get("bug_report_id")
            report_text = payload.get("report")
            if bug_report_id and report_text:
              await update_bug_report(stdout, stderr, bug_report_id, report_text)
        except Exception as e:
          stderr.write(style.ERROR(f"Failed to parse user issue msg: {e}"))
      await consumer.commit()
      stdout.write(style.SUCCESS("Processed and committed user-issues batch"))

    elif tp.topic == "frontend-events":
      projected = 0
      duplicates = 0
      dlq_published = 0
      batch_safe_to_commit = True
      for msg in messages:
        try:
          payload = json.loads(msg.value.decode("utf-8"))
          if not isinstance(payload, dict):
            raise ValueError("frontend event must be a JSON object")
          uid = payload.get("uid")
          event_version = payload.get("version")
          if event_version != "1.0":
            raise ValueError(f"unsupported frontend event version {event_version!r}")
          event_payload = payload.get("payload", {})
          if not isinstance(event_payload, dict):
            raise ValueError("frontend event payload must be a JSON object")
          action = event_payload.get("action")
          if not isinstance(uid, str) or not uid:
            raise ValueError("frontend event requires uid")
          if not isinstance(action, str) or not action:
            raise ValueError("frontend event requires payload.action")
          idem_key = validate_idempotency_key(
            payload.get("idempotency_key") or event_payload.get("idempotency_key")
          )
          did_project = await process_frontend_event(
            stdout, stderr, uid, action, event_payload, idem_key
          )
          if did_project:
            projected += 1
          else:
            duplicates += 1
        except Exception as exc:
          _write(stderr, style.ERROR(f"Failed to project frontend-event msg: {exc}"))
          try:
            dlq_producer = await get_kafka_producer()
            await dlq_producer.send_and_wait(
              "frontend-events-dlq",
              msg.value,
              key=msg.key,
              headers=[
                ("x-deml-error", str(exc)[:500].encode("utf-8")),
                ("x-deml-source-topic", b"frontend-events"),
              ],
            )
            dlq_published += 1
            log_event(
              logger,
              logging.ERROR,
              "frontend_projection_dlq_published",
              error=str(exc)[:500],
              partition=getattr(msg, "partition", None),
              offset=getattr(msg, "offset", None),
            )
          except Exception as dlq_e:
            batch_safe_to_commit = False
            _write(stderr, style.ERROR(f"Failed to publish projection DLQ record: {dlq_e}"))
            log_event(
              logger,
              logging.CRITICAL,
              "frontend_projection_dlq_publish_failed",
              projection_error=str(exc)[:500],
              dlq_error=str(dlq_e)[:500],
              partition=getattr(msg, "partition", None),
              offset=getattr(msg, "offset", None),
            )
      if not batch_safe_to_commit:
        return False
      await consumer.commit()
      log_event(
        logger,
        logging.INFO,
        "frontend_projection_batch_complete",
        total=len(messages),
        projected=projected,
        duplicates=duplicates,
        dlq_published=dlq_published,
      )
      stdout.write(
        style.SUCCESS(
          "Processed and committed frontend-events batch "
          f"(projected={projected}, duplicates={duplicates}, dlq={dlq_published})"
        )
      )

  return True


async def poll_firestore_inbox(stdout, stderr, style):
  """Background resilient poller for frontend_command_inbox.
  Only used when direct publish from Cloud Functions to (public) Redpanda fails.
  With SASL-authenticated public Redpanda endpoint the direct Kafka path is used for
  lowest latency (no 10s poll). This task can be disabled via FIRESTORE_INBOX_POLL_ENABLED=0.
  """
  import asyncio

  stdout.write(
    style.SUCCESS(
      "Starting Firestore frontend_command_inbox poller (resilience fallback, every ~10s)..."
    )
  )
  # initial delay to let other systems boot
  await asyncio.sleep(8)
  while True:
    try:
      await process_pending_frontend_commands(stdout, stderr, style)
    except Exception as e:
      stderr.write(style.ERROR(f"Firestore inbox poll failed: {e}"))
    await asyncio.sleep(10)
