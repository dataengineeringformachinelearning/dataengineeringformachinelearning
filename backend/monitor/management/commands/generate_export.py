"""Process queued analytics export jobs into RustFS objects."""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from monitor.services.exports import process_export_job, process_queued_exports


class Command(BaseCommand):
  help = "Generate analytics export artifacts and upload them to RustFS"

  def add_arguments(self, parser: Any) -> None:
    parser.add_argument(
      "--job-id",
      type=str,
      default="",
      help="Process a single ExportJob id (otherwise drain the queue)",
    )
    parser.add_argument(
      "--limit",
      type=int,
      default=20,
      help="Max queued jobs to process when --job-id is omitted",
    )

  def handle(self, *args: Any, **options: Any) -> None:
    job_id = (options.get("job_id") or "").strip()
    if job_id:
      job = process_export_job(job_id)
      self.stdout.write(self.style.SUCCESS(f"Export {job.id} → {job.status}"))
      if job.error:
        self.stderr.write(job.error)
      return

    count = process_queued_exports(limit=int(options.get("limit") or 20))
    self.stdout.write(self.style.SUCCESS(f"Processed {count} queued export job(s)"))
