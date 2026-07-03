import asyncio
import logging
from datetime import timedelta
from typing import Any

from asgiref.sync import sync_to_async
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone
from utils.retention import DEK_ROTATION_MAX_AGE_DAYS, RAW_TELEMETRY_RETENTION_DAYS

from monitor.models import DataEncryptionKey

logger = logging.getLogger(__name__)

# Stagger daily jobs so they do not hammer Postgres/Stripe at worker startup.
DAILY_COMPLIANCE_OFFSET_SECONDS = 0
DAILY_DARK_WEB_OFFSET_SECONDS = 3600
DAILY_SUBSCRIPTION_OFFSET_SECONDS = 7200
DAILY_VACUUM_OFFSET_SECONDS = 10800

HOURLY_INTERVAL_SECONDS = 3600
DAILY_INTERVAL_SECONDS = 86400


class Command(BaseCommand):
  help = "Runs the async Security and Compliance background worker"

  def __init__(self, *args: Any, **kwargs: Any) -> None:
    super().__init__(*args, **kwargs)
    self.background_tasks: set[asyncio.Task] = set()

  def handle(self, *args: Any, **options: Any) -> None:
    self.stdout.write(self.style.SUCCESS("Starting Security Worker..."))
    asyncio.run(self.run_worker())

  async def run_worker(self) -> None:
    schedulers = (
      self.threat_intel_scheduler(),
      self.taxii_scheduler(),
      self.compliance_scheduler(),
      self.dark_web_scheduler(),
      self.subscription_sweep_scheduler(),
      self.optimize_scheduler(),
    )
    for coro in schedulers:
      task = asyncio.create_task(coro)
      self.background_tasks.add(task)
      task.add_done_callback(self.background_tasks.discard)

    while True:
      await asyncio.sleep(HOURLY_INTERVAL_SECONDS)

  @staticmethod
  @sync_to_async
  def run_sync_command(cmd_name: str, *cmd_args: Any) -> None:
    from django.db import close_old_connections

    close_old_connections()
    try:
      call_command(cmd_name, *cmd_args)
    finally:
      close_old_connections()

  async def threat_intel_scheduler(self) -> None:
    self.stdout.write(self.style.SUCCESS("Starting Threat Intel sync scheduler..."))
    while True:
      try:
        self.stdout.write("Security Worker: Syncing threat intelligence data...")
        await self.run_sync_command("fetch_threat_intel")
        self.stdout.write(
          self.style.SUCCESS("Security Worker: Threat intelligence sync completed.")
        )
      except Exception as e:
        self.stderr.write(
          self.style.ERROR(f"Security Worker: Threat intelligence sync failed: {e}")
        )

      await asyncio.sleep(HOURLY_INTERVAL_SECONDS)

  async def taxii_scheduler(self) -> None:
    """Poll configured TAXII feeds hourly (skips quietly when unconfigured)."""
    import os

    self.stdout.write(self.style.SUCCESS("Starting TAXII ingest scheduler..."))
    while True:
      collection_url = os.getenv("TAXII_COLLECTION_URL")
      if collection_url:
        try:
          from telemetry.tasks.taxii_client import TAXIIClient

          client = TAXIIClient(
            discovery_url=os.getenv("TAXII_DISCOVERY_URL", collection_url),
            username=os.getenv("TAXII_USERNAME"),
            password=os.getenv("TAXII_PASSWORD"),
          )
          indicators = await client.fetch_indicators(collection_url)
          await client.ingest_to_db(
            indicators, source_name=os.getenv("TAXII_SOURCE_NAME", "taxii_feed")
          )
          self.stdout.write(
            self.style.SUCCESS(f"TAXII ingest completed ({len(indicators)} indicators).")
          )
        except Exception as e:
          self.stderr.write(self.style.ERROR(f"TAXII ingest failed: {e}"))

      await asyncio.sleep(HOURLY_INTERVAL_SECONDS)

  async def compliance_scheduler(self) -> None:
    self.stdout.write(
      self.style.SUCCESS(
        f"Starting Compliance ({RAW_TELEMETRY_RETENTION_DAYS}-day retention/cleanup) scheduler..."
      )
    )
    await asyncio.sleep(DAILY_COMPLIANCE_OFFSET_SECONDS)
    while True:
      try:
        await self.check_and_rotate_keys()

        self.stdout.write(
          f"Security Worker: Running db_cleanup (retention: {RAW_TELEMETRY_RETENTION_DAYS} days)..."
        )
        await self.run_sync_command("db_cleanup")
        self.stdout.write(self.style.SUCCESS("Security Worker: Database cleanup completed."))
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Security Worker: Compliance task run failed: {e}"))

      await asyncio.sleep(DAILY_INTERVAL_SECONDS)

  async def dark_web_scheduler(self) -> None:
    self.stdout.write(self.style.SUCCESS("Starting Dark Web Scanner scheduler..."))
    await asyncio.sleep(DAILY_DARK_WEB_OFFSET_SECONDS)
    while True:
      try:
        self.stdout.write("Security Worker: Running Dark Web and OSINT scanner...")
        await self.run_sync_command("scan_dark_web")
        self.stdout.write(self.style.SUCCESS("Security Worker: Dark Web scan completed."))
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Security Worker: Dark Web scan failed: {e}"))

      await asyncio.sleep(DAILY_INTERVAL_SECONDS)

  async def subscription_sweep_scheduler(self) -> None:
    self.stdout.write(self.style.SUCCESS("Starting Subscription Sweep scheduler..."))
    await asyncio.sleep(DAILY_SUBSCRIPTION_OFFSET_SECONDS)
    while True:
      try:
        self.stdout.write("Security Worker: Running account reconciliation sweep...")
        await self.run_sync_command("reconcile_accounts")
        self.stdout.write(self.style.SUCCESS("Security Worker: Account reconciliation completed."))
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Security Worker: Subscription sweep failed: {e}"))

      await asyncio.sleep(DAILY_INTERVAL_SECONDS)

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
      if age >= timedelta(days=DEK_ROTATION_MAX_AGE_DAYS):
        self.stdout.write(
          self.style.WARNING(
            f"Active Data Encryption Key ({active_key.id}) is {age.days} days old "
            f"(exceeds {DEK_ROTATION_MAX_AGE_DAYS}-day limit). Triggering key rotation..."
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

  async def optimize_scheduler(self) -> None:
    self.stdout.write(self.style.SUCCESS("Starting Database Optimizer scheduler..."))
    await asyncio.sleep(DAILY_VACUUM_OFFSET_SECONDS)
    while True:
      try:
        await self.optimize_database()
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Security Worker: Database optimization failed: {e}"))

      await asyncio.sleep(DAILY_INTERVAL_SECONDS)

  @sync_to_async
  def optimize_database(self) -> None:
    from django.db import close_old_connections, connection

    close_old_connections()
    try:
      self.stdout.write(
        "Security Worker: Running VACUUM ANALYZE to optimize queries and free space..."
      )
      if connection.vendor == "postgresql":
        with connection.cursor() as cursor:
          connection.autocommit = True
          cursor.execute("VACUUM ANALYZE;")
          connection.autocommit = False
        self.stdout.write(self.style.SUCCESS("Security Worker: VACUUM ANALYZE completed."))
      elif connection.vendor == "sqlite":
        with connection.cursor() as cursor:
          cursor.execute("VACUUM;")
        self.stdout.write(self.style.SUCCESS("Security Worker: VACUUM completed (SQLite)."))
      else:
        self.stdout.write(
          self.style.WARNING(
            f"Security Worker: Skipping VACUUM on unsupported vendor {connection.vendor}"
          )
        )
    except Exception as e:
      self.stderr.write(self.style.ERROR(f"Security Worker: Database optimization failed: {e}"))
    finally:
      close_old_connections()
