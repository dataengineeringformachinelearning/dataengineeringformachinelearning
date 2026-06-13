import asyncio
import json

from aiokafka import AIOKafkaConsumer
from asgiref.sync import sync_to_async
from django.core.management.base import BaseCommand
from ml.ml_services import train_tenant_sla
from monitor.models import StatusPage
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
    # Start periodic hourly scheduler task
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
        result = await consumer.getmany(timeout_ms=1000, max_records=10)
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
                tenant_id = payload.get("status_page_id")
                if tenant_id:
                  await self.train_single(tenant_id)
            except Exception as e:
              self.stderr.write(self.style.ERROR(f"Error processing message: {e}"))
    finally:
      await consumer.stop()
      self.stdout.write(self.style.WARNING("ML Engine Worker stopped."))

  @sync_to_async
  def train_all(self):
    pages = StatusPage.objects.all()
    for page in pages:
      try:
        run = train_tenant_sla(page)
        if run:
          self.stdout.write(
            self.style.SUCCESS(
              f"Trained SLA forecast model for tenant '{page.title}' (SLA: {run.average_sla:.2f}%)"
            )
          )
        else:
          self.stdout.write(f"Skipped tenant '{page.title}' (no telemetry data)")

        # Automate Threat Model training along with the SLA model
        if page.user:
          from ml.ml_services import train_threat_model

          report = train_threat_model(page.user)
          self.stdout.write(
            self.style.SUCCESS(
              f"Trained threat forecast model for user '{page.user.username}' (Score: {report.anomaly_score * 100:.1f}%)"
            )
          )
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Failed to train tenant '{page.title}': {e}"))

  @sync_to_async
  def train_single(self, tenant_id):
    try:
      page = StatusPage.objects.get(id=tenant_id)
      run = train_tenant_sla(page)
      if run:
        self.stdout.write(
          self.style.SUCCESS(
            f"Trained SLA forecast model for tenant '{page.title}' (SLA: {run.average_sla:.2f}%)"
          )
        )
      else:
        self.stdout.write(f"Skipped tenant '{page.title}' (no telemetry data)")

      # Automate Threat Model training along with the SLA model
      if page.user:
        from ml.ml_services import train_threat_model

        report = train_threat_model(page.user)
        self.stdout.write(
          self.style.SUCCESS(
            f"Trained threat forecast model for user '{page.user.username}' (Score: {report.anomaly_score * 100:.1f}%)"
          )
        )
    except StatusPage.DoesNotExist:
      self.stderr.write(self.style.WARNING(f"Tenant ID {tenant_id} not found"))
    except Exception as e:
      self.stderr.write(self.style.ERROR(f"Failed to train tenant: {e}"))

  async def periodic_scheduler(self):
    self.stdout.write(
      self.style.SUCCESS("Starting periodic hourly training & cleanup scheduler...")
    )
    # Wait 10 seconds for startup to stabilize
    await asyncio.sleep(10)
    while True:
      try:
        self.stdout.write("Periodic Scheduler: Triggering database cleanup and full retraining...")
        from django.core.management import call_command

        await sync_to_async(call_command)("train_all_models")
        self.stdout.write(
          self.style.SUCCESS(
            "Periodic Scheduler: Successfully completed hourly training & cleanup run."
          )
        )
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Periodic Scheduler: Hourly run failed: {e}"))

      # Wait 1 hour (3600 seconds)
      await asyncio.sleep(3600)
