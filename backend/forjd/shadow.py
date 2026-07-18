"""Dual-write shadow receipts — ciphertext-blind cutover audit trail."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from asgiref.sync import sync_to_async
from monitor.models import ForjdShadowReceipt

from forjd.cutover import log_cutover_event, shadow_writes_enabled

logger = logging.getLogger("forjd.shadow")


def _receipt_fields_from_payload(payload: dict[str, Any]) -> dict[str, str]:
  envelope = payload.get("envelope") if isinstance(payload.get("envelope"), dict) else {}
  return {
    "client_event_id": str(payload.get("client_event_id") or "")[:128],
    "workflow_id": str(payload.get("workflow_id") or "")[:128],
    "content_type": str(payload.get("content_type") or "")[:128],
    "event_type": str(payload.get("event_type") or "")[:128],
    "ciphertext_sha256": str(envelope.get("ciphertext_sha256") or "")[:64],
  }


def record_shadow_receipt(
  *,
  forjd_tenant_id: UUID,
  payload: dict[str, Any],
  forjd_status: int | None,
  forjd_ok: bool,
  request_id: str | None = None,
  deml_account_id: UUID | None = None,
) -> None:
  """Persist metadata-only dual-write receipt. Never stores ciphertext."""
  if not shadow_writes_enabled():
    return
  fields = _receipt_fields_from_payload(payload)
  if not fields["client_event_id"]:
    return
  try:
    ForjdShadowReceipt.objects.create(
      deml_account_id=deml_account_id,
      forjd_tenant_id=forjd_tenant_id,
      forjd_status=forjd_status,
      forjd_ok=forjd_ok,
      request_id=str(request_id or "")[:64],
      **fields,
    )
    log_cutover_event(
      "shadow_receipt",
      tenant_id=forjd_tenant_id,
      client_event_id=fields["client_event_id"],
      forjd_ok=forjd_ok,
      forjd_status=forjd_status,
    )
  except Exception:  # — shadow must never fail the user request
    logger.exception("failed to persist FORJD shadow receipt")


async def record_shadow_receipt_async(
  *,
  forjd_tenant_id: UUID,
  payload: dict[str, Any],
  forjd_status: int | None,
  forjd_ok: bool,
  request_id: str | None = None,
  deml_account_id: UUID | None = None,
) -> None:
  await sync_to_async(record_shadow_receipt)(
    forjd_tenant_id=forjd_tenant_id,
    payload=payload,
    forjd_status=forjd_status,
    forjd_ok=forjd_ok,
    request_id=request_id,
    deml_account_id=deml_account_id,
  )


def record_shadow_batch(
  *,
  forjd_tenant_id: UUID,
  events: list[dict[str, Any]],
  forjd_status: int | None,
  forjd_ok: bool,
  request_id: str | None = None,
  deml_account_id: UUID | None = None,
) -> None:
  for event in events:
    record_shadow_receipt(
      forjd_tenant_id=forjd_tenant_id,
      payload=event,
      forjd_status=forjd_status,
      forjd_ok=forjd_ok,
      request_id=request_id,
      deml_account_id=deml_account_id,
    )
