import asyncio
import json
import os
from datetime import timedelta

import polars as pl
from aiokafka import AIOKafkaConsumer
from asgiref.sync import sync_to_async
from django.core.management.base import BaseCommand
from utils.kafka import get_kafka_brokers

# Needed to interact with Django ORM asynchronously
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django

django.setup()

from monitor.models import Endpoints


class Command(BaseCommand):
  help = "Runs the async telemetry background worker"

  def handle(self, *args, **options):
    self.stdout.write(self.style.SUCCESS("Starting Telemetry Worker..."))
    asyncio.run(self.run_worker())

  async def run_worker(self):
    brokers = get_kafka_brokers()
    consumer = AIOKafkaConsumer(
      "app-events",
      "user-issues",
      bootstrap_servers=brokers,
      group_id="telemetry-group",
      auto_offset_reset="earliest",
      enable_auto_commit=False,
      # wait up to 1000ms for a batch
      max_poll_records=100,
    )

    await consumer.start()
    self.stdout.write(self.style.SUCCESS(f"Connected to Redpanda at {brokers}"))

    try:
      while True:
        # Get a batch of messages
        result = await consumer.getmany(timeout_ms=1000, max_records=100)

        if not result:
          continue

        for tp, messages in result.items():
          if not messages:
            continue

          if tp.topic == "app-events":
            data_list = []
            for msg in messages:
              try:
                payload = json.loads(msg.value.decode("utf-8"))
                data_list.append(payload)
              except Exception as e:
                self.stderr.write(self.style.ERROR(f"Failed to parse msg: {e}"))

            if not data_list:
              continue

            # Process with Polars
            df = pl.DataFrame(data_list)

            success = False
            while not success:
              try:
                # DB save
                await self.save_to_db(df)
                success = True

                # Explicitly commit offset
                await consumer.commit()
                self.stdout.write(
                  self.style.SUCCESS(f"Processed and committed batch of {len(data_list)} messages")
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

    finally:
      await consumer.stop()
      self.stdout.write(self.style.WARNING("Worker stopped."))

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
  def save_to_db(self, df: pl.DataFrame):
    # Ensure platform-status page exists
    from urllib.parse import urlparse

    from django.conf import settings
    from django.contrib.auth.models import User
    from monitor.models import MonitoredService, StatusPage

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:4200").rstrip("/")

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
        user=default_user,
        title="Platform Status",
        slug="platform-status",
        description="Monitoring system health and telemetry pipelines for the Data Engineering Platform.",
      )

    def get_normalized_info(url_str):
      if not url_str:
        return f"{frontend_url}/", "Django Web Server"
      if "9092" in url_str:
        return url_str, "Redpanda Broker"

      parsed = urlparse(url_str)
      path = parsed.path.strip("/")

      # Default fallback mappings
      norm_url = f"{frontend_url}/"
      name = "Django Web Server"

      if "system-status/health" in path:
        norm_url = f"{frontend_url}/"
        name = "Django Web Server"
      elif "auth/user" in path:
        norm_url = f"{frontend_url}/manage"
        name = "Auth User"
      elif "auth/register" in path:
        norm_url = f"{frontend_url}/"
        name = "Auth Register"
      elif "model/latest" in path:
        norm_url = f"{frontend_url}/status"
        name = "Model Latest"
      elif "telemetry/cookie-consent" in path:
        norm_url = f"{frontend_url}/privacy"
        name = "Telemetry Cookie Consent"
      elif "status_pages" in path:
        if "services" in path:
          norm_url = f"{frontend_url}/status"
          name = "Status Pages Services"
        elif "incidents" in path:
          norm_url = f"{frontend_url}/status"
          name = "Status Pages Incidents"
        elif "slug" in path:
          norm_url = f"{frontend_url}/status"
          name = "Status Pages Slug Platform Status"
        else:
          norm_url = f"{frontend_url}/manage"
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

    objects_to_create = []
    for row in df.iter_rows(named=True):
      duration = timedelta(seconds=row["response_time"])

      # Create instance (we don't save yet to do it in bulk)
      ep = Endpoints(
        url=row["url"],
        status_code=row["status_code"],
        response_time=duration,
        ip_address=row.get("ip_address"),
        is_active=row["is_active"],
      )
      objects_to_create.append(ep)

    if objects_to_create:
      Endpoints.objects.bulk_create(objects_to_create)
