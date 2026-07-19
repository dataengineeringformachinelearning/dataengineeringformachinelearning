import json
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from django.test import AsyncClient
from forjd.policy import ForjdActorContext
from forjd.tenancy import ForjdTenantCredential
from monitor.models import BugReport, ForjdTenantMapping

from agent.api import _account_pseudonym, deliver_bug_report, redact_report_text

User = get_user_model()

TENANT_ID = UUID("11111111-1111-1111-1111-111111111111")
ACCOUNT_ID = UUID("22222222-2222-2222-2222-222222222222")
CLIENT_REPORT_ID = UUID("33333333-3333-3333-3333-333333333333")


# --- FORJD lane: issue reports become tenant-scoped report documents ---
@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_report_issue_forwards_to_forjd_report_documents(
  async_client: AsyncClient,
) -> None:
  await sync_to_async(User.objects.create_user)(username="learner")
  await sync_to_async(ForjdTenantMapping.objects.create)(
    deml_account_id=ACCOUNT_ID,
    forjd_tenant_id=TENANT_ID,
  )
  payload: dict[str, Any] = {
    "client_report_id": str(CLIENT_REPORT_ID),
    "user_description": "The lesson instructions are unclear",
    "telemetry_context": {
      "url": "https://deml.app/account",
      "userAgent": "Mozilla/5.0",
      "recentErrors": ["Error:TypeError"],
    },
  }
  forjd_response = {"ok": True, "document": {"id": "doc-123"}}

  with (
    patch(
      "agent.api.authorize_forjd_action",
      new=AsyncMock(
        return_value=ForjdActorContext(user_id=1, account_id=ACCOUNT_ID, role="Viewer")
      ),
    ),
    patch(
      "agent.api.resolve_forjd_snapshot_credential",
      return_value=ForjdTenantCredential(
        tenant_id=TENANT_ID, service_token="fjsvc_abcd1234_secret"
      ),
    ),
    patch("agent.api.ForjdClient") as mock_client,
  ):
    mock_client.return_value.request_json = AsyncMock(return_value=forjd_response)
    response = await async_client.post(
      "/api/v1/agent/report-issue",
      data=payload,
      content_type="application/json",
      headers={"authorization": "Bearer mock-token-learner-learner@example.com"},
    )

  assert response.status_code == 200
  assert response.json() == {
    "status": "recorded",
    "id": "doc-123",
    "client_report_id": str(CLIENT_REPORT_ID),
  }
  sent = mock_client.return_value.request_json.await_args
  assert sent.args == ("POST", "/api/v1/reports/documents")
  document = sent.kwargs["payload"]
  assert document["tenant_id"] == str(TENANT_ID)
  assert document["client_report_id"] == str(CLIENT_REPORT_ID)
  assert document["kind"] == "issue_report"
  assert document["body"] == payload["user_description"]
  assert document["context"]["recent_errors"] == ["Error:TypeError"]
  assert document["submitted_by_pseudonym"] == _account_pseudonym(ACCOUNT_ID)
  assert str(ACCOUNT_ID) not in document["submitted_by_pseudonym"]
  # Every report first lands in the durable local delivery outbox.
  report = await sync_to_async(BugReport.objects.get)(client_report_id=CLIENT_REPORT_ID)
  assert report.delivery_status == BugReport.DeliveryStatus.DELIVERED
  assert report.forjd_document_id == "doc-123"


# --- Durable fallback: unmapped accounts still record feedback locally ---
@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_report_issue_falls_back_locally_when_forjd_unmapped(
  async_client: AsyncClient,
) -> None:
  user = await sync_to_async(User.objects.create_user)(username="learner")
  payload: dict[str, Any] = {
    "client_report_id": str(CLIENT_REPORT_ID),
    "user_description": "The lesson instructions are unclear",
    "telemetry_context": {"url": "https://deml.app/account"},
  }

  response = await async_client.post(
    "/api/v1/agent/report-issue",
    data=payload,
    content_type="application/json",
    headers={"authorization": "Bearer mock-token-learner-learner@example.com"},
  )

  assert response.status_code == 200
  data = response.json()
  assert data["status"] == "dead_letter"
  report = await sync_to_async(BugReport.objects.get)(id=data["id"])
  assert report.user_id == user.id
  assert report.user_description == payload["user_description"]
  assert report.delivery_status == BugReport.DeliveryStatus.DEAD_LETTER
  assert report.delivery_attempts == 1
  assert report.last_delivery_error == "forjd_configuration"
  assert report.next_delivery_at is None


# --- Redaction: emails and credential-like material never leave DEML ---
def test_redact_report_text_strips_identifiers_and_credentials() -> None:
  # Assemble at runtime so static secret scanners do not flag the fixture.
  jwt_like = ".".join(("eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxIn0", "c2lnbmF0dXJl"))
  redacted = redact_report_text(f"Contact person@example.com header Bearer abc.def sent {jwt_like}")
  assert "person@example.com" not in redacted
  assert "bearer" not in redacted.lower()
  assert "eyJ" not in redacted
  assert "[redacted-email]" in redacted


