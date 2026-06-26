import asyncio
import logging
from datetime import timedelta
from typing import Any

from asgiref.sync import sync_to_async
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

from monitor.models import DataEncryptionKey

logger = logging.getLogger(__name__)


class Command(BaseCommand):
  help = "Runs the async Security and Compliance background worker"

  def __init__(self, *args: Any, **kwargs: Any) -> None:
    super().__init__(*args, **kwargs)
    self.background_tasks = set()

  def handle(self, *args: Any, **options: Any) -> None:
    self.stdout.write(self.style.SUCCESS("Starting Security Worker..."))
    asyncio.run(self.run_worker())

  async def run_worker(self) -> None:
    # Schedule periodic tasks
    # 1. Threat Intel Sync: Hourly
    # 2. Key Rotation & DB Cleanup check: Daily
    task1 = asyncio.create_task(self.threat_intel_scheduler())
    self.background_tasks.add(task1)
    task1.add_done_callback(self.background_tasks.discard)

    task2 = asyncio.create_task(self.compliance_scheduler())
    self.background_tasks.add(task2)
    task2.add_done_callback(self.background_tasks.discard)

    task3 = asyncio.create_task(self.dark_web_scheduler())
    self.background_tasks.add(task3)
    task3.add_done_callback(self.background_tasks.discard)

    task4 = asyncio.create_task(self.subscription_sweep_scheduler())
    self.background_tasks.add(task4)
    task4.add_done_callback(self.background_tasks.discard)

    # Keep worker alive
    while True:
      await asyncio.sleep(3600)

  async def threat_intel_scheduler(self) -> None:
    from django.db import close_old_connections

    @sync_to_async
    def run_sync_command(cmd_name):
      close_old_connections()
      try:
        call_command(cmd_name)
      finally:
        close_old_connections()

    self.stdout.write(self.style.SUCCESS("Starting Threat Intel sync scheduler..."))
    while True:
      try:
        self.stdout.write("Security Worker: Syncing threat intelligence data...")
        await run_sync_command("fetch_threat_intel")
        self.stdout.write(
          self.style.SUCCESS("Security Worker: Threat intelligence sync completed.")
        )
      except Exception as e:
        self.stderr.write(
          self.style.ERROR(f"Security Worker: Threat intelligence sync failed: {e}")
        )

      # Sync hourly (3600 seconds)
      await asyncio.sleep(3600)

  async def compliance_scheduler(self) -> None:
    from django.db import close_old_connections

    @sync_to_async
    def run_sync_command(cmd_name):
      close_old_connections()
      try:
        call_command(cmd_name)
      finally:
        close_old_connections()

    self.stdout.write(
      self.style.SUCCESS("Starting Compliance (30-day rotation/cleanup) scheduler...")
    )
    while True:
      try:
        # Check active DEK age
        await self.check_and_rotate_keys()

        # Trigger DB logs/telemetry cleanup
        self.stdout.write(
          "Security Worker: Cleaning up database telemetry and logs older than 30 days..."
        )
        await run_sync_command("db_cleanup")
        self.stdout.write(self.style.SUCCESS("Security Worker: Database cleanup completed."))
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Security Worker: Compliance task run failed: {e}"))

      # Run once every 24 hours (86400 seconds)
      await asyncio.sleep(86400)

  async def dark_web_scheduler(self) -> None:
    from django.db import close_old_connections

    @sync_to_async
    def run_sync_command(cmd_name):
      close_old_connections()
      try:
        call_command(cmd_name)
      finally:
        close_old_connections()

    self.stdout.write(self.style.SUCCESS("Starting Dark Web Scanner scheduler..."))
    while True:
      try:
        self.stdout.write("Security Worker: Running Dark Web and OSINT scanner...")
        await run_sync_command("scan_dark_web")
        self.stdout.write(self.style.SUCCESS("Security Worker: Dark Web scan completed."))
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Security Worker: Dark Web scan failed: {e}"))

      # Run once every 24 hours (86400 seconds)
      await asyncio.sleep(86400)

  async def subscription_sweep_scheduler(self) -> None:
    from django.db import close_old_connections

    @sync_to_async
    def run_sync_command(cmd_name):
      close_old_connections()
      try:
        call_command(cmd_name)
      finally:
        close_old_connections()

    self.stdout.write(self.style.SUCCESS("Starting Subscription Sweep scheduler..."))
    while True:
      try:
        self.stdout.write("Security Worker: Running subscription sync sweep...")
        await run_sync_command("sync_subscriptions")
        self.stdout.write(self.style.SUCCESS("Security Worker: Subscription sweep completed."))
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Security Worker: Subscription sweep failed: {e}"))

      # Run once every 24 hours (86400 seconds)
      await asyncio.sleep(86400)

  @sync_to_async
  def check_and_rotate_keys(self) -> None:
    from django.db import close_old_connections

    close_old_connections()
    try:
      self.stdout.write("Security Worker: Checking Data Encryption Key (DEK) status...")
      active_key = DataEncryptionKey.objects.filter(is_active=True).order_by("-created_at").first()

      if not active_key:
        self.stdout.write(
          self.style.WARNING(
            "No active Data Encryption Key found. Triggering initial key rotation..."
          )
        )
        call_command("rotate_keys")
        return

      age = timezone.now() - active_key.created_at
      if age >= timedelta(days=30):
        self.stdout.write(
          self.style.WARNING(
            f"Active Data Encryption Key ({active_key.id}) is {age.days} days old (exceeds 30-day limit). Triggering key rotation..."
          )
        )
        call_command("rotate_keys")
      else:
        self.stdout.write(
          self.style.SUCCESS(
            f"Active Data Encryption Key ({active_key.id}) is compliant ({age.days} days old)."
          )
        )
    finally:
      close_old_connections()
