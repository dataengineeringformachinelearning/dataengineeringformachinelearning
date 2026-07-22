"""Public status-widget telemetry → sealed FORJD ingest.

Anonymous browsers cannot hold ``fjsvc_`` tokens. The widget posts bounded
performance metrics + a published status-page slug; DEML resolves the page's
tenant, seals server-side, and forwards ciphertext-only to FORJD.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any
from uuid import UUID

from asgiref.sync import sync_to_async
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from monitor.models import ForjdTenantMapping

from forjd.client import ForjdClient, ForjdError
from forjd.cutover import writes_enabled
from forjd.sealed_telemetry import parse_uuid, send_widget_telemetry
from forjd.tenancy import (
  ForjdTenantConfigurationError,
  ForjdTenantCredential,
  resolve_forjd_snapshot_credential,
  resolve_forjd_tenant_credential,
)

logger = logging.getLogger("forjd.widget_telemetry")

_SLUG_PATTERN = re.compile(r"\A[A-Za-z0-9][A-Za-z0-9._-]{0,127}\Z")


def _json_body(request: HttpRequest) -> dict[str, Any]:
  try:
    raw = request.body.decode("utf-8") if request.body else "{}"
    payload = json.loads(raw or "{}")
  except (UnicodeDecodeError, json.JSONDecodeError):
    return {}
  return payload if isinstance(payload, dict) else {}


@sync_to_async
def _credential_for_tenant(tenant_id: UUID) -> ForjdTenantCredential | None:
  """Map a FORJD tenant back to a DEML sealed credential (or platform env)."""
  mapping = (
    ForjdTenantMapping.objects.filter(forjd_tenant_id=tenant_id, is_active=True)
    .order_by("-updated_at")
    .first()
  )
  if mapping is not None:
    try:
      return resolve_forjd_tenant_credential(mapping.deml_account_id)
    except ForjdTenantConfigurationError:
      try:
        return resolve_forjd_snapshot_credential(
          mapping.forjd_tenant_id,
          mapping.service_token_secret_ref,
        )
      except ForjdTenantConfigurationError:
        return None
  # Fall back to platform env credential when the page lives on that tenant.
  try:
    platform = ForjdClient()
    if platform.tenant_id and str(platform.tenant_id) == str(tenant_id):
      return ForjdTenantCredential(
        tenant_id=tenant_id,
        service_token=platform.service_token,
      )
  except Exception:  # — configuration optional for non-platform pages
    return None
  return None


async def _resolve_page_tenant(slug: str) -> UUID | None:
  """Look up a published status page (public FORJD slug route — no auth)."""
  # Public slug endpoint does not require a service token; avoid failing closed
  # when only per-account sealed credentials exist (no platform env token).
  client = ForjdClient(use_service_auth=False)
  try:
    body = await client.request_json(
      "GET",
      f"/api/v1/status/pages/slug/{slug}",
    )
  except ForjdError as exc:
    logger.info("widget telemetry page lookup failed slug=%s status=%s", slug, exc.status)
    return None
  page = body.get("page") if isinstance(body, dict) else None
  if not isinstance(page, dict):
    return None
  if page.get("is_published") is False and str(page.get("slug") or "") != "platform-status":
    return None
  return parse_uuid(page.get("tenant_id"))


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
async def widget_telemetry_proxy(request: HttpRequest) -> JsonResponse:
  """POST /api/v1/system-status/widget-telemetry — anonymous, rate-limited by IP."""
  if request.method != "POST":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  if not writes_enabled():
    return JsonResponse(
      {"detail": "FORJD writes are disabled", "code": "forjd_writes_disabled"},
      status=503,
    )

  payload = _json_body(request)
  slug = str(payload.get("slug") or payload.get("page_id") or "").strip()
  if not slug or _SLUG_PATTERN.fullmatch(slug) is None:
    return JsonResponse({"detail": "Valid status page slug is required"}, status=400)

  try:
    response_time_ms = int(payload.get("response_time_ms") or payload.get("latency_ms") or 0)
  except (TypeError, ValueError):
    response_time_ms = 0
  try:
    status_code = int(payload.get("status_code") or 200)
  except (TypeError, ValueError):
    status_code = 200
  region = str(payload.get("region") or "unknown")[:64]
  device_id = str(payload.get("device_id") or "")[:64] or None

  tenant_id = await _resolve_page_tenant(slug)
  if tenant_id is None:
    # Do not leak whether the slug exists; still return a soft ok for embeds.
    return JsonResponse({"ok": True, "accepted": False, "code": "page_unavailable"}, status=202)

  credential = await _credential_for_tenant(tenant_id)
  if credential is None:
    return JsonResponse({"ok": True, "accepted": False, "code": "tenant_unmapped"}, status=202)

  try:
    result = await send_widget_telemetry(
      credential,
      slug=slug,
      response_time_ms=response_time_ms,
      status_code=status_code,
      region=region,
      device_id=device_id,
    )
  except ForjdError as exc:
    logger.warning("widget sealed ingest failed status=%s slug=%s", exc.status, slug)
    return JsonResponse(
      {"ok": False, "detail": "FORJD is temporarily unavailable", "code": "forjd_degraded"},
      status=503,
    )
  except ForjdTenantConfigurationError:
    logger.warning("widget tenant mapping unavailable slug=%s", slug)
    return JsonResponse(
      {"ok": True, "accepted": False, "code": "credential_unavailable"}, status=202
    )

  return JsonResponse(
    {
      "ok": True,
      "accepted": True,
      "event_id": result.get("event_id") or result.get("id"),
    },
    status=202,
  )
