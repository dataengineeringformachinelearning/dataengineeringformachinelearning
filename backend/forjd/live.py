"""Live-updates lane — SSE bridge over FORJD's Supabase-backed projection cursor.

Supabase Realtime publishes ``stream_results`` inside FORJD (sql/015); DEML end
users hold Firebase tokens, never Supabase or ``fjsvc_`` credentials, so the
browser cannot subscribe to Supabase directly. This module bridges the gap:
Django holds one tenant-bound cursor poll against FORJD's projections feed and
pushes change ticks to the browser as Server-Sent Events. Payloads stay in the
existing authenticated BFF read endpoints — the stream carries counts and
cursors only, never projection rows, ciphertext, or credentials.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from collections.abc import AsyncIterator
from typing import Any, Final
from urllib.parse import quote

from django.conf import settings
from django.http import HttpRequest, JsonResponse, StreamingHttpResponse

from forjd.client import ForjdClient, ForjdError
from forjd.cutover import reads_from_forjd
from forjd.policy import ForjdPolicyError, policy_error_response
from forjd.tenancy import ForjdTenantCredential
from forjd.views import AdapterError, _credential_for_request

logger = logging.getLogger("forjd.live")

# --- Stream bounds (config-gated; keep one bounded connection per client) ---
DEFAULT_POLL_SECONDS: Final[float] = 10.0
DEFAULT_MAX_STREAM_SECONDS: Final[float] = 300.0
MAX_DELTA_LIMIT: Final[int] = 200


def _poll_seconds() -> float:
  value = float(getattr(settings, "DEML_LIVE_POLL_SECONDS", DEFAULT_POLL_SECONDS))
  return min(60.0, max(3.0, value))


def _max_stream_seconds() -> float:
  value = float(getattr(settings, "DEML_LIVE_STREAM_MAX_SECONDS", DEFAULT_MAX_STREAM_SECONDS))
  return min(900.0, max(30.0, value))


def _live_updates_enabled() -> bool:
  return bool(getattr(settings, "DEML_LIVE_UPDATES_ENABLED", True))


# --- SSE frame helpers ---
def sse_event(event: str, data: dict[str, Any]) -> bytes:
  return f"event: {event}\ndata: {json.dumps(data, separators=(',', ':'))}\n\n".encode()


def sse_comment(text: str) -> bytes:
  return f": {text}\n\n".encode()


# --- FORJD cursor polling (tenant-bound service credential, read scope) ---
async def _fetch_projections(
  client: ForjdClient,
  credential: ForjdTenantCredential,
  *,
  since: str | None,
  request_id: str,
) -> list[dict[str, Any]]:
  query = f"tenant_id={credential.tenant_id}"
  if since:
    # ASC delta after the cursor; bounded page keeps each poll cheap.
    # ISO cursors carry "+00:00" — URL-encode so "+" survives query parsing.
    query += f"&since={quote(since, safe='')}&limit={MAX_DELTA_LIMIT}"
  else:
    # No cursor yet: one DESC row establishes the high-water mark.
    query += "&limit=1"
  response = await client.proxy(
    "GET",
    "/api/v1/projections",
    query_string=query,
    request_id=request_id,
  )
  if response.status >= 400:
    raise ForjdError(response.status, "FORJD projections feed is unavailable")
  try:
    payload = json.loads(response.body or b"{}")
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError) as exc:
    raise ForjdError(502, "FORJD returned an invalid projections response") from exc
  rows = payload.get("projections") if isinstance(payload, dict) else None
  return rows if isinstance(rows, list) else []


def _cursor_from_rows(rows: list[dict[str, Any]], *, ascending: bool) -> str | None:
  ordered = rows[-1] if ascending else rows[0]
  created_at = ordered.get("created_at") if isinstance(ordered, dict) else None
  return str(created_at) if created_at else None


async def _event_stream(
  credential: ForjdTenantCredential,
  *,
  request_id: str,
) -> AsyncIterator[bytes]:
  client = ForjdClient(
    tenant_id=credential.tenant_id,
    service_token=credential.service_token,
  )
  poll_seconds = _poll_seconds()
  deadline = time.monotonic() + _max_stream_seconds()
  cursor: str | None = None

  try:
    rows = await _fetch_projections(client, credential, since=None, request_id=request_id)
    if rows:
      cursor = _cursor_from_rows(rows, ascending=False)
    yield sse_event("ready", {"cursor": cursor, "poll_seconds": poll_seconds})

    while time.monotonic() < deadline:
      await asyncio.sleep(poll_seconds)
      rows = await _fetch_projections(client, credential, since=cursor, request_id=request_id)
      if rows:
        next_cursor = _cursor_from_rows(rows, ascending=cursor is not None)
        cursor = next_cursor or cursor
        yield sse_event("projections", {"count": len(rows), "cursor": cursor})
      else:
        yield sse_comment("keepalive")

    # Bounded stream: the client reconnects with its cursor intact.
    yield sse_event("end", {"cursor": cursor})
  except ForjdError as exc:
    logger.warning("forjd_live_degraded status=%s request_id=%s", exc.status, request_id)
    yield sse_event("degraded", {"code": "forjd_degraded"})
  except asyncio.CancelledError:
    # Client disconnected — normal lifecycle, nothing to emit.
    raise


# --- Django view (GET, Firebase/API-key authenticated, read role) ---
async def live_updates_stream(request: HttpRequest) -> StreamingHttpResponse | JsonResponse:
  """SSE change feed for dashboards — counts and cursors only, never payloads."""
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  if not _live_updates_enabled():
    return JsonResponse(
      {"detail": "Live updates are disabled", "code": "live_updates_disabled"},
      status=503,
    )
  if not reads_from_forjd():
    return JsonResponse(
      {"detail": "FORJD reads are disabled", "code": "forjd_reads_disabled"},
      status=503,
    )

  try:
    # _credential_for_request authorizes the "read" action before resolving
    # the tenant-bound service credential (auto-provisioning when unmapped).
    credential = await _credential_for_request(request)
  except ForjdPolicyError as exc:
    return policy_error_response(exc)
  except AdapterError as exc:
    return JsonResponse({"detail": exc.detail, "code": "forjd_degraded"}, status=exc.status)

  from forjd.api import request_id_from

  response = StreamingHttpResponse(
    _event_stream(credential, request_id=request_id_from(request)),
    content_type="text/event-stream",
  )
  response["Cache-Control"] = "no-cache"
  response["X-Accel-Buffering"] = "no"
  return response
