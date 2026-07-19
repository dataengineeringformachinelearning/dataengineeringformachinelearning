"""User-originated learning-platform interactions.

Issue reports are stored first in DEML's durable delivery outbox and then as
idempotent FORJD report documents (tenant-scoped, Supabase Postgres with RLS).
This prevents both loss and duplication across ambiguous network failures.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import re
from datetime import timedelta
from typing import Any, Final
from urllib.parse import urlsplit
from uuid import UUID, uuid4

from asgiref.sync import sync_to_async
from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from forjd.client import ForjdClient, ForjdConfigurationError, ForjdError
from forjd.policy import ForjdPolicyError, authorize_forjd_action
from forjd.tenancy import (
  ForjdTenantConfigurationError,
  resolve_forjd_snapshot_credential,
)
from monitor.models import BugReport, ForjdTenantAssociation, ForjdTenantMapping
from ninja import Router, Schema
from ninja.errors import HttpError

router = Router(tags=["Interactions"])

# --- Redaction: FORJD report documents accept pseudonymous, credential-free text ---
_EMAIL_RE: Final[re.Pattern[str]] = re.compile(
  r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE
)
_JWT_RE: Final[re.Pattern[str]] = re.compile(
  r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b"
)
_BEARER_RE: Final[re.Pattern[str]] = re.compile(r"(?i)\bbearer\b(\s+\S+)?")
_PEM_RE: Final[re.Pattern[str]] = re.compile(r"(?i)-----begin[\s\S]*?(-----end[^-]*-----|\Z)")
_AWS_ACCESS_KEY_RE: Final[re.Pattern[str]] = re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b")
_FORJD_SERVICE_TOKEN_RE: Final[re.Pattern[str]] = re.compile(
  r"(?<![A-Za-z0-9_])fjsvc_[^_\s]{8}_[^\s,;]+",
  re.IGNORECASE,
)
_DEML_API_KEY_RE: Final[re.Pattern[str]] = re.compile(
  r"(?<![A-Za-z0-9_])deml_[A-Za-z0-9]{8}_[A-Za-z0-9_-]{16,}",
  re.IGNORECASE,
)
_SECRET_ASSIGNMENT_RE: Final[re.Pattern[str]] = re.compile(
  r"(?i)\b(?:api[_-]?key|access[_-]?key|secret|password|session[_-]?id|"
  r"refresh[_-]?token|oauth[_-]?code|authorization|cookie)\b\s*[:=]\s*[^\s,;&]+"
)
_PHONE_RE: Final[re.Pattern[str]] = re.compile(r"(?<!\w)(?:\+?\d[\d ().-]{7,}\d)(?!\w)")
_IP_RE: Final[re.Pattern[str]] = re.compile(r"(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])")
_SAFE_ERROR_LABEL_RE: Final[re.Pattern[str]] = re.compile(
  r"\A(?:Error:)?[A-Za-z][A-Za-z0-9_.-]{0,63}\Z"
)

MAX_BODY_CHARS: Final[int] = 8000
MAX_CONTEXT_VALUE_CHARS: Final[int] = 512
MAX_ERROR_ITEM_CHARS: Final[int] = 256
MAX_ERROR_ITEMS: Final[int] = 10
REPORT_MAX_DELIVERY_ATTEMPTS: Final[int] = 12
_RETRYABLE_REPORT_STATUSES: Final[frozenset[int]] = frozenset({408, 425, 429})


class BugReportDeadLetterError(RuntimeError):
  """The report requires an explicit operator requeue before another delivery."""


def redact_report_text(value: str) -> str:
  """Strip common direct identifiers and credential material before persistence."""
  text = _PEM_RE.sub("[redacted-credential]", str(value or ""))
  text = _JWT_RE.sub("[redacted-credential]", text)
  text = _BEARER_RE.sub("[redacted-credential]", text)
  text = _AWS_ACCESS_KEY_RE.sub("[redacted-credential]", text)
  text = _FORJD_SERVICE_TOKEN_RE.sub("[redacted-credential]", text)
  text = _DEML_API_KEY_RE.sub("[redacted-credential]", text)
  text = _SECRET_ASSIGNMENT_RE.sub("[redacted-credential]", text)
  text = _EMAIL_RE.sub("[redacted-email]", text)
  text = _PHONE_RE.sub("[redacted-phone]", text)
  return _IP_RE.sub("[redacted-ip]", text)


def _route_only(value: str) -> str:
  """Keep only a bounded application path; queries/fragments often carry secrets."""
  try:
    parsed = urlsplit(value)
  except ValueError:
    return "/"
  path = parsed.path if parsed.scheme or parsed.netloc else value.split("?", 1)[0].split("#", 1)[0]
  cleaned = path if path.startswith("/") else f"/{path}"
  return redact_report_text(cleaned)[:MAX_CONTEXT_VALUE_CHARS] or "/"


def _report_context(telemetry: object) -> dict[str, Any]:
  """Bounded, PII-minimized context map matching FORJD's metadata contract."""
  if not isinstance(telemetry, dict):
    return {}
  context: dict[str, Any] = {}
  url = telemetry.get("route", telemetry.get("url"))
  if isinstance(url, str) and url:
    context["route"] = _route_only(url)
  user_agent = telemetry.get("userAgent", telemetry.get("user_agent"))
  if isinstance(user_agent, str) and user_agent:
    context["user_agent"] = redact_report_text(user_agent)[:MAX_ERROR_ITEM_CHARS]
  errors = telemetry.get("recentErrors", telemetry.get("recent_errors"))
  if isinstance(errors, list):
    labels = [item for item in errors[:MAX_ERROR_ITEMS] if isinstance(item, str)]
    context["recent_errors"] = [
      item if _SAFE_ERROR_LABEL_RE.fullmatch(item) else "client_error" for item in labels
    ]
  return context


