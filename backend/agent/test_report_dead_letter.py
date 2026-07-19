from __future__ import annotations

from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from django.test import AsyncClient
from forjd.client import ForjdError
from forjd.policy import ForjdActorContext
from monitor.models import BugReport

from agent.api import (
  REPORT_MAX_DELIVERY_ATTEMPTS,
  _content_sha256,
  _record_delivery_failure,
  deliver_bug_report,
)

User = get_user_model()
TENANT_ID = UUID("11111111-1111-1111-1111-111111111111")
ACCOUNT_ID = UUID("22222222-2222-2222-2222-222222222222")
CLIENT_REPORT_ID = UUID("33333333-3333-3333-3333-333333333333")


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_exact_api_retry_does_not_bypass_dead_letter(
  async_client: AsyncClient,
) -> None:
  user = await sync_to_async(User.objects.create_user)(username="learner")
  body = "Keep this quarantined until an operator reviews it"
  await sync_to_async(BugReport.objects.create)(
    user=user,
    account_id=ACCOUNT_ID,
    forjd_tenant_id=TENANT_ID,
    forjd_service_token_secret_ref="env:FORJD_SERVICE_TOKEN",
    user_description=body,
    telemetry_context={},
    content_sha256=_content_sha256(body, {}),
    client_report_id=CLIENT_REPORT_ID,
    delivery_status=BugReport.DeliveryStatus.DEAD_LETTER,
    delivery_attempts=1,
    last_delivery_error="forjd_http_401",
  )

  with (
    patch(
      "agent.api.authorize_forjd_action",
      new=AsyncMock(
        return_value=ForjdActorContext(user_id=user.id, account_id=ACCOUNT_ID, role="Viewer")
      ),
    ),
    patch("agent.api.deliver_bug_report", new_callable=AsyncMock) as deliver,
  ):
    response = await async_client.post(
      "/api/v1/agent/report-issue",
      data={
        "client_report_id": str(CLIENT_REPORT_ID),
        "user_description": body,
        "telemetry_context": {},
      },
      content_type="application/json",
      headers={"authorization": "Bearer mock-token-learner-learner@example.com"},
    )

  assert response.status_code == 200
  assert response.json()["status"] == "dead_letter"
  deliver.assert_not_awaited()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_direct_delivery_refuses_dead_letter_without_network_call() -> None:
  report = await sync_to_async(BugReport.objects.create)(
    user_description="quarantined",
    telemetry_context={},
    delivery_status=BugReport.DeliveryStatus.DEAD_LETTER,
  )

  with patch("agent.api.ForjdClient") as client:
    with pytest.raises(RuntimeError, match="dead-lettered"):
      await deliver_bug_report(report)

  client.assert_not_called()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_permanent_forjd_4xx_is_dead_lettered_with_redacted_code() -> None:
  report = await sync_to_async(BugReport.objects.create)(
    user_description="safe report",
    telemetry_context={},
  )

  status = await _record_delivery_failure(
    report,
    ForjdError(401, "Bearer fjsvc_abcd1234_do-not-store-this"),
  )
  await sync_to_async(report.refresh_from_db)()

  assert status == BugReport.DeliveryStatus.DEAD_LETTER
  assert report.delivery_status == BugReport.DeliveryStatus.DEAD_LETTER
  assert report.delivery_attempts == 1
  assert report.last_delivery_error == "forjd_http_401"
  assert "do-not-store" not in report.last_delivery_error
  assert report.next_delivery_at is None


@pytest.mark.parametrize("status_code", [408, 425, 429, 500, 503])
@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_transient_forjd_failures_are_retried_with_backoff(status_code: int) -> None:
  report = await sync_to_async(BugReport.objects.create)(
    user_description="safe report",
    telemetry_context={},
  )

  status = await _record_delivery_failure(
    report,
    ForjdError(status_code, "temporary upstream response"),
  )
  await sync_to_async(report.refresh_from_db)()

  assert status == BugReport.DeliveryStatus.PENDING
  assert report.delivery_status == BugReport.DeliveryStatus.PENDING
  assert report.delivery_attempts == 1
  assert report.last_delivery_error == f"forjd_http_{status_code}"
  assert report.next_delivery_at is not None


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_retryable_failures_stop_at_attempt_cap_and_stay_terminal() -> None:
  report = await sync_to_async(BugReport.objects.create)(
    user_description="safe report",
    telemetry_context={},
    delivery_attempts=REPORT_MAX_DELIVERY_ATTEMPTS - 1,
  )

  first_status = await _record_delivery_failure(report, ForjdError(503, "temporary"))
  second_status = await _record_delivery_failure(report, ForjdError(503, "still temporary"))
  await sync_to_async(report.refresh_from_db)()

  assert first_status == BugReport.DeliveryStatus.DEAD_LETTER
  assert second_status == BugReport.DeliveryStatus.DEAD_LETTER
  assert report.delivery_status == BugReport.DeliveryStatus.DEAD_LETTER
  assert report.delivery_attempts == REPORT_MAX_DELIVERY_ATTEMPTS
  assert report.last_delivery_error == "forjd_http_503"
  assert report.next_delivery_at is None
