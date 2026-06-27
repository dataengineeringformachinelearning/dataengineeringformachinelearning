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
    from django.contrib.auth import get_user_model
    from monitor.models import TenantMembership, ThreatIntelligence

    User = get_user_model()

    objects_to_create = []
    users_cache = {}
    tenants_cache = {}

    for payload in threat_data_list:
      user_id = payload.get("user_id")
      user_obj = None
      tenant_obj = None
      if user_id:
        if user_id not in users_cache:
          try:
            u = User.objects.get(id=user_id)
            users_cache[user_id] = u
            membership = TenantMembership.objects.filter(user=u).first()
            tenants_cache[user_id] = membership.tenant if membership else None
          except User.DoesNotExist:
            users_cache[user_id] = None
            tenants_cache[user_id] = None
        user_obj = users_cache[user_id]
        tenant_obj = tenants_cache[user_id]

      ti = ThreatIntelligence(
        tenant=tenant_obj,
        user=user_obj,
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
    # Ensure platform-status page exists
    from urllib.parse import urlparse

    from django.conf import settings
    from django.contrib.auth.models import User
    from monitor.models import MonitoredService, StatusPage, Tenant

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:4200").rstrip("/")

    # Loop over all tenants to map endpoints dynamically
    all_tenants = {str(t.id): t for t in Tenant.objects.all()}
    tenant_0 = next((t for t in all_tenants.values() if t.is_platform_tenant), None)

    try:
      page = StatusPage.objects.get(slug="platform-status")
    except StatusPage.DoesNotExist:
      default_user = User.objects.first()
      if not default_user:
        from django.utils.crypto import get_random_string

        default_user = User.objects.create_user(
          username="system",
          email="system@dataengineeringformachinelearning.com",
          password=get_random_string(32),
        )
      page = StatusPage.objects.create(
        tenant=tenant_0,
        user=default_user,
        title="Platform Status",
        slug="platform-status",
        description="Monitoring system health and telemetry pipelines for the DEML (DATA ENGINEERING FOR MACHINE LEARNING).",
      )

    def get_normalized_info(url_str: str) -> tuple[str, str]:
      if not url_str:
        return f"{frontend_url}/", "Django Web Server"
      if "9092" in url_str:
        return url_str, "Redpanda Broker"

      parsed = urlparse(url_str)
      domain: str = f"{parsed.scheme}://{parsed.netloc}" if parsed.netloc else frontend_url

      base_domain: str = frontend_url
      if "dataengineeringformachinelearning.com" in domain:
        base_domain = "https://dataengineeringformachinelearning.com"
      elif "deml.app" in domain:
        base_domain = "https://deml.app"

      path: str = parsed.path.strip("/")

      # Default fallback mappings
      norm_url: str = f"{base_domain}/"
      name: str = "Django Web Server"
      if "dataengineeringformachinelearning.com" in base_domain:
        name = "Marketing Web Server"

      if "system-status/health" in path:
        norm_url = f"{base_domain}/"
        name = (
          "Django Web Server"
          if "dataengineeringformachinelearning.com" not in base_domain
          else "Marketing Web Server"
        )
      elif "auth/user" in path:
        norm_url = f"{base_domain}/settings"
        name = "Auth User"
      elif "auth/register" in path:
        norm_url = f"{base_domain}/"
        name = "Auth Register"
      elif "ml/latest" in path:
        norm_url = f"{base_domain}/status"
        name = "ML Engine Latest"
      elif "telemetry/cookie-consent" in path:
        norm_url = f"{base_domain}/privacy"
        name = "Telemetry Cookie Consent"
      elif "status_pages" in path:
        if "services" in path:
          norm_url = f"{base_domain}/status"
          name = "Status Pages Services"
        elif "incidents" in path:
          norm_url = f"{base_domain}/status"
          name = "Status Pages Incidents"
        elif "slug" in path:
          norm_url = f"{base_domain}/status"
          name = "Status Pages Slug Platform Status"
        else:
          norm_url = f"{base_domain}/settings"
          name = "Status Pages"

      return norm_url, name

    # Clean/Normalize the dataframe URLs and track names
    url_mapping = {}
    normalized_data = []
    for row in df.iter_rows(named=True):
      url_val = row.get("url")
      if not url_val:
        continue
      norm_url, name = get_normalized_info(url_val)
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

      t_id = row.get("tenant_id")
      tenant = all_tenants.get(str(t_id)) if t_id else tenant_0

      telemetry_context = row.get("telemetry_context") or {}
      if ip in malicious_ips:
        telemetry_context["malicious_ip_detected"] = True
        telemetry_context["threat_match"] = True

      # Create instance (we don't save yet to do it in bulk)
      ep = Endpoints(
        tenant=tenant,
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
    # Wait 15 seconds to let the system boot
    await asyncio.sleep(15)
    while True:
      try:
        await self.ping_services()
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Error in automatic pinger task: {e}"))
      await asyncio.sleep(30)

  @sync_to_async
  def ping_services(self):
    import datetime
    import time
    import urllib.error
    import urllib.request

    from django.db import close_old_connections
    from monitor.models import Endpoints, MonitoredService

    close_old_connections()
    try:
      services = MonitoredService.objects.select_related("status_page__tenant").all()

      tenant_urls = {}
      for s in services:
        tenant = s.status_page.tenant if s.status_page else None
        if not tenant:
          continue
        if tenant not in tenant_urls:
          tenant_urls[tenant] = set()
        if s.url:
          tenant_urls[tenant].add(s.url)

      for tenant, urls in tenant_urls.items():
        for url in urls:
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
            tenant=tenant,
            url=url,
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
    from django.db import close_old_connections
    from monitor.models import Tenant

    from telemetry.tasks.lighthouse_scanner import LighthouseScanner

    close_old_connections()
    try:
      tenants = Tenant.objects.filter(target_url__isnull=False)
      for tenant in tenants:
        # Avoid scanning if no URL
        if not tenant.target_url:
          continue

        # Call the scanner
        scores = LighthouseScanner.scan_url(tenant.target_url, tenant_id=tenant.id)
        if scores:
          from django.utils import timezone
          from monitor.models import AggregatedAnalytics

          current_hour = timezone.now().replace(minute=0, second=0, microsecond=0)
          latest_agg, created = AggregatedAnalytics.objects.get_or_create(
            tenant=tenant,
            timestamp=current_hour,
            bucket_size="1h",
            defaults={"metadata": {"lighthouse_scores": scores}},
          )
          if not created:
            if not isinstance(latest_agg.metadata, dict):
              latest_agg.metadata = {}
            latest_agg.metadata["lighthouse_scores"] = scores
            latest_agg.save()

          self.stdout.write(
            self.style.SUCCESS(f"[Tenant {tenant.name}] Lighthouse Scores: {scores}")
          )

    finally:
      close_old_connections()