class IssueReportPayload(Schema):
  client_report_id: UUID | None = None
  user_description: str
  telemetry_context: dict[str, Any] = {}


def _content_sha256(body: str, context: dict[str, Any]) -> str:
  canonical = json.dumps(
    {"body": body, "context": context},
    sort_keys=True,
    separators=(",", ":"),
    ensure_ascii=False,
  ).encode()
  return hashlib.sha256(canonical).hexdigest()


def _account_pseudonym(account_id: UUID) -> str:
  digest = hmac.new(
    settings.SECRET_KEY.encode(),
    str(account_id).encode(),
    hashlib.sha256,
  ).hexdigest()[:24]
  return f"acct:{digest}"


def _enqueue_bug_report(
  *,
  user: Any,
  account_id: UUID,
  client_report_id: UUID,
  body: str,
  context: dict[str, Any],
  content_sha256: str,
) -> tuple[BugReport, bool]:
  """Persist report content and its current destination in one local transaction."""
  with transaction.atomic():
    mapping = (
      ForjdTenantMapping.objects.select_for_update()
      .filter(deml_account_id=account_id, is_active=True)
      .first()
    )
    defaults: dict[str, Any] = {
      "user": user,
      "account_id": account_id,
      "submitted_by_pseudonym": _account_pseudonym(account_id),
      "user_description": body,
      "telemetry_context": context,
      "content_sha256": content_sha256,
      "delivery_status": BugReport.DeliveryStatus.PENDING,
    }
    if mapping is not None:
      defaults.update(
        forjd_tenant_id=mapping.forjd_tenant_id,
        forjd_service_token_secret_ref=mapping.service_token_secret_ref,
      )
    return BugReport.objects.get_or_create(
      client_report_id=client_report_id,
      defaults=defaults,
    )


def _assign_report_destination_once(report_id: UUID, fallback_account_id: UUID | None) -> BugReport:
  """Fill a legacy/unmapped destination once; never follow subsequent remaps."""
  with transaction.atomic():
    report = BugReport.objects.select_for_update().get(pk=report_id)
    account_id = report.account_id or fallback_account_id
    if account_id is None:
      raise ForjdTenantConfigurationError("Report has no durable DEML account snapshot")

    changed: list[str] = []
    if report.account_id is None:
      report.account_id = account_id
      changed.append("account_id")
    if not report.submitted_by_pseudonym:
      report.submitted_by_pseudonym = _account_pseudonym(account_id)
      changed.append("submitted_by_pseudonym")

    if report.forjd_tenant_id is None:
      mapping = ForjdTenantMapping.objects.filter(
        deml_account_id=account_id, is_active=True
      ).first()
      if mapping is None:
        raise ForjdTenantConfigurationError(
          "This report has no assigned FORJD tenant and the account is not actively mapped"
        )
      report.forjd_tenant_id = mapping.forjd_tenant_id
      report.forjd_service_token_secret_ref = mapping.service_token_secret_ref
      changed.extend(["forjd_tenant_id", "forjd_service_token_secret_ref"])
    elif not report.forjd_service_token_secret_ref:
      association = (
        ForjdTenantAssociation.objects.filter(
          deml_account_id=account_id,
          forjd_tenant_id=report.forjd_tenant_id,
        )
        .order_by("-mapped_at")
        .first()
      )
      if association is None:
        raise ForjdTenantConfigurationError(
          "Report destination has no retained FORJD service-token reference"
        )
      report.forjd_service_token_secret_ref = association.service_token_secret_ref
      changed.append("forjd_service_token_secret_ref")

    if changed:
      report.save(update_fields=changed)
    return report


