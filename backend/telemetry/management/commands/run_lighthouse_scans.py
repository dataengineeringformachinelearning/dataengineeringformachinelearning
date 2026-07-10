from typing import Any

from django.core.management.base import BaseCommand

from telemetry.worker.schedulers import run_lighthouse_scans_sync


class Command(BaseCommand):
  help = "Runs one symmetrical Lighthouse scan pass for all status-page scopes"

  def handle(self, *args: Any, **options: Any) -> None:
    run_lighthouse_scans_sync(self.stdout, self.style)
