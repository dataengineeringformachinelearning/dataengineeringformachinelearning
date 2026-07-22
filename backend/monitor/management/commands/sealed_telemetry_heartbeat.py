"""Seal platform heartbeats into FORJD so analytics/ML workers stay fed."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from django.core.management.base import BaseCommand
from forjd.client import ForjdConfigurationError, ForjdError, close_forjd_connector
from forjd.sealed_telemetry import send_heartbeat_batch

logger = logging.getLogger("forjd.sealed_telemetry.command")


class Command(BaseCommand):
  help = "Seal DEML platform telemetry heartbeats into FORJD (ciphertext only)"

  def add_arguments(self, parser) -> None:
    parser.add_argument("--count", type=int, default=6)
    parser.add_argument("--watch", action="store_true")
    parser.add_argument("--interval", type=float, default=300.0)

  def handle(self, *args: Any, **options: Any) -> None:
    count = max(1, min(int(options["count"]), 25))
    interval = max(60.0, min(float(options["interval"]), 3600.0))
    asyncio.run(
      self._run(
        count=count,
        watch=bool(options["watch"]),
        interval=interval,
      )
    )

  async def _run(self, *, count: int, watch: bool, interval: float) -> None:
    try:
      while True:
        try:
          result = await send_heartbeat_batch(count=count)
          self.stdout.write(
            self.style.SUCCESS(
              "sealed_telemetry_heartbeat "
              f"accepted={result.get('accepted')} failed={result.get('failed')}"
            )
          )
        except ForjdConfigurationError as exc:
          self.stdout.write(self.style.WARNING(f"sealed_telemetry_heartbeat skipped: {exc}"))
          logger.warning("sealed heartbeat skipped: %s", exc)
        except ForjdError as exc:
          self.stdout.write(self.style.ERROR(f"sealed_telemetry_heartbeat failed: {exc}"))
          logger.exception("sealed heartbeat failed status=%s", exc.status)
        if not watch:
          return
        await asyncio.sleep(interval)
    finally:
      await close_forjd_connector()