async def deliver_bug_report(report: BugReport, *, account_id: UUID | None = None) -> str:
  """Idempotently deliver one durable local outbox row to FORJD."""
  # Never let a direct call or an exact client retry silently revive a poison
  # row. A successful request already in flight may still win and mark the row
  # delivered, which is safe because FORJD deduplicates client_report_id.
  report = await sync_to_async(BugReport.objects.get)(pk=report.pk)
  if report.delivery_status == BugReport.DeliveryStatus.DEAD_LETTER:
    raise BugReportDeadLetterError("Bug report is dead-lettered")
  if report.delivery_status == BugReport.DeliveryStatus.DELIVERED and report.forjd_document_id:
    return report.forjd_document_id

  # Re-sanitize at the data-plane boundary as defense in depth. This protects
  # FORJD even if a row was inserted outside the normal API or predates the
  # outbox migration.
  body = redact_report_text(report.user_description).strip()[:MAX_BODY_CHARS]
  context = _report_context(report.telemetry_context)
  content_sha256 = _content_sha256(body, context)
  if (
    body != report.user_description
    or context != report.telemetry_context
    or content_sha256 != report.content_sha256
  ):
    await sync_to_async(BugReport.objects.filter(pk=report.pk).update)(
      user_description=body,
      telemetry_context=context,
      content_sha256=content_sha256,
    )
    report.user_description = body
    report.telemetry_context = context
    report.content_sha256 = content_sha256
  report = await sync_to_async(_assign_report_destination_once)(report.pk, account_id)
  if report.delivery_status == BugReport.DeliveryStatus.DEAD_LETTER:
    raise BugReportDeadLetterError("Bug report is dead-lettered")
  if report.delivery_status == BugReport.DeliveryStatus.DELIVERED and report.forjd_document_id:
    return report.forjd_document_id
  if report.forjd_tenant_id is None or not report.forjd_service_token_secret_ref:
    raise ForjdTenantConfigurationError("Report has no durable FORJD destination snapshot")
  credential = await sync_to_async(resolve_forjd_snapshot_credential)(
    report.forjd_tenant_id,
    report.forjd_service_token_secret_ref,
  )
  title = " ".join(body.split())[:120] or "Issue report"
  result = await ForjdClient(
    tenant_id=credential.tenant_id,
    service_token=credential.service_token,
  ).request_json(
    "POST",
    "/api/v1/reports/documents",
    payload={
      "tenant_id": str(credential.tenant_id),
      "client_report_id": str(report.client_report_id),
      "kind": "issue_report",
      "title": title,
      "body": body,
      "context": context,
      "submitted_by_pseudonym": report.submitted_by_pseudonym,
    },
  )
  document = result.get("document") if isinstance(result, dict) else None
  document_id = str(document.get("id")) if isinstance(document, dict) else ""
  if not document_id:
    raise ForjdError(502, "FORJD returned no report document id")
  await sync_to_async(BugReport.objects.filter(pk=report.pk).update)(
    delivery_status=BugReport.DeliveryStatus.DELIVERED,
    forjd_document_id=document_id,
    delivery_attempts=F("delivery_attempts") + 1,
    next_delivery_at=None,
    last_delivery_error="",
  )
  return document_id


def _delivery_failure_disposition(exc: Exception) -> tuple[bool, str]:
  """Return retryability and a bounded, credential-free diagnostic code."""
  if isinstance(exc, ForjdTenantConfigurationError | ForjdConfigurationError):
    return False, "forjd_configuration"
  if isinstance(exc, ForjdError):
    status = int(exc.status)
    retryable = status in _RETRYABLE_REPORT_STATUSES or status >= 500
    if 400 <= status <= 599:
      return retryable, f"forjd_http_{status}"
    return False, "forjd_protocol_error"
  if isinstance(exc, TimeoutError):
    return True, "forjd_timeout"
  if isinstance(exc, ConnectionError):
    return True, "forjd_network"
  # Unknown worker failures get a bounded number of retries, while the stored
  # code intentionally excludes exception text and dynamic class names.
  return True, "delivery_internal"


