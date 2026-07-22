"""Sync linked GA / Clarity / Cloudflare metrics into sealed FORJD ingest."""

from __future__ import annotations

import logging
import time
from typing import Any

from django.core.management.base import BaseCommand
from django.db import close_old_connections

from monitor.analytics_sync import sync_all_active

logger = logging.getLogger("monitor.analytics_sync.command")


class Command(BaseCommand):
  help = "Pull analytics provider rollups and seal them into FORJD"

  def add_arguments(self, parser) -> None:
    parser.add_argument("--watch", action="store_true")
    parser.add_argument("--interval", type=float, default=3600.0)
    parser.add_argument("--limit", type=int, default=100)

  def handle(self, *args: Any, **options: Any) -> None:
    interval = max(300.0, min(float(options["interval"]), 86400.0))
    limit = max(1, min(int(options["limit"]), 500))
    while True:
      close_old_connections()
      try:
        results = sync_all_active(limit=limit)
        ok = sum(1 for row in results if row.ok)
        sealed = sum(1 for row in results if row.sealed)
        self.stdout.write(
          self.style.SUCCESS(
            f"sync_analytics_integrations total={len(results)} ok={ok} sealed={sealed}"
          )
        )
        for row in results:
          logger.info(
            "analytics_sync provider=%s account=%s ok=%s sealed=%s detail=%s",
            row.provider,
            row.account_id,
            row.ok,
            row.sealed,
            row.detail,
          )
      except Exception:
        logger.exception("sync_analytics_integrations failed")
        self.stdout.write(self.style.ERROR("sync_analytics_integrations failed"))
      if not options["watch"]:
        return
      time.sleep(interval)
