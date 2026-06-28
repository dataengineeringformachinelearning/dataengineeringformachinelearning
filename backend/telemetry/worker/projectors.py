"""Kafka consumers and DB projection writers for telemetry events."""

from __future__ import annotations

import json
import logging
from datetime import timedelta

import polars as pl
from account.context import resolve_scope_from_account_id
from account.platform import PLATFORM_ACCOUNT_ID
from asgiref.sync import sync_to_async
from monitor.models import BugReport, Endpoints, ThreatIntelligence
from utils.enrichment import get_ip_enrichment_batch, parse_user_agent
from utils.kafka import get_kafka_producer
from utils.request import anonymize_ip
from utils.service_urls import get_normalized_service_info

logger = logging.getLogger(__name__)


@sync_to_async
def process_frontend_event(
  stdout,
  stderr,
  uid: str,
  action: str,
  event_payload: dict,
  idempotency_key: str | None = None,
):
  from firebase_admin import firestore

  db = firestore.client(database_id="deml")

  try:
    dedup_doc_id = f"dedup_{idempotency_key}" if idempotency_key else None

    if dedup_doc_id:
      dedup_ref = (
        db.collection("users").document(uid).collection("processed_events").document(dedup_doc_id)
      )
      if dedup_ref.get().exists:
        stderr.write(f"Skipping duplicate frontend-event {idempotency_key} for {uid}")
        return

    result_data = {
      "last_updated": firestore.SERVER_TIMESTAMP,
      "action_processed": action,
      "status": "success",
    }

    if action == "get_stats":
      active_count = Endpoints.objects.filter(is_active=True).count()
      result_data["active_endpoints"] = active_count
      result_data["message"] = "Real-time stats updated from Django worker."

    doc_ref = db.collection("users").document(uid).collection("data").document("stats")
    doc_ref.set(result_data, merge=True)

    if dedup_doc_id:
      dedup_ref.set(
        {"processed_at": firestore.SERVER_TIMESTAMP, "idempotency_key": idempotency_key},
        merge=True,
      )

    stdout.write(f"Successfully processed {action} for user {uid} (key={idempotency_key})")
  except Exception as e:
    stderr.write(f"Error processing frontend event for user {uid}: {e}")


@sync_to_async
def process_pending_frontend_commands(stdout, stderr, style):
  """Poll the frontend_command_inbox (written by ingestEvent fallback) and project via same path.
  Relies on idempotency dedup inside process_frontend_event. Cleans up inbox entries after attempt.
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
      try:
        data = d.to_dict() or {}
        uid = data.get("uid")
        outer_payload = data.get("payload") or data
        action = (
          outer_payload.get("action") if isinstance(outer_payload, dict) else data.get("action")
        )
        idem = data.get("idempotency_key") or (
          outer_payload.get("idempotency_key") if isinstance(outer_payload, dict) else None
        )
        if uid and action:
          # Reuse the same projector (idempotent)
          process_frontend_event(stdout, stderr, uid, action, outer_payload, idem)
          count += 1
        # Remove regardless to keep collection small (idempotency guards correctness)
        d.reference.delete()
      except Exception as inner:
        stderr.write(f"Error handling inbox doc {d.id}: {inner}")
        # best effort delete to avoid poison
        try:
          d.reference.delete()
        except Exception:
          pass
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
    malicious_ips = set(
      ThreatIntelligence.objects.filter(ip_address__in=unique_ips, is_malicious=True).values_list(
        "ip_address", flat=True
      )
    )

  # Batch enrichment: one cache lookup per unique IP, not per row.
  ip_enrichment = get_ip_enrichment_batch(df["ip_address"].to_list())

  objects_to_create = []
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
      for msg in messages:
        try:
          payload = json.loads(msg.value.decode("utf-8"))
          uid = payload.get("uid")
          event_version = payload.get("version", "1.0")
          if event_version != "1.0":
            stderr.write(style.WARNING(f"Unknown event version {event_version}"))
          event_payload = payload.get("payload", {})
          action = event_payload.get("action")
          # Prefer the event's idempotency_key (e.g. from client verify- or generated unique) for dedup.
          # Fall back to kafka key only if absent. Using uid as before caused permanent skips after first event per user.
          idem_key = (
            payload.get("idempotency_key")
            or (event_payload.get("idempotency_key") if isinstance(event_payload, dict) else None)
            or (msg.key.decode() if msg.key else f"{uid}:{payload.get('timestamp', '')}:{action}")
          )
          if uid and action:
            await process_frontend_event(stdout, stderr, uid, action, event_payload, idem_key)
        except Exception as e:
          stderr.write(style.ERROR(f"Failed to parse frontend-event msg: {e}"))
          try:
            dlq_producer = await get_kafka_producer()
            await dlq_producer.send("frontend-events-dlq", msg.value, key=msg.key)
          except Exception as dlq_e:
            stderr.write(style.ERROR(f"Failed to DLQ: {dlq_e}"))
      await consumer.commit()
      stdout.write(style.SUCCESS("Processed and committed frontend-events batch"))

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