def test_redact_report_text_preserves_plain_feedback() -> None:
  text = "The lesson instructions are unclear on step three."
  assert redact_report_text(text) == text
  assert json.dumps({"body": redact_report_text(text)})


def test_report_redaction_strips_query_tokens_phone_ip_and_opaque_keys() -> None:
  redacted = redact_report_text(
    "oauth_code=supersecret session_id=abc123 AKIAIOSFODNN7EXAMPLE "
    "fjsvc_abcd1234_super-secret "
    "deml_deadbeef_0123456789abcdefghijklmnopqrstuvwxyz "
    "call +1 (212) 555-0100 from 203.0.113.9"
  )
  assert "supersecret" not in redacted
  assert "abc123" not in redacted
  assert "AKIA" not in redacted
  assert "fjsvc_" not in redacted
  assert "deml_" not in redacted
  assert "555-0100" not in redacted
  assert "203.0.113.9" not in redacted


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_delivery_boundary_resanitizes_manually_inserted_outbox_row() -> None:
  user = await sync_to_async(User.objects.create_user)(username="boundary-user")
  report = await sync_to_async(BugReport.objects.create)(
    user=user,
    user_description=(
      "Contact raw@example.com with fjsvc_abcd1234_super-secret or "
      "deml_deadbeef_0123456789abcdefghijklmnopqrstuvwxyz"
    ),
    telemetry_context={
      "route": "/account?oauth_code=raw-secret",
      "user_agent": "agent raw@example.com",
      "recent_errors": ["Error:TypeError", "raw@example.com"],
    },
    content_sha256="stale",
    account_id=ACCOUNT_ID,
    forjd_tenant_id=TENANT_ID,
    forjd_service_token_secret_ref="env:FORJD_SERVICE_TOKEN",
    submitted_by_pseudonym=_account_pseudonym(ACCOUNT_ID),
  )
  forjd_response = {"ok": True, "document": {"id": "doc-boundary"}}

  with (
    patch(
      "agent.api.resolve_forjd_snapshot_credential",
      return_value=ForjdTenantCredential(
        tenant_id=TENANT_ID,
        service_token="fjsvc_abcd1234_secret",
      ),
    ),
    patch("agent.api.ForjdClient") as mock_client,
  ):
    mock_client.return_value.request_json = AsyncMock(return_value=forjd_response)
    document_id = await deliver_bug_report(report, account_id=ACCOUNT_ID)

  assert document_id == "doc-boundary"
  document = mock_client.return_value.request_json.await_args.kwargs["payload"]
  serialized = json.dumps(document)
  assert "raw@example.com" not in serialized
  assert "fjsvc_" not in serialized
  assert "deml_" not in serialized
  assert "raw-secret" not in serialized
  assert document["context"] == {
    "route": "/account",
    "user_agent": "agent [redacted-email]",
    "recent_errors": ["Error:TypeError", "client_error"],
  }

  await sync_to_async(report.refresh_from_db)()
  assert report.delivery_status == BugReport.DeliveryStatus.DELIVERED
  assert report.content_sha256 != "stale"
  assert "raw@example.com" not in report.user_description


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_report_retry_keeps_enqueued_tenant_after_account_remap() -> None:
  user = await sync_to_async(User.objects.create_user)(username="stable-destination")
  old_tenant = TENANT_ID
  new_tenant = UUID("44444444-4444-4444-4444-444444444444")
  report = await sync_to_async(BugReport.objects.create)(
    user=user,
    account_id=ACCOUNT_ID,
    forjd_tenant_id=old_tenant,
    forjd_service_token_secret_ref="env:FORJD_SERVICE_TOKEN_CUSTOMER_A",
    submitted_by_pseudonym=_account_pseudonym(ACCOUNT_ID),
    user_description="Retry this exact report",
    telemetry_context={},
  )
  await sync_to_async(ForjdTenantMapping.objects.create)(
    deml_account_id=ACCOUNT_ID,
    forjd_tenant_id=new_tenant,
    service_token_secret_ref="env:FORJD_SERVICE_TOKEN_CUSTOMER_B",
  )

  with (
    patch(
      "agent.api.resolve_forjd_snapshot_credential",
      return_value=ForjdTenantCredential(
        tenant_id=old_tenant,
        service_token="fjsvc_abcd1234_old-secret",
      ),
    ) as resolve,
    patch("agent.api.ForjdClient") as mock_client,
  ):
    mock_client.return_value.request_json = AsyncMock(
      return_value={"document": {"id": "doc-stable"}}
    )
    await deliver_bug_report(report, account_id=ACCOUNT_ID)

  resolve.assert_called_once_with(
    old_tenant,
    "env:FORJD_SERVICE_TOKEN_CUSTOMER_A",
  )
  sent = mock_client.return_value.request_json.await_args.kwargs["payload"]
  assert sent["tenant_id"] == str(old_tenant)
  assert sent["submitted_by_pseudonym"] == _account_pseudonym(ACCOUNT_ID)
