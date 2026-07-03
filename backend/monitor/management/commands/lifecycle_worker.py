"""Continuous user lifecycle worker — processes deletion queue between cron sweeps."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from asgiref.sync import sync_to_async
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 30


class Command(BaseCommand):
  help = "Runs continuously, processing pending account deletion lifecycle jobs."

  def handle(self, *args: Any, **options: Any) -> None:
    self.stdout.write(self.style.SUCCESS("Starting lifecycle worker..."))
    asyncio.run(self.run_worker())

  async def run_worker(self) -> None:
    while True:
      try:
        processed = await self.process_jobs()
        if processed:
          self.stdout.write(
            self.style.SUCCESS(f"Lifecycle worker: processed {processed} deletion job(s)")
          )
      except Exception as exc:
        self.stderr.write(self.style.ERROR(f"Lifecycle worker error: {exc}"))
        logger.exception("lifecycle_worker loop error")
      await asyncio.sleep(POLL_INTERVAL_SECONDS)

  @sync_to_async
  def process_jobs(self) -> int:
    from account.lifecycle import process_pending_lifecycle_jobs
    from django.db import close_old_connections

    close_old_connections()
    try:
      return process_pending_lifecycle_jobs()
    finally:
      close_old_connections()
