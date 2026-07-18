"""Map FORJD native JSON → Angular-stable DEML response shapes.

Keeps deml.app dashboards and status pages working without frontend changes
while the BFF proxies tenant-scoped FORJD routes.
"""

from __future__ import annotations

from typing import Any


# --- Analytics overview (dashboard / analytics / vulnerabilities pages) ---
def deml_analytics_overview(forjd_body: dict[str, Any]) -> dict[str, Any]:
  """Shape FORJD ``/api/v1/analytics/overview`` into the Angular CES envelope."""
  ces_raw = forjd_body.get("ces") if isinstance(forjd_body.get("ces"), dict) else {}
  return {
    "status": "success",
    "data": {
      "benchmarking": {"current_scope": None},
      "ces": {
        "level": float(ces_raw.get("ces_level") or 0),
        "threat": float(ces_raw.get("ces_threat") or 0),
        "sla": float(ces_raw.get("ces_sla") or 0),
        "stability": float(ces_raw.get("ces_stability") or 0),
        "spiking_temporal_forecast": 0,
      },
      "user_metrics": {
        "p99_latency_ms": float(forjd_body.get("p99_latency_ms") or 0),
        "uptime_percent": float(forjd_body.get("uptime_pct") or 0),
        "total_requests_24h": int(forjd_body.get("total_requests") or 0),
        "active_incidents": int(forjd_body.get("active_incidents") or 0),
        "unique_visitors": 0,
        "available_sites": [],
        "time_series": [],
        "uptime_series": [],
        "threat_severity": [],
        "security_alerts": [],
      },
    },
    "source": "forjd",
  }


def empty_analytics_overview() -> dict[str, Any]:
  return deml_analytics_overview(
    {
      "total_requests": 0,
      "active_incidents": 0,
      "p99_latency_ms": 0,
      "uptime_pct": 100.0,
      "ces": {
        "ces_level": 0,
        "ces_threat": 0,
        "ces_sla": 0,
        "ces_stability": 0,
      },
    }
  )


# --- Status pages list (MonitorService expects a JSON array) ---
def deml_status_pages(
  forjd_body: dict[str, Any],
  *,
  deml_user_id: int | None,
) -> list[dict[str, Any]]:
  pages = forjd_body.get("pages")
  if not isinstance(pages, list):
    return []
  out: list[dict[str, Any]] = []
  for page in pages:
    if not isinstance(page, dict):
      continue
    created = page.get("created_at")
    out.append(
      {
        "id": str(page.get("id") or ""),
        "title": str(page.get("title") or ""),
        "slug": str(page.get("slug") or ""),
        "description": str(page.get("description") or ""),
        "is_published": bool(page.get("is_published")),
        "created_at": created.isoformat() if hasattr(created, "isoformat") else str(created or ""),
        "user_id": deml_user_id,
        "overall_uptime": None,
        "cumulative_sla": None,
        "uptime_history": [],
        "p99_latency": None,
        "total_requests": None,
        "threats_detected_24h": None,
      }
    )
  return out


# --- Vulnerabilities (VulnerabilityService expects a JSON array) ---
def deml_vulnerabilities(forjd_body: dict[str, Any]) -> list[dict[str, Any]]:
  rows = forjd_body.get("vulnerabilities")
  if not isinstance(rows, list):
    return []
  out: list[dict[str, Any]] = []
  for row in rows:
    if not isinstance(row, dict):
      continue
    severity = str(row.get("severity") or "medium")
    created = row.get("created_at")
    created_s = created.isoformat() if hasattr(created, "isoformat") else str(created or "")
    out.append(
      {
        "id": str(row.get("id") or ""),
        "title": str(row.get("title") or ""),
        "description": str(row.get("description") or ""),
        "status": str(row.get("status") or "triage"),
        "severity": severity,
        "impact": 0,
        "likelihood": 0,
        "cve_id": row.get("cve_id") or "",
        "customer_id": str(row.get("tenant_id") or ""),
        "telemetry_context": {},
        "created_at": created_s,
        "updated_at": created_s,
      }
    )
  return out


# --- Exports (analytics ExportJobRow[]) ---
def deml_export_jobs(forjd_body: dict[str, Any]) -> list[dict[str, Any]]:
  jobs = forjd_body.get("jobs")
  if not isinstance(jobs, list):
    return []
  out: list[dict[str, Any]] = []
  for job in jobs:
    if not isinstance(job, dict):
      continue
    status = str(job.get("status") or "queued")
    created = job.get("created_at")
    completed = job.get("completed_at")
    out.append(
      {
        "id": str(job.get("id") or ""),
        "kind": str(job.get("source_kind") or "stream_results"),
        "format": str(job.get("format") or "csv"),
        "status": status,
        "byte_size": 0,
        "content_type": "application/octet-stream",
        "error": str(job.get("error") or ""),
        "attempts": 1,
        "next_attempt_at": None,
        "retrying": status in {"queued", "running"},
        "created_at": created.isoformat() if hasattr(created, "isoformat") else str(created or ""),
        "completed_at": completed.isoformat()
        if hasattr(completed, "isoformat")
        else (str(completed) if completed else None),
        "expires_at": None,
        "download_ready": status == "completed" and bool(job.get("object_key")),
      }
    )
  return out


def deml_export_job(forjd_body: dict[str, Any]) -> dict[str, Any]:
  """Single job create/detail — FORJD returns job fields at top level or under job."""
  job = forjd_body.get("job") if isinstance(forjd_body.get("job"), dict) else forjd_body
  rows = deml_export_jobs({"jobs": [job] if isinstance(job, dict) else []})
  return (
    rows[0]
    if rows
    else {
      "id": "",
      "kind": "stream_results",
      "format": "csv",
      "status": "failed",
      "byte_size": 0,
      "content_type": "application/octet-stream",
      "error": "invalid_export_response",
      "attempts": 0,
      "retrying": False,
      "created_at": "",
      "download_ready": False,
    }
  )


# --- ML latest (dashboard polls an array) ---
def deml_ml_latest(forjd_body: dict[str, Any]) -> list[dict[str, Any]]:
  scores = forjd_body.get("scores")
  if not isinstance(scores, list):
    models = forjd_body.get("models")
    if isinstance(models, list):
      return [
        {
          "id": str(m.get("id") or m.get("model_id") or ""),
          "name": str(m.get("name") or m.get("family") or "model"),
          "status": "ready",
        }
        for m in models
        if isinstance(m, dict)
      ]
    return []
  out: list[dict[str, Any]] = []
  for row in scores:
    if not isinstance(row, dict):
      continue
    out.append(
      {
        "id": str(row.get("id") or ""),
        "family": str(row.get("family") or ""),
        "score": row.get("score"),
        "is_anomaly": bool(row.get("is_anomaly")),
        "created_at": str(row.get("created_at") or ""),
      }
    )
  return out


# --- Empty-stable GET envelopes for capabilities still on 501 writes ---
def empty_capability_envelope(capability: str, path: str) -> Any:
  """Return Angular-safe empty bodies so list pages do not hard-fail on GET."""
  if capability == "analytics":
    return empty_analytics_overview()
  if capability == "system-status":
    if "status_pages" in path:
      return []
    if "endpoints" in path or "services" in path or "incidents" in path:
      return []
    return {"status": "unknown", "detail": "forjd_capability_unavailable"}
  if capability in {"ml", "exports", "telemetry", "integrations", "model"}:
    return []
  if capability == "vulnerabilities":
    return []
  return {
    "detail": (
      f"The {capability} capability is blocked until FORJD ships a supported "
      "service-principal contract"
    ),
    "code": "forjd_capability_unavailable",
  }
