from __future__ import annotations

from uuid import UUID

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import transaction
from django.utils import timezone

from monitor.models import BugReport

MAX_REQUEUE_BATCH = 1000


class Command(BaseCommand):
  help = (
    "Explicitly requeue one dead-lettered issue report, or a bounded batch, "
    "after the FORJD blocker has been resolved."
  )

  def add_arguments(self, parser: CommandParser) -> None:
    parser.add_argument("report_id", nargs="?", type=UUID)
    parser.add_argument(
      "--all",
      action="store_true",
      dest="all_reports",
      help="Requeue an oldest-first bounded batch of dead-lettered reports.",
    )
    parser.add_argument("--limit", type=int, default=100)

  def handle(self, *args: object, **options: object) -> None:
    report_id = options.get("report_id")
    all_reports = bool(options.get("all_reports"))
    if (report_id is None) == (not all_reports):
      raise CommandError("Provide exactly one report_id or --all")

    limit = int(options.get("limit") or 0)
    if limit < 1 or limit > MAX_REQUEUE_BATCH:
      raise CommandError(f"--limit must be between 1 and {MAX_REQUEUE_BATCH}")

    with transaction.atomic():
      dead_letters = BugReport.objects.select_for_update(skip_locked=True).filter(
        delivery_status=BugReport.DeliveryStatus.DEAD_LETTER
      )
      if report_id is not None:
        report_ids = list(dead_letters.filter(pk=report_id).values_list("pk", flat=True))
        if not report_ids:
          raise CommandError("Bug report is not dead-lettered or does not exist")
      else:
        report_ids = list(
          dead_letters.order_by("created_at", "pk").values_list("pk", flat=True)[:limit]
        )

      requeued = BugReport.objects.filter(
        pk__in=report_ids,
        delivery_status=BugReport.DeliveryStatus.DEAD_LETTER,
      ).update(
        delivery_status=BugReport.DeliveryStatus.PENDING,
        delivery_attempts=0,
        next_delivery_at=timezone.now(),
        last_delivery_error="",
      )

    self.stdout.write(self.style.SUCCESS(f"Requeued {requeued} dead-lettered report(s)"))
