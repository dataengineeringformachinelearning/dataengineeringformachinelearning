"""Pull linked analytics providers and seal rollups into FORJD.

Credentials stay on DEML (sealed). Only allowlisted routing tags + opaque
ciphertext leave for FORJD. Failures for one provider never abort the batch.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import requests
from asgiref.sync import async_to_sync
from django.utils import timezone
from forjd.client import ForjdError
from forjd.sealed_telemetry import client_for_credential, seal_and_ingest
from forjd.tenancy import ForjdTenantConfigurationError, resolve_forjd_tenant_credential

from monitor.integrations import open_integration_credentials
from monitor.models import AnalyticsIntegration

logger = logging.getLogger("monitor.analytics_sync")

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "deml-analytics-sync/1.0"})


@dataclass(frozen=True, slots=True)
class SyncResult:
  provider: str
  account_id: str
  ok: bool
  detail: str
  sealed: bool = False


def _refresh_google_token(creds: dict[str, Any]) -> dict[str, Any]:
  """Refresh OAuth access token when a refresh_token is present."""
  refresh = str(creds.get("refresh_token") or "").strip()
  if not refresh:
    return creds
  from django.conf import settings

  client_id = str(getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "") or "").strip()
  client_secret = str(getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "") or "").strip()
  if not client_id or not client_secret:
    return creds
  try:
    response = SESSION.post(
      "https://oauth2.googleapis.com/token",
      data={
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh,
        "grant_type": "refresh_token",
      },
      timeout=15,
    )
    data = response.json()
  except Exception:
    logger.exception("Google token refresh failed")
    return creds
  if not isinstance(data, dict) or "access_token" not in data:
    return creds
  updated = dict(creds)
  updated["access_token"] = data["access_token"]
  if data.get("expires_in") is not None:
    updated["expires_in"] = data["expires_in"]
  updated["refreshed_at"] = datetime.now(UTC).isoformat()
  return updated


def _fetch_google_metrics(creds: dict[str, Any]) -> dict[str, Any]:
  """GA4 Data API — sessions + screenPageViews for the last 24h (best-effort)."""
  access = str(creds.get("access_token") or "").strip()
  if not access:
    return {"ok": False, "detail": "missing_access_token"}
  property_id = str(
    creds.get("property_id") or creds.get("ga_property_id") or creds.get("project_id") or ""
  ).strip()
  # Resolve first GA4 property when none stored.
  if not property_id:
    try:
      listed = SESSION.get(
        "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
        headers={"Authorization": f"Bearer {access}"},
        timeout=15,
      )
      body = listed.json()
      for account in (body.get("accountSummaries") or []) if isinstance(body, dict) else []:
        for prop in account.get("propertySummaries") or []:
          name = str(prop.get("property") or "")
          if name.startswith("properties/"):
            property_id = name.split("/", 1)[1]
            break
        if property_id:
          break
    except Exception:
      logger.exception("GA4 property listing failed")
  if not property_id:
    return {"ok": False, "detail": "no_ga4_property", "sessions": 0, "pageviews": 0}

  url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
  payload = {
    "dateRanges": [{"startDate": "yesterday", "endDate": "today"}],
    "metrics": [{"name": "sessions"}, {"name": "screenPageViews"}],
  }
  try:
    response = SESSION.post(
      url,
      headers={"Authorization": f"Bearer {access}", "Content-Type": "application/json"},
      json=payload,
      timeout=20,
    )
    data = response.json()
  except Exception as exc:
    logger.exception("GA4 runReport failed")
    return {"ok": False, "detail": f"run_report_error:{exc}", "sessions": 0, "pageviews": 0}

  if response.status_code >= 400:
    return {
      "ok": False,
      "detail": str((data or {}).get("error", {}).get("message") or f"http_{response.status_code}"),
      "sessions": 0,
      "pageviews": 0,
      "property_id": property_id,
    }

  sessions = 0
  pageviews = 0
  rows = data.get("rows") if isinstance(data, dict) else None
  if isinstance(rows, list) and rows:
    values = rows[0].get("metricValues") or []
    if len(values) >= 1:
      try:
        sessions = int(float(values[0].get("value") or 0))
      except (TypeError, ValueError):
        sessions = 0
    if len(values) >= 2:
      try:
        pageviews = int(float(values[1].get("value") or 0))
      except (TypeError, ValueError):
        pageviews = 0
  return {
    "ok": True,
    "detail": "ok",
    "sessions": sessions,
    "pageviews": pageviews,
    "property_id": property_id,
  }


def _fetch_clarity_metrics(creds: dict[str, Any]) -> dict[str, Any]:
  """Microsoft Clarity — project connectivity probe + opaque volume signal."""
  project_id = str(creds.get("project_id") or "").strip()
  api_key = str(creds.get("api_key") or "").strip()
  if not project_id or not api_key:
    return {"ok": False, "detail": "missing_credentials", "sessions": 0}
  # Clarity public export is partner-gated; record a healthy link heartbeat.
  # When Data Export is available the same path can expand to real counts.
  try:
    response = SESSION.get(
      "https://www.clarity.ms/export-data/api/v1/project-live-insights",
      headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
      params={"numOfDays": "1", "projectId": project_id},
      timeout=15,
    )
  except Exception as exc:
    return {"ok": False, "detail": f"request_error:{exc}", "sessions": 0, "project_id": project_id}

  sessions = 0
  if response.status_code < 400:
    try:
      body = response.json()
      if isinstance(body, list) and body:
        # Live insights returns metric rows; sum numeric-looking fields softly.
        for row in body[:20]:
          if not isinstance(row, dict):
            continue
          for key in ("SessionsCount", "sessions", "TotalSessionCount", "metricValue"):
            if row.get(key) is not None:
              try:
                sessions += int(float(row[key]))
              except (TypeError, ValueError):
                pass
      elif isinstance(body, dict):
        for key in ("sessions", "SessionsCount", "totalSessions"):
          if body.get(key) is not None:
            try:
              sessions = int(float(body[key]))
            except (TypeError, ValueError):
              pass
    except Exception:
      sessions = 0
    return {
      "ok": True,
      "detail": "ok",
      "sessions": sessions,
      "project_id": project_id,
    }
  # 401/403 still prove the project id is stored; mark linked but no metrics.
  if response.status_code in {401, 403, 404}:
    return {
      "ok": True,
      "detail": f"linked_http_{response.status_code}",
      "sessions": 0,
      "project_id": project_id,
    }
  return {
    "ok": False,
    "detail": f"http_{response.status_code}",
    "sessions": 0,
    "project_id": project_id,
  }


def _fetch_cloudflare_metrics(creds: dict[str, Any]) -> dict[str, Any]:
  """Cloudflare GraphQL — requests + pageViews for a zone (project_id = zone id)."""
  zone_id = str(creds.get("project_id") or creds.get("zone_id") or "").strip()
  api_key = str(creds.get("api_key") or "").strip()
  if not zone_id or not api_key:
    return {"ok": False, "detail": "missing_credentials", "requests": 0, "pageviews": 0}

  query = """
  query ZoneHttp($zoneTag: string!) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        httpRequests1dGroups(limit: 1, orderBy: [date_DESC]) {
          sum { requests pageViews }
        }
      }
    }
  }
  """
  try:
    response = SESSION.post(
      "https://api.cloudflare.com/client/v4/graphql",
      headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
      },
      json={"query": query, "variables": {"zoneTag": zone_id}},
      timeout=20,
    )
    data = response.json()
  except Exception as exc:
    return {
      "ok": False,
      "detail": f"request_error:{exc}",
      "requests": 0,
      "pageviews": 0,
      "zone_id": zone_id,
    }

  if response.status_code >= 400:
    return {
      "ok": False,
      "detail": f"http_{response.status_code}",
      "requests": 0,
      "pageviews": 0,
      "zone_id": zone_id,
    }
  try:
    zones = (((data or {}).get("data") or {}).get("viewer") or {}).get("zones") or []
    groups = (zones[0].get("httpRequests1dGroups") or []) if zones else []
    summary = (groups[0].get("sum") or {}) if groups else {}
    requests_count = int(summary.get("requests") or 0)
    pageviews = int(summary.get("pageViews") or 0)
  except (TypeError, ValueError, IndexError, AttributeError):
    requests_count = 0
    pageviews = 0
  return {
    "ok": True,
    "detail": "ok",
    "requests": requests_count,
    "pageviews": pageviews,
    "zone_id": zone_id,
  }


def _region_for_provider(provider: str) -> str:
  return {
    AnalyticsIntegration.Provider.GOOGLE: "ga4",
    AnalyticsIntegration.Provider.MICROSOFT: "clarity",
    AnalyticsIntegration.Provider.CLOUDFLARE: "cloudflare",
  }.get(provider, provider[:32])


async def _seal_provider_metrics(
  *,
  account_id: UUID,
  provider: str,
  metrics: dict[str, Any],
) -> bool:
  try:
    credential = resolve_forjd_tenant_credential(account_id)
  except ForjdTenantConfigurationError as exc:
    logger.warning("analytics sync skip account=%s: %s", account_id, exc)
    return False
  client = client_for_credential(credential)
  region = _region_for_provider(provider)
  sessions = int(metrics.get("sessions") or metrics.get("requests") or 0)
  pageviews = int(metrics.get("pageviews") or 0)
  plaintext = (
    f'{{"kind":"deml.provider_rollup","provider":"{provider}",'
    f'"sessions":{sessions},"pageviews":{pageviews},"ts":{time.time()}}}'
  ).encode()
  try:
    await seal_and_ingest(
      client,
      plaintext=plaintext,
      session_id=f"deml-provider-{provider}"[:128],
      metadata={
        "source": f"deml-{provider}",
        "product": "deml",
        "channel": "analytics-integration",
        "region": region,
        "component": f"integrations.{provider}",
        "label": "2xx" if metrics.get("ok") else "5xx",
        "env": "production",
      },
    )
    return True
  except ForjdError as exc:
    logger.warning("analytics seal failed provider=%s status=%s", provider, exc.status)
    return False


def sync_integration(integration: AnalyticsIntegration) -> SyncResult:
  """Sync one integration row; updates last_sync on soft success."""
  account_id = integration.account_id
  provider = integration.provider
  try:
    creds = open_integration_credentials(integration)
  except Exception as exc:
    logger.exception("open credentials failed id=%s", integration.id)
    return SyncResult(provider, str(account_id), False, f"open_failed:{exc}")

  if provider == AnalyticsIntegration.Provider.GOOGLE:
    creds = _refresh_google_token(creds)
    metrics = _fetch_google_metrics(creds)
  elif provider == AnalyticsIntegration.Provider.MICROSOFT:
    metrics = _fetch_clarity_metrics(creds)
  elif provider == AnalyticsIntegration.Provider.CLOUDFLARE:
    metrics = _fetch_cloudflare_metrics(creds)
  else:
    return SyncResult(provider, str(account_id), False, "unknown_provider")

  sealed = False
  if (
    metrics.get("ok") or metrics.get("sessions") is not None or metrics.get("requests") is not None
  ):
    sealed = async_to_sync(_seal_provider_metrics)(
      account_id=account_id,
      provider=provider,
      metrics=metrics,
    )
  if metrics.get("ok") or sealed:
    AnalyticsIntegration.objects.filter(pk=integration.pk).update(last_sync=timezone.now())
  return SyncResult(
    provider=provider,
    account_id=str(account_id),
    ok=bool(metrics.get("ok")),
    detail=str(metrics.get("detail") or "ok"),
    sealed=sealed,
  )


def sync_all_active(*, limit: int = 100) -> list[SyncResult]:
  rows = list(
    AnalyticsIntegration.objects.filter(active=True).order_by("last_sync", "created_at")[:limit]
  )
  return [sync_integration(row) for row in rows]
