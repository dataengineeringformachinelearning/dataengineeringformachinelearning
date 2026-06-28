import asyncio
import json
import os
from datetime import timedelta

import polars as pl
from aiokafka import AIOKafkaConsumer
from asgiref.sync import sync_to_async
from django.core.management.base import BaseCommand
from utils.kafka import get_kafka_brokers, get_kafka_producer
from utils.request import anonymize_ip

# Needed to interact with Django ORM asynchronously
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django

django.setup()

from monitor.models import Endpoints


class Command(BaseCommand):
  help = "Runs the async telemetry background worker"

  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.background_tasks = set()

  def handle(self, *args, **options):
    self.stdout.write(self.style.SUCCESS("Starting Telemetry Worker..."))
    asyncio.run(self.run_worker())

  async def run_worker(self):
    # Start periodic scheduler task
    task = asyncio.create_task(self.periodic_scheduler())
    self.background_tasks.add(task)
    task.add_done_callback(self.background_tasks.discard)

    # Start active pinger task
    pinger_task = asyncio.create_task(self.active_pinger_scheduler())
    self.background_tasks.add(pinger_task)
    pinger_task.add_done_callback(self.background_tasks.discard)

    # Start quality/lighthouse task
    lighthouse_task = asyncio.create_task(self.quality_scanner_scheduler())
    self.background_tasks.add(lighthouse_task)
    lighthouse_task.add_done_callback(self.background_tasks.discard)

    brokers = get_kafka_brokers()
    consumer = AIOKafkaConsumer(
      "app-events",
      "user-issues",
      "frontend-events",
      bootstrap_servers=brokers,
      group_id="telemetry-group",
      auto_offset_reset="earliest",
      enable_auto_commit=False,
      # wait up to 1000ms for a batch
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
        # Get a batch of messages
        try:
          result = await consumer.getmany(timeout_ms=1000, max_records=100)
        except Exception as e:
          self.stderr.write(self.style.ERROR(f"Kafka connection error: {e}. Retrying in 5s..."))
          await asyncio.sleep(5)
          continue

        if not result:
          continue

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
                self.stderr.write(self.style.ERROR(f"Failed to parse msg: {e}"))

            if not data_list and not threat_data_list:
              continue

            success = False
            while not success:
              try:
                if data_list:
                  df = pl.DataFrame(data_list)
                  await self.save_to_db(df)

                if threat_data_list:
                  await self.save_threat_intel_to_db(threat_data_list)

                success = True

                # Explicitly commit offset
                await consumer.commit()
                self.stdout.write(
                  self.style.SUCCESS(
                    f"Processed and committed batch of {len(data_list)} telemetry and {len(threat_data_list)} threat messages"
                  )
                )
              except Exception as e:
                self.stderr.write(self.style.ERROR(f"Database insertion failed: {e}"))
                self.stderr.write(
                  self.style.WARNING("Backing off for 5 seconds before retrying...")
                )
                await asyncio.sleep(5)

          elif tp.topic == "user-issues":
            for msg in messages:
              try:
                payload = json.loads(msg.value.decode("utf-8"))
                if payload.get("event_type") == "user_issue":
                  bug_report_id = payload.get("bug_report_id")
                  report_text = payload.get("report")
                  if bug_report_id and report_text:
                    await self.update_bug_report(bug_report_id, report_text)
              except Exception as e:
                self.stderr.write(self.style.ERROR(f"Failed to parse user issue msg: {e}"))

            await consumer.commit()
            self.stdout.write(self.style.SUCCESS("Processed and committed user-issues batch"))

          elif tp.topic == "frontend-events":
            for msg in messages:
              try:
                payload = json.loads(msg.value.decode("utf-8"))
                uid = payload.get("uid")
                event_version = payload.get("version", "1.0")
                if event_version != "1.0":
                  self.stderr.write(
                    self.style.WARNING(
                      f"Unknown event version {event_version}, skipping or handling compat"
                    )
                  )
                event_payload = payload.get("payload", {})
                action = event_payload.get("action")

                # Idempotency: use stable message key (uid + timestamp + action) or Kafka key
                msg_key = (
                  msg.key.decode() if msg.key else f"{uid}:{payload.get('timestamp', '')}:{action}"
                )
                if uid and action:
                  await self.process_frontend_event(
                    uid, action, event_payload, idempotency_key=msg_key
                  )
              except Exception as e:
                self.stderr.write(self.style.ERROR(f"Failed to parse frontend-event msg: {e}"))
                # Simple DLQ: publish to dead-letter topic for manual replay
                try:
                  dlq_producer = await get_kafka_producer()  # reuse or separate
                  await dlq_producer.send("frontend-events-dlq", msg.value, key=msg.key)
                except Exception as dlq_e:
                  self.stderr.write(self.style.ERROR(f"Failed to DLQ: {dlq_e}"))

            await consumer.commit()
            self.stdout.write(self.style.SUCCESS("Processed and committed frontend-events batch"))

    finally:
      await consumer.stop()
      self.stdout.write(self.style.WARNING("Worker stopped."))

  @sync_to_async
  def process_frontend_event(
    self, uid: str, action: str, event_payload: dict, idempotency_key: str | None = None
  ):
    from firebase_admin import firestore

    db = firestore.client(database_id="deml")

    try:
      # Idempotency: use a unique doc or check for existing with the key
      # For simplicity, use a separate 'processed_events' collection or embed key.
      # Here we use merge with a processed flag keyed by idempotency_key.
      dedup_doc_id = f"dedup_{idempotency_key}" if idempotency_key else None

      if dedup_doc_id:
        dedup_ref = (
          db.collection("users").document(uid).collection("processed_events").document(dedup_doc_id)
        )
        if dedup_ref.get().exists:
          self.stdout.write(
            self.style.WARNING(f"Skipping duplicate frontend-event {idempotency_key} for {uid}")
          )
          return

      # Simple mock logic for different actions.
      # In production, this would query Postgres/Clickhouse
      result_data = {
        "last_updated": firestore.SERVER_TIMESTAMP,
        "action_processed": action,
        "status": "success",
      }

      if action == "get_stats":
        from monitor.models import Endpoints

        active_count = Endpoints.objects.filter(is_active=True).count()
        result_data["active_endpoints"] = active_count
        result_data["message"] = "Real-time stats updated from Django worker."

      # Write results to Firestore (Layer 4)
      doc_ref = db.collection("users").document(uid).collection("data").document("stats")
      doc_ref.set(result_data, merge=True)

      # Record the dedup key
      if dedup_doc_id:
        dedup_ref.set(
          {"processed_at": firestore.SERVER_TIMESTAMP, "idempotency_key": idempotency_key},
          merge=True,
        )

      self.stdout.write(
        self.style.SUCCESS(
          f"Successfully processed {action} for user {uid} and updated Firestore. (key={idempotency_key})"
        )
      )
    except Exception as e:
      self.stderr.write(self.style.ERROR(f"Error processing frontend event for user {uid}: {e}"))

  @sync_to_async
  def update_bug_report(self, bug_report_id: str, report_text: str):
    from monitor.models import BugReport

    try:
      bug_report = BugReport.objects.get(id=bug_report_id)
      bug_report.processed_report = report_text
      bug_report.save()
      self.stdout.write(
        self.style.SUCCESS(f"Successfully updated BugReport {bug_report_id} with AI report.")
      )
    except BugReport.DoesNotExist:
      self.stderr.write(self.style.WARNING(f"BugReport {bug_report_id} not found in database."))

  @sync_to_async
  def save_threat_intel_to_db(self, threat_data_list: list):
    from account.context import resolve_scope_from_account_id
    from django.contrib.auth import get_user_model
    from monitor.models import ThreatIntelligence

    User = get_user_model()

    objects_to_create = []
    users_cache = {}
    scope_cache = {}

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
  def save_to_db(self, df: pl.DataFrame):
    from account.context import resolve_scope_from_account_id
    from account.platform import PLATFORM_ACCOUNT_ID, ensure_platform_status_page
    from monitor.models import MonitoredService

    page = ensure_platform_status_page()

    from utils.service_urls import get_normalized_service_info

    # Clean/Normalize the dataframe URLs and track names
    url_mapping = {}
    normalized_data = []
    for row in df.iter_rows(named=True):
      url_val = row.get("url")
      if not url_val:
        continue
      norm_url, name = get_normalized_service_info(url_val)
      url_mapping[norm_url] = name

      row_dict = dict(row)
      row_dict["url"] = norm_url
      normalized_data.append(row_dict)

    if not normalized_data:
      return

    df = pl.DataFrame(normalized_data)

    # Collect unique urls from df and ensure they are added
    urls = list(df["url"].unique())
    existing_urls = set(
      MonitoredService.objects.filter(status_page=page, url__in=urls).values_list("url", flat=True)
    )

    for u in urls:
      if u not in existing_urls:
        MonitoredService.objects.create(
          status_page=page, name=url_mapping.get(u, "Django Web Server"), url=u
        )

    from monitor.models import ThreatIntelligence
    from utils.enrichment import get_ip_enrichment, parse_user_agent

    # Cross-reference incoming telemetry IPs against ThreatIntelligence
    unique_ips = [ip for ip in df["ip_address"].to_list() if ip]
    malicious_ips = set()
    if unique_ips:
      malicious_ips = set(
        ThreatIntelligence.objects.filter(ip_address__in=unique_ips, is_malicious=True).values_list(
          "ip_address", flat=True
        )
      )

    objects_to_create = []
    for row in df.iter_rows(named=True):
      duration = timedelta(seconds=row["response_time"])

      ip = row.get("ip_address")
      ua = row.get("user_agent", "")

      ip_data = get_ip_enrichment(ip)
      ua_data = parse_user_agent(ua)

      account_key = row.get("account_id") or row.get("tenant_id") or PLATFORM_ACCOUNT_ID
      user_obj, is_platform = resolve_scope_from_account_id(account_key)
      if not user_obj and not is_platform:
        user_obj, is_platform = None, True

      telemetry_context = row.get("telemetry_context") or {}
      if ip in malicious_ips:
        telemetry_context["malicious_ip_detected"] = True
        telemetry_context["threat_match"] = True

      ep = Endpoints(
        user=None if is_platform else user_obj,
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
      objects_to_create.append(ep)

    if objects_to_create:
      Endpoints.objects.bulk_create(objects_to_create, ignore_conflicts=True)

  async def periodic_scheduler(self):
    self.stdout.write(self.style.SUCCESS("Starting periodic telemetry health scheduler..."))
    # Wait 10 seconds for startup to stabilize
    await asyncio.sleep(10)
    while True:
      try:
        await self.log_telemetry_metrics()
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Telemetry Scheduler: Hourly check failed: {e}"))

      try:
        await self.run_aggregation_command()
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Telemetry Scheduler: Aggregation failed: {e}"))

      # Check hourly
      await asyncio.sleep(3600)

  @sync_to_async
  def run_aggregation_command(self):
    from django.core.management import call_command

    self.stdout.write("Triggering aggregate_analytics command from worker...")
    call_command("aggregate_analytics")

  @sync_to_async
  def log_telemetry_metrics(self):
    total_endpoints = Endpoints.objects.count()
    active_endpoints = Endpoints.objects.filter(is_active=True).count()
    self.stdout.write(
      self.style.SUCCESS(
        f"Telemetry Pipeline Check: Currently monitoring {active_endpoints} active endpoints "
        f"({total_endpoints} total telemetry records in database)."
      )
    )

  async def active_pinger_scheduler(self):
    self.stdout.write(self.style.SUCCESS("Starting active pinger scheduler..."))
    await sync_to_async(self._ensure_platform_services)()
    # Wait 15 seconds to let the system boot
    await asyncio.sleep(15)
    while True:
      try:
        await self.ping_services()
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Error in automatic pinger task: {e}"))
      await asyncio.sleep(30)

  def _ensure_platform_services(self):
    from utils.service_urls import ensure_platform_monitored_services

    count = ensure_platform_monitored_services()
    if count:
      self.stdout.write(self.style.SUCCESS(f"Synced {count} platform-status monitored service(s)"))

  @sync_to_async
  def ping_services(self):
    import datetime
    import time
    import urllib.error
    import urllib.request

    from django.db import close_old_connections
    from monitor.models import Endpoints, MonitoredService
    from utils.service_urls import get_normalized_service_info, resolve_ping_url

    close_old_connections()
    try:
      services = MonitoredService.objects.select_related("status_page").all()

      scope_targets: dict = {}
      for s in services:
        page = s.status_page
        if not page:
          continue
        scope_key = ("platform", None) if page.is_platform else ("user", page.user_id)
        if scope_key not in scope_targets:
          scope_targets[scope_key] = {
            "user": page.user,
            "is_platform": page.is_platform,
            "targets": {},
          }
        if not s.url:
          continue
        ping_url = resolve_ping_url(s.url, s.name)
        canonical_url, _ = get_normalized_service_info(s.url)
        scope_targets[scope_key]["targets"][ping_url] = canonical_url

      for scope in scope_targets.values():
        targets = scope["targets"]
        for ping_url, canonical_url in targets.items():
          url = ping_url
          start_time = time.time()
          status_code = 503
          is_active = False
          try:
            req = urllib.request.Request(
              url, headers={"User-Agent": "PlatformStatusAutoPinger/1.0"}
            )
            import ssl

            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

            # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
            with urllib.request.urlopen(req, timeout=5, context=ctx) as response:
              status_code = response.getcode()
              is_active = 200 <= status_code < 500
          except urllib.error.HTTPError as e:
            status_code = e.code
            is_active = 200 <= status_code < 500
          except Exception:
            status_code = 503
            is_active = False

          duration = datetime.timedelta(seconds=(time.time() - start_time))

          Endpoints.objects.create(
            user=None if scope["is_platform"] else scope["user"],
            is_platform=scope["is_platform"],
            url=canonical_url,
            status_code=status_code,
            response_time=duration,
            ip_address="127.0.0.1",
            location="Localhost",
            asn="N/A",
            isp="Local Network",
            device_type="Bot",
            os_name="Unknown",
            browser_name="Unknown",
            is_bot=True,
            is_active=is_active,
          )
    finally:
      close_old_connections()

  async def quality_scanner_scheduler(self):
    self.stdout.write(self.style.SUCCESS("Starting quality (Lighthouse) scanner scheduler..."))
    # Wait 60 seconds for system boot
    await asyncio.sleep(60)
    while True:
      try:
        await self.run_lighthouse_scans()
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Error in lighthouse scanner task: {e}"))
      # Run every 6 hours
      await asyncio.sleep(21600)

  @sync_to_async
  def run_lighthouse_scans(self):
    from django.contrib.auth import get_user_model
    from django.db import close_old_connections
    from monitor.models import MonitoredService, StatusPage

    from telemetry.tasks.lighthouse_scanner import LighthouseScanner

    User = get_user_model()
    close_old_connections()
    try:
      scan_targets: list[tuple[str, object | None, bool]] = []
      for page in StatusPage.objects.filter(is_platform=True):
        service = page.services.first()
        if service and service.url:
          scan_targets.append((service.url, None, True))

      for user in User.objects.filter(profile__isnull=False).select_related("profile"):
        page = StatusPage.objects.filter(user=user, is_platform=False).first()
        if not page:
          continue
        service = MonitoredService.objects.filter(status_page=page).first()
        if service and service.url:
          scan_targets.append((service.url, user, False))

      for url, user, is_platform in scan_targets:
        scores = LighthouseScanner.scan_url(
          url, account_id="platform" if is_platform else str(user.profile.account_id)
        )
        if scores:
          from django.utils import timezone
          from monitor.models import AggregatedAnalytics

          current_hour = timezone.now().replace(minute=0, second=0, microsecond=0)
          lookup = {
            "timestamp": current_hour,
            "bucket_size": "1h",
            "is_platform": is_platform,
            "user": None if is_platform else user,
          }
          latest_agg, created = AggregatedAnalytics.objects.get_or_create(
            **lookup,
            defaults={"metadata": {"lighthouse_scores": scores}},
          )
          if not created:
            if not isinstance(latest_agg.metadata, dict):
              latest_agg.metadata = {}
            latest_agg.metadata["lighthouse_scores"] = scores
            latest_agg.save()

          label = "platform" if is_platform else user.username
          self.stdout.write(self.style.SUCCESS(f"[{label}] Lighthouse Scores: {scores}"))

    finally:
      close_old_connections()
