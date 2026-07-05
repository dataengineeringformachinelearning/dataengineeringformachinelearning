"""
Internal API endpoints — consumed exclusively by deml-daemon (Rust).

These endpoints are NOT public. They are protected by a shared secret
(`X-Internal-Secret` header) and must NEVER be exposed via the public API docs
(they are added to the Ninja router with `include_in_schema=False`).

Endpoints:
  POST /api/v1/internal/ingest/ping/ — receives batch HTTP probe results from
                                       the Rust health_pinger task and writes
                                       enriched Endpoints rows via the Django ORM.
"""

from __future__ import annotations

import logging
from typing import Final

from django.conf import settings
from django.http import HttpRequest
from ninja import Router
from ninja.security import APIKeyHeader
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class InternalSecretAuth(APIKeyHeader):
  """Validates the `X-Internal-Secret` header against the shared secret.

  The daemon and backend share the same value via environment variable.
  This is a defence-in-depth check — the LAN network boundary (docker compose
  internal network / Railway private networking) is the primary control.
  """

  param_name = "X-Internal-Secret"

  def authenticate(self, request: HttpRequest, key: str | None) -> str | None:
    if key and key == settings.INTERNAL_SECRET:
      return key  # truthy — Ninja grants access
    return None  # None → 401 Unauthorized


router = Router(auth=InternalSecretAuth(), tags=["internal"])

# ── Schemas ───────────────────────────────────────────────────────────────────


class PingResultIn(BaseModel):
  """Single probe result from deml-daemon health_pinger."""

  url: str
  status_code: int
  response_time_ms: int
  is_active: bool
  account_id: str | None = None
  is_platform: bool = False


class IngestResponse(BaseModel):
  ok: bool
  inserted: int
  message: str = ""


# ── Endpoint ──────────────────────────────────────────────────────────────────


@router.post("/ingest/ping/", response=IngestResponse, include_in_schema=False)
def ingest_ping_results(request: HttpRequest, results: list[PingResultIn]) -> IngestResponse:
  """Accept a batch of HTTP probe timings from deml-daemon and write Endpoints rows.

  The Rust pinger supplies raw timing data; this endpoint performs the
  Django-side enrichment: IP geolocation, scope resolution, and ORM bulk_create.
  """
  from datetime import timedelta

  from account.context import resolve_scope_from_account_id
  from monitor.models import Endpoints

  if not results:
    return IngestResponse(ok=True, inserted=0, message="empty batch")

  # Resolve enrichment for placeholder pinger IP (127.0.0.1 — the probes originate
  # from inside the cluster, not from the monitored service's IP).
  ip_data: Final = {"location": "Cluster", "asn": "N/A", "isp": "Internal Network"}

  objects_to_create: list[Endpoints] = []
  for r in results:
    try:
      account_key = r.account_id or ("platform" if r.is_platform else None)
      if not account_key:
        continue

      user_obj, is_platform = resolve_scope_from_account_id(account_key)
      if not is_platform and not user_obj:
        continue

      objects_to_create.append(
        Endpoints(
          user=None if is_platform else user_obj,
          is_platform=is_platform,
          url=r.url,
          status_code=r.status_code,
          response_time=timedelta(milliseconds=r.response_time_ms),
          ip_address="127.0.0.1",
          location=ip_data["location"],
          asn=ip_data["asn"],
          isp=ip_data["isp"],
          device_type="Bot",
          os_name="Unknown",
          browser_name="Unknown",
          is_bot=True,
          is_active=r.is_active,
          telemetry_context={"source": "deml-daemon:health_pinger"},
        )
      )
    except Exception as exc:
      logger.warning("ingest_ping: skipping result for %s — %s", r.url, exc)

  if objects_to_create:
    Endpoints.objects.bulk_create(objects_to_create, ignore_conflicts=True)

  logger.info("ingest_ping: inserted %d endpoint records", len(objects_to_create))
  return IngestResponse(ok=True, inserted=len(objects_to_create))
