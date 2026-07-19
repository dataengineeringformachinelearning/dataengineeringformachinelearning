from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, call, patch
from uuid import uuid4

import pytest
from agent.api import _record_delivery_failure
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model

from monitor.management.commands.reconcile_forjd_reports import Command
from monitor.models import BugReport


@pytest.mark.asyncio
async def test_reconciliation_reuses_one_event_loop_for_the_whole_batch() -> None:
  command = Command()
  reports = [SimpleNamespace(account_id=uuid4()) for _ in range(3)]
  delivery_loops: list[asyncio.AbstractEventLoop] = []

  async def deliver(*args, **kwargs) -> str:
    delivery_loops.append(asyncio.get_running_loop())
    await asyncio.sleep(0)
    return "document-id"

  with (
    patch.object(command, "_claim_reports", side_effect=[reports, []]) as claim,
    patch(
      "monitor.management.commands.reconcile_forjd_reports.process_pending_lifecycle_jobs",
      return_value=0,
    ) as reconcile_lifecycle,
    patch(
      "monitor.management.commands.reconcile_forjd_reports.deliver_bug_report",
      side_effect=deliver,
    ) as deliver_mock,
    patch(
      "monitor.management.commands.reconcile_forjd_reports.close_forjd_connector",
      new_callable=AsyncMock,
    ) as close_connector,
  ):
    await command._run(limit=10, watch=False, interval=5.0)

  assert claim.call_args_list == [call(8), call(7)]
  assert deliver_mock.await_count == len(reports)
  assert len({id(loop) for loop in delivery_loops}) == 1
  assert delivery_loops[0] is asyncio.get_running_loop()
  close_connector.assert_awaited_once_with()
  reconcile_lifecycle.assert_called_once_with(limit=10)


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_stale_report_failure_cannot_regress_delivered_state() -> None:
  user_model = get_user_model()
  user = await sync_to_async(user_model.objects.create_user)(username="report-race")
  report = await sync_to_async(BugReport.objects.create)(
    user=user,
    user_description="safe report",
    telemetry_context={},
    delivery_status=BugReport.DeliveryStatus.DELIVERED,
    delivery_attempts=3,
    forjd_document_id="document-1",
  )

  await _record_delivery_failure(report, RuntimeError("late failure"))
  await sync_to_async(report.refresh_from_db)()

  assert report.delivery_status == BugReport.DeliveryStatus.DELIVERED
  assert report.delivery_attempts == 3
  assert report.forjd_document_id == "document-1"


@pytest.mark.django_db
def test_reconciliation_claim_excludes_dead_letter_reports() -> None:
  pending = BugReport.objects.create(
    user_description="ready",
    telemetry_context={},
  )
  dead_letter = BugReport.objects.create(
    user_description="quarantined",
    telemetry_context={},
    delivery_status=BugReport.DeliveryStatus.DEAD_LETTER,
    next_delivery_at=None,
  )

  claimed = Command()._claim_reports(10)
  dead_letter.refresh_from_db()

  assert [report.pk for report in claimed] == [pending.pk]
  assert dead_letter.delivery_status == BugReport.DeliveryStatus.DEAD_LETTER
  assert dead_letter.next_delivery_at is None