def _record_delivery_failure_sync(report_id: UUID, exc: Exception) -> str:
  retryable, failure_code = _delivery_failure_disposition(exc)
  now = timezone.now()
  with transaction.atomic():
    report = BugReport.objects.select_for_update().get(pk=report_id)
    if report.delivery_status != BugReport.DeliveryStatus.PENDING:
      return report.delivery_status

    attempts = report.delivery_attempts + 1
    exhausted = attempts >= REPORT_MAX_DELIVERY_ATTEMPTS
    dead_lettered = not retryable or exhausted
    report.delivery_attempts = attempts
    report.delivery_status = (
      BugReport.DeliveryStatus.DEAD_LETTER if dead_lettered else BugReport.DeliveryStatus.PENDING
    )
    report.next_delivery_at = (
      None if dead_lettered else now + timedelta(seconds=min(3600, 2 ** min(attempts, 11)))
    )
    report.last_delivery_error = failure_code
    report.save(
      update_fields=[
        "delivery_attempts",
        "delivery_status",
        "next_delivery_at",
        "last_delivery_error",
      ]
    )
    return report.delivery_status


async def _record_delivery_failure(report: BugReport, exc: Exception) -> str:
  """Record one serialized failure without reviving terminal outbox rows."""
  return await sync_to_async(_record_delivery_failure_sync)(report.pk, exc)


@router.post("/report-issue")
async def report_issue(request: Any, payload: IssueReportPayload) -> dict[str, str]:
  if not await sync_to_async(lambda: request.user.is_authenticated)():
    raise HttpError(401, "Not authenticated")
  if not payload.user_description.strip():
    raise HttpError(422, "A description is required")

  try:
    actor = await authorize_forjd_action(request, "report.write", resource_id=request.path)
  except ForjdPolicyError as exc:
    raise HttpError(exc.status, exc.detail) from exc

  client_report_id = payload.client_report_id or uuid4()
  body = redact_report_text(payload.user_description).strip()[:MAX_BODY_CHARS]
  context = _report_context(payload.telemetry_context or {})
  content_sha256 = _content_sha256(body, context)
  report, created = await sync_to_async(_enqueue_bug_report)(
    user=request.user,
    account_id=actor.account_id,
    client_report_id=client_report_id,
    body=body,
    context=context,
    content_sha256=content_sha256,
  )
  if not created and (
    report.user_id != request.user.id
    or report.account_id != actor.account_id
    or report.content_sha256 != content_sha256
  ):
    raise HttpError(409, "client_report_id was already used with different content")
  if report.delivery_status == BugReport.DeliveryStatus.DELIVERED:
    return {
      "status": "recorded",
      "id": report.forjd_document_id or str(report.id),
      "client_report_id": str(report.client_report_id),
    }
  if report.delivery_status == BugReport.DeliveryStatus.DEAD_LETTER:
    return {
      "status": "dead_letter",
      "id": str(report.id),
      "client_report_id": str(report.client_report_id),
    }

  try:
    document_id = await deliver_bug_report(report, account_id=actor.account_id)
    return {
      "status": "recorded",
      "id": document_id,
      "client_report_id": str(report.client_report_id),
    }
  except BugReportDeadLetterError:
    return {
      "status": "dead_letter",
      "id": str(report.id),
      "client_report_id": str(report.client_report_id),
    }
  except (ForjdTenantConfigurationError, ForjdError, TimeoutError, ConnectionError) as exc:
    # The local row is a durable outbox. Exact retries and the reconciliation
    # command reuse the same client_report_id, including after lost responses.
    delivery_status = await _record_delivery_failure(report, exc)
    if delivery_status == BugReport.DeliveryStatus.DELIVERED:
      report = await sync_to_async(BugReport.objects.get)(pk=report.pk)
      return {
        "status": "recorded",
        "id": report.forjd_document_id or str(report.id),
        "client_report_id": str(report.client_report_id),
      }
    return {
      "status": (
        "dead_letter" if delivery_status == BugReport.DeliveryStatus.DEAD_LETTER else "queued"
      ),
      "id": str(report.id),
      "client_report_id": str(report.client_report_id),
    }
