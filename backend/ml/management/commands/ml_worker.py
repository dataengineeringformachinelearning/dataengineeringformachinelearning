import asyncio
import json

from aiokafka import AIOKafkaConsumer
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from ml.ml_services import train_tenant_sla
from utils.kafka import get_kafka_brokers

User = get_user_model()


class Command(BaseCommand):
  help = "Runs the async Machine Learning (ML) training worker"

  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)
    self.background_tasks = set()

  def handle(self, *args, **options):
    self.stdout.write(self.style.SUCCESS("Starting ML Engine Training Worker..."))
    asyncio.run(self.run_worker())

  async def run_worker(self):
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
        try:
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
                  account_id = payload.get("account_id") or payload.get("tenant_id")
                  if account_id:
                    await self.train_single(account_id)
              except Exception as e:
                self.stderr.write(self.style.ERROR(f"Error processing message: {e}"))
        except Exception as loop_e:
          self.stderr.write(self.style.ERROR(f"Unhandled exception in ml_worker loop: {loop_e}"))
          await asyncio.sleep(5)
    finally:
      await consumer.stop()
      self.stdout.write(self.style.WARNING("ML Engine Worker stopped."))

  @sync_to_async
  def train_all(self):
    from django.db import close_old_connections
    from ml.ml_services import train_threat_model, train_spiking_temporal_forecaster

    close_old_connections()
    try:
      for user in User.objects.filter(profile__isnull=False).select_related("profile"):
        try:
          run = train_tenant_sla(user, is_platform=False)
          if run:
            self.stdout.write(
              self.style.SUCCESS(
                f"Trained SLA forecast model for '{user.username}' (SLA: {run.average_sla:.2f}%)"
              )
            )
          else:
            self.stdout.write(f"Skipped user '{user.username}' (no telemetry data)")

          report = train_threat_model(user, is_platform=False)
          if report:
            self.stdout.write(
              self.style.SUCCESS(
                f"Trained threat forecast model for '{user.username}' (Score: {report.anomaly_score * 100:.1f}%)"
              )
            )

          spiking_run = train_spiking_temporal_forecaster(user, is_platform=False)
          if spiking_run:
            self.stdout.write(
              self.style.SUCCESS(
                f"Trained Spiking Temporal Forecaster (4th model) for '{user.username}'"
              )
            )
        except Exception as e:
          self.stderr.write(self.style.ERROR(f"Failed to train user '{user.username}': {e}"))

      run = train_tenant_sla(None, is_platform=True)
      if run:
        self.stdout.write(
          self.style.SUCCESS(f"Trained platform SLA model (SLA: {run.average_sla:.2f}%)")
        )
      report = train_threat_model(None, is_platform=True)
      if report:
        self.stdout.write(
          self.style.SUCCESS(
            f"Trained platform threat model (Score: {report.anomaly_score * 100:.1f}%)"
          )
        )
      spiking_platform = train_spiking_temporal_forecaster(None, is_platform=True)
      if spiking_platform:
        self.stdout.write(self.style.SUCCESS("Trained platform Spiking Temporal Forecaster (4th)"))
    finally:
      close_old_connections()

  @sync_to_async
  def train_single(self, account_id):
    from account.context import resolve_scope_from_account_id
    from django.db import close_old_connections
    from ml.ml_services import train_threat_model

    close_old_connections()
    try:
      user, is_platform = resolve_scope_from_account_id(account_id)
      if not user and not is_platform:
        self.stderr.write(self.style.WARNING(f"Account ID {account_id} not found"))
        return

      label = "platform" if is_platform else user.username
      run = train_tenant_sla(user, is_platform=is_platform)
      if run:
        self.stdout.write(
          self.style.SUCCESS(
            f"Trained SLA forecast model for '{label}' (SLA: {run.average_sla:.2f}%)"
          )
        )
      else:
        self.stdout.write(f"Skipped '{label}' (no telemetry data)")

      report = train_threat_model(user, is_platform=is_platform)
      if report:
        self.stdout.write(
          self.style.SUCCESS(
            f"Trained threat forecast model for '{label}' (Score: {report.anomaly_score * 100:.1f}%)"
          )
        )
    except Exception as e:
      self.stderr.write(self.style.ERROR(f"Failed to train account: {e}"))
    finally:
      close_old_connections()

  async def periodic_scheduler(self):
    self.stdout.write(self.style.SUCCESS("Starting periodic daily training scheduler..."))
    await asyncio.sleep(10)
    while True:
      try:
        self.stdout.write("Periodic Scheduler: Triggering full model retraining...")
        from django.core.management import call_command

        await sync_to_async(call_command)("train_all_models")
        self.stdout.write(
          self.style.SUCCESS("Periodic Scheduler: Successfully completed daily training run.")
        )

        from utils.discord import send_discord_alert
        from utils.email import get_recent_stats_text, send_alert_email

        subject = "Daily Platform Status Report"
        message = await sync_to_async(get_recent_stats_text)()

        await sync_to_async(send_alert_email)(subject, message)
        await sync_to_async(send_discord_alert)(subject, message)

      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Periodic Scheduler: Hourly run failed: {e}"))

      await asyncio.sleep(86400)
