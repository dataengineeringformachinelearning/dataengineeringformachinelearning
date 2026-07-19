from __future__ import annotations

from uuid import UUID

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.utils import timezone

from monitor.models import UserLifecycleJob


class Command(BaseCommand):
  help = "Revive a dead-lettered account lifecycle job after its blocker is resolved."

  def add_arguments(self, parser: CommandParser) -> None:
    parser.add_argument("job_id", type=UUID)

  def handle(self, *args: object, **options: object) -> None:
    job_id = options["job_id"]
    revived = UserLifecycleJob.objects.filter(
      pk=job_id,
      state=UserLifecycleJob.State.DEAD_LETTER,
    ).update(
      state=UserLifecycleJob.State.PENDING,
      attempts=0,
      failure_code="",
      last_error="",
      next_attempt_at=timezone.now(),
      lease_token=None,
      lease_expires_at=None,
      completed_at=None,
      updated_at=timezone.now(),
    )
    if revived != 1:
      raise CommandError("Lifecycle job is not dead-lettered or does not exist")
    self.stdout.write(self.style.SUCCESS(f"Revived lifecycle job {job_id}"))
