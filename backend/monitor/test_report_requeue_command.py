from __future__ import annotations

from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from monitor.models import BugReport


def _dead_letter(body: str) -> BugReport:
  return BugReport.objects.create(
    user_description=body,
    telemetry_context={},
    delivery_status=BugReport.DeliveryStatus.DEAD_LETTER,
    delivery_attempts=12,
    last_delivery_error="forjd_http_503",
  )


def test_bug_report_declares_dead_letter_state_and_ready_index() -> None:
  assert BugReport.DeliveryStatus.DEAD_LETTER.value == "dead_letter"
  assert any(index.name == "bug_report_delivery_ready_idx" for index in BugReport._meta.indexes)


@pytest.mark.django_db
def test_operator_can_requeue_exactly_one_dead_letter_report() -> None:
  target = _dead_letter("target")
  untouched = _dead_letter("untouched")
  output = StringIO()

  call_command("requeue_dead_letter_reports", str(target.pk), stdout=output)
  target.refresh_from_db()
  untouched.refresh_from_db()

  assert target.delivery_status == BugReport.DeliveryStatus.PENDING
  assert target.delivery_attempts == 0
  assert target.last_delivery_error == ""
  assert target.next_delivery_at is not None
  assert untouched.delivery_status == BugReport.DeliveryStatus.DEAD_LETTER
  assert "Requeued 1" in output.getvalue()


@pytest.mark.django_db
def test_operator_all_requeue_is_explicit_and_bounded() -> None:
  dead_letters = [_dead_letter(f"report-{index}") for index in range(3)]
  pending = BugReport.objects.create(user_description="already pending", telemetry_context={})

  call_command("requeue_dead_letter_reports", "--all", "--limit", "2")

  statuses = list(
    BugReport.objects.filter(pk__in=[report.pk for report in dead_letters]).values_list(
      "delivery_status", flat=True
    )
  )
  pending.refresh_from_db()
  assert statuses.count(BugReport.DeliveryStatus.PENDING) == 2
  assert statuses.count(BugReport.DeliveryStatus.DEAD_LETTER) == 1
  assert pending.delivery_status == BugReport.DeliveryStatus.PENDING


@pytest.mark.django_db
def test_operator_command_refuses_non_dead_letter_and_ambiguous_scope() -> None:
  pending = BugReport.objects.create(user_description="pending", telemetry_context={})

  with pytest.raises(CommandError, match="not dead-lettered"):
    call_command("requeue_dead_letter_reports", str(pending.pk))
  with pytest.raises(CommandError, match="exactly one"):
    call_command("requeue_dead_letter_reports")
  with pytest.raises(CommandError, match="exactly one"):
    call_command("requeue_dead_letter_reports", str(pending.pk), "--all")
  with pytest.raises(CommandError, match="between 1 and 1000"):
    call_command("requeue_dead_letter_reports", "--all", "--limit", "1001")
