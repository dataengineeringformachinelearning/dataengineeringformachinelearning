import asyncio
import json

from aiokafka import AIOKafkaConsumer
from asgiref.sync import sync_to_async
from django.core.management.base import BaseCommand
from ml.ml_services import train_tenant_sla
from utils.kafka import get_kafka_brokers


class Command(BaseCommand):
  help = "Runs the async Machine Learning (ML) training worker"

  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.background_tasks = set()

  def handle(self, *args, **options):
    self.stdout.write(self.style.SUCCESS("Starting ML Engine Training Worker..."))
    asyncio.run(self.run_worker())

  async def run_worker(self):
    # Start periodic daily scheduler task
    task = asyncio.create_task(self.periodic_scheduler())
    self.background_tasks.add(task)
    task.add_done_callback(self.background_tasks.discard)

    brokers = get_kafka_brokers()
    consumer = AIOKafkaConsumer(
      "ml-training-events",
      bootstrap_servers=brokers,
      group_id="ml-training-group",
      auto_offset_reset="latest",
      enable_auto_commit=True,
    )

    await consumer.start()
    self.stdout.write(self.style.SUCCESS(f"Connected to Redpanda at {brokers}"))

    try:
      while True:
        try:
          result = await consumer.getmany(timeout_ms=1000, max_records=10)
        except Exception as e:
          self.stderr.write(self.style.ERROR(f"Kafka connection error: {e}. Retrying in 5s..."))
          await asyncio.sleep(5)
          continue

        if not result:
          continue

        for _tp, messages in result.items():
          for msg in messages:
            try:
              payload = json.loads(msg.value.decode("utf-8"))
              self.stdout.write(f"Received event: {payload}")
              action = payload.get("action")

              if action == "train_all_tenants":
                await self.train_all()
              elif action == "train_tenant":
                tenant_id = payload.get("tenant_id")
                if tenant_id:
                  await self.train_single(tenant_id)
            except Exception as e:
              self.stderr.write(self.style.ERROR(f"Error processing message: {e}"))
    finally:
      await consumer.stop()
      self.stdout.write(self.style.WARNING("ML Engine Worker stopped."))

  @sync_to_async
  def train_all(self):
    from django.db import close_old_connections
    from monitor.models import Tenant

    close_old_connections()
    try:
      tenants = Tenant.objects.all()
      for tenant in tenants:
        try:
          run = train_tenant_sla(tenant)
          if run:
            self.stdout.write(
              self.style.SUCCESS(
                f"Trained SLA forecast model for tenant '{tenant.name}' (SLA: {run.average_sla:.2f}%)"
              )
            )
          else:
            self.stdout.write(f"Skipped tenant '{tenant.name}' (no telemetry data)")

          # Automate Threat Model training along with the SLA model
          from ml.ml_services import train_threat_model

          report = train_threat_model(tenant)
          if report:
            self.stdout.write(
              self.style.SUCCESS(
                f"Trained threat forecast model for tenant '{tenant.name}' (Score: {report.anomaly_score * 100:.1f}%)"
              )
            )
        except Exception as e:
          self.stderr.write(self.style.ERROR(f"Failed to train tenant '{tenant.name}': {e}"))
    finally:
      close_old_connections()

  @sync_to_async
  def train_single(self, tenant_id):
    from django.db import close_old_connections
    from monitor.models import Tenant

    close_old_connections()
    try:
      tenant = Tenant.objects.get(id=tenant_id)
      run = train_tenant_sla(tenant)
      if run:
        self.stdout.write(
          self.style.SUCCESS(
            f"Trained SLA forecast model for tenant '{tenant.name}' (SLA: {run.average_sla:.2f}%)"
          )
        )
      else:
        self.stdout.write(f"Skipped tenant '{tenant.name}' (no telemetry data)")

      # Automate Threat Model training along with the SLA model
      from ml.ml_services import train_threat_model

      report = train_threat_model(tenant)
      if report:
        self.stdout.write(
          self.style.SUCCESS(
            f"Trained threat forecast model for tenant '{tenant.name}' (Score: {report.anomaly_score * 100:.1f}%)"
          )
        )
    except Tenant.DoesNotExist:
      self.stderr.write(self.style.WARNING(f"Tenant ID {tenant_id} not found"))
    except Exception as e:
      self.stderr.write(self.style.ERROR(f"Failed to train tenant: {e}"))
    finally:
      close_old_connections()

  async def periodic_scheduler(self):
    self.stdout.write(self.style.SUCCESS("Starting periodic daily training & cleanup scheduler..."))
    # Wait 10 seconds for startup to stabilize
    await asyncio.sleep(10)
    while True:
      try:
        self.stdout.write("Periodic Scheduler: Triggering database cleanup and full retraining...")
        from django.core.management import call_command

        await sync_to_async(call_command)("train_all_models")
        self.stdout.write(
          self.style.SUCCESS(
            "Periodic Scheduler: Successfully completed daily training & cleanup run."
          )
        )

        # Send daily status report
        from utils.discord import send_discord_alert
        from utils.email import get_recent_stats_text, send_alert_email

        subject = "Daily Platform Status Report"
        message = await sync_to_async(get_recent_stats_text)()

        await sync_to_async(send_alert_email)(subject, message)
        await sync_to_async(send_discord_alert)(subject, message)

      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Periodic Scheduler: Hourly run failed: {e}"))

      # Wait 1 day (86400 seconds)
      await asyncio.sleep(86400)
