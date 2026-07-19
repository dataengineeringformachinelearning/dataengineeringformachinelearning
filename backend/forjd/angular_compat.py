"""Map FORJD native JSON → Angular-stable DEML response shapes.

Keeps deml.app dashboards and status pages working without frontend changes
while the BFF proxies tenant-scoped FORJD routes.
"""

from __future__ import annotations

from typing import Any


def _timestamp(value: Any) -> str:
  return value.isoformat() if hasattr(value, "isoformat") else str(value or "")


def _label(value: Any, default: str) -> str:
  return str(value or default).replace("_", " ").replace("-", " ").title()


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
def deml_status_page(page: dict[str, Any], *, deml_user_id: int | None) -> dict[str, Any]:
  created = page.get("created_at")
  return {
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


def deml_status_pages(
  forjd_body: dict[str, Any],
  *,
  deml_user_id: int | None,
) -> list[dict[str, Any]]:
  pages = forjd_body.get("pages")
  if not isinstance(pages, list):
    return []
  return [
    deml_status_page(page, deml_user_id=deml_user_id) for page in pages if isinstance(page, dict)
  ]


def deml_status_services(forjd_body: dict[str, Any]) -> list[dict[str, Any]]:
  rows = forjd_body.get("services")
  if not isinstance(rows, list):
    return []
  out: list[dict[str, Any]] = []
  for row in rows:
    if not isinstance(row, dict):
      continue
    updated = row.get("updated_at")
    out.append(
      {
        "id": str(row.get("id") or ""),
        "name": str(row.get("name") or ""),
        "url": str(row.get("description") or ""),
        "status_page_id": str(row.get("page_id") or ""),
        "created_at": updated.isoformat() if hasattr(updated, "isoformat") else str(updated or ""),
        "status": str(row.get("status") or "operational"),
        "sla": None,
      }
    )
  return out


def deml_status_service(forjd_body: dict[str, Any]) -> dict[str, Any]:
  svc = forjd_body.get("service") if isinstance(forjd_body.get("service"), dict) else forjd_body
  rows = deml_status_services({"services": [svc] if isinstance(svc, dict) else []})
  return (
    rows[0]
    if rows
    else {
      "id": "",
      "name": "",
      "url": "",
      "status_page_id": "",
      "created_at": "",
      "status": "operational",
    }
  )


def deml_status_incidents(forjd_body: dict[str, Any]) -> list[dict[str, Any]]:
  rows = forjd_body.get("incidents")
  if not isinstance(rows, list):
    return []
  out: list[dict[str, Any]] = []
  for row in rows:
    if not isinstance(row, dict):
      continue
    started = row.get("started_at")
    started_s = started.isoformat() if hasattr(started, "isoformat") else str(started or "")
    out.append(
      {
        "id": str(row.get("id") or ""),
        "title": str(row.get("title") or ""),
        "message": str(row.get("body") or ""),
        "status": str(row.get("status") or "investigating"),
        "status_page_id": str(row.get("page_id") or ""),
        "created_at": started_s,
        "updated_at": started_s,
      }
    )
  return out


def deml_status_incident(forjd_body: dict[str, Any]) -> dict[str, Any]:
  inc = forjd_body.get("incident") if isinstance(forjd_body.get("incident"), dict) else forjd_body
  rows = deml_status_incidents({"incidents": [inc] if isinstance(inc, dict) else []})
  return (
    rows[0]
    if rows
    else {
      "id": "",
      "title": "",
      "message": "",
      "status": "investigating",
      "status_page_id": "",
      "created_at": "",
      "updated_at": "",
    }
  )


# --- Headless SOC cases (VulnerabilityService expects JSON arrays/objects) ---
def deml_incident_case(row: dict[str, Any]) -> dict[str, Any]:
  case = row.get("case") if isinstance(row.get("case"), dict) else row
  created = _timestamp(case.get("created_at"))
  return {
    "id": str(case.get("id") or ""),
    "title": str(case.get("title") or ""),
    "description": str(case.get("description") or ""),
    "status": _label(case.get("status"), "Open"),
    "severity": _label(case.get("severity"), "Medium"),
    "assigned_actor_id": case.get("assigned_actor_id"),
    "source_signal_id": case.get("source_signal_id"),
    "correlation_rule_ids": list(case.get("correlation_rule_ids") or []),
    "metadata": case.get("metadata") if isinstance(case.get("metadata"), dict) else {},
    "created_at": created,
    "updated_at": _timestamp(case.get("updated_at")) or created,
  }


def deml_incident_cases(forjd_body: dict[str, Any]) -> list[dict[str, Any]]:
  rows = forjd_body.get("cases", forjd_body.get("items"))
  if not isinstance(rows, list):
    return []
  return [deml_incident_case(row) for row in rows if isinstance(row, dict)]


# --- SOAR playbooks and execution runs ---
def deml_playbook(row: dict[str, Any]) -> dict[str, Any]:
  playbook = row.get("playbook") if isinstance(row.get("playbook"), dict) else row
  return {
    "id": str(playbook.get("id") or ""),
    "name": str(playbook.get("name") or ""),
    "description": str(playbook.get("description") or ""),
    "is_active": bool(playbook.get("is_active", True)),
    "trigger_conditions": playbook.get("trigger_conditions")
    if isinstance(playbook.get("trigger_conditions"), dict)
    else {},
    "actions": playbook.get("actions") if isinstance(playbook.get("actions"), list) else [],
    "created_at": _timestamp(playbook.get("created_at")),
    "updated_at": _timestamp(playbook.get("updated_at")),
  }


def deml_playbooks(forjd_body: dict[str, Any]) -> list[dict[str, Any]]:
  rows = forjd_body.get("playbooks", forjd_body.get("items"))
  if not isinstance(rows, list):
    return []
  return [deml_playbook(row) for row in rows if isinstance(row, dict)]


def deml_playbook_action_result(row: dict[str, Any]) -> dict[str, Any]:
  """Expose the durable SOAR result without leaking worker-only retry state."""
  status_code = row.get("status_code")
  action_type = str(row.get("action_type") or "")
  result = {
    "id": str(row.get("id") or ""),
    "action_plan_key": str(row.get("action_plan_key") or ""),
    "playbook_action_id": str(row["playbook_action_id"])
    if row.get("playbook_action_id") is not None
    else None,
    "action_type": action_type,
    "status": str(row.get("status") or "unknown"),
    "attempt": int(row.get("attempt") or 0),
    "max_attempts": int(row.get("max_attempts") or 0),
    "status_code": int(status_code) if status_code is not None else None,
    "error_code": str(row["error_code"]) if row.get("error_code") is not None else None,
    "external_reference": str(row["external_reference"])
    if row.get("external_reference") is not None
    else None,
    "metadata": row.get("metadata") if isinstance(row.get("metadata"), dict) else {},
    "next_attempt_at": _timestamp(row.get("next_attempt_at")) or None,
    "last_attempt_at": _timestamp(row.get("last_attempt_at")) or None,
    "created_at": _timestamp(row.get("created_at")),
    "updated_at": _timestamp(row.get("updated_at")),
    "completed_at": _timestamp(row.get("completed_at")) or None,
  }
  safe_configuration_keys = {
    "email_alert": {"template", "channel_ref"},
    "block_ip": {"provider_ref", "duration_seconds"},
    "revoke_api_key": {"credential_ref"},
  }.get(action_type)
  configuration = row.get("configuration")
  if safe_configuration_keys is not None and isinstance(configuration, dict):
    result["configuration"] = {
      key: value for key, value in configuration.items() if key in safe_configuration_keys
    }
  return result


def deml_playbook_runs(forjd_body: dict[str, Any]) -> list[dict[str, Any]]:
  rows = forjd_body.get("runs", forjd_body.get("playbook_runs", forjd_body.get("items")))
  if not isinstance(rows, list):
    return []
  out: list[dict[str, Any]] = []
  for row in rows:
    if not isinstance(row, dict):
      continue
    raw_actions = row.get("actions") if isinstance(row.get("actions"), list) else []
    actions = [
      deml_playbook_action_result(action) for action in raw_actions if isinstance(action, dict)
    ]
    out.append(
      {
        "id": str(row.get("id") or ""),
        "playbook_id": str(row.get("playbook_id") or ""),
        "case_id": str(row.get("case_id") or ""),
        "status": _label(row.get("status"), "Queued"),
        "actions_run": int(row.get("actions_run") or row.get("action_count") or len(actions)),
        "actions": actions,
        "started_at": _timestamp(row.get("started_at") or row.get("created_at")),
        "completed_at": _timestamp(row.get("completed_at")) or None,
      }
    )
  return out


def deml_playbook_execution(forjd_body: dict[str, Any]) -> dict[str, Any]:
  run = forjd_body.get("run") if isinstance(forjd_body.get("run"), dict) else forjd_body
  raw_status = str(run.get("status") or "accepted")
  actions = run.get("actions") if isinstance(run.get("actions"), list) else []
  return {
    "status": raw_status,
    "message": str(run.get("message") or "Playbook execution accepted"),
    "actions_run": int(run.get("actions_run") or run.get("action_count") or len(actions)),
    "run": run,
  }


def deml_siem_signals(forjd_body: dict[str, Any]) -> list[dict[str, Any]]:
  rows = forjd_body.get("signals", forjd_body.get("items"))
  if not isinstance(rows, list):
    return []
  return [dict(row) for row in rows if isinstance(row, dict)]


# --- Vulnerabilities (VulnerabilityService expects a JSON array) ---
def deml_vulnerability(row: dict[str, Any]) -> dict[str, Any]:
  vulnerability = row.get("vulnerability") if isinstance(row.get("vulnerability"), dict) else row
  created = _timestamp(vulnerability.get("created_at"))
  return {
    "id": str(vulnerability.get("id") or ""),
    "title": str(vulnerability.get("title") or ""),
    "description": str(vulnerability.get("description") or ""),
    "status": _label(vulnerability.get("status"), "Triage"),
    "severity": _label(vulnerability.get("severity"), "Medium"),
    "impact": int(vulnerability.get("impact") or 0),
    "likelihood": int(vulnerability.get("likelihood") or 0),
    "cve_id": vulnerability.get("cve_id") or "",
    "customer_id": str(vulnerability.get("tenant_id") or ""),
    "telemetry_context": vulnerability.get("telemetry_context")
    if isinstance(vulnerability.get("telemetry_context"), dict)
    else {},
    "created_at": created,
    "updated_at": _timestamp(vulnerability.get("updated_at")) or created,
  }


def deml_vulnerabilities(forjd_body: dict[str, Any]) -> list[dict[str, Any]]:
  rows = forjd_body.get("vulnerabilities")
  if not isinstance(rows, list):
    return []
  return [deml_vulnerability(row) for row in rows if isinstance(row, dict)]


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
        "byte_size": int(job.get("byte_size") or 0),
        "content_type": str(job.get("content_type") or "application/octet-stream"),
        "error": str(job.get("error") or ""),
        "attempts": int(job.get("attempts") or 0),
        "next_attempt_at": job.get("next_attempt_at"),
        "retrying": status in {"queued", "running", "retry_scheduled"},
        "created_at": created.isoformat() if hasattr(created, "isoformat") else str(created or ""),
        "completed_at": completed.isoformat()
        if hasattr(completed, "isoformat")
        else (str(completed) if completed else None),
        "expires_at": job.get("expires_at"),
        "download_ready": bool(job.get("download_ready"))
        or (status == "completed" and bool(job.get("object_key"))),
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
  """Return Angular-safe empty bodies so list pages do not hard-fail on GET.

  Dict envelopes set ``degraded=True`` so outage empties are distinguishable
  from real empty success. Bare ``[]`` list contracts stay unchanged.
  """
  if capability == "analytics":
    # /analytics/tenants expects an envelope whose ``data`` is a list; the
    # overview shape (data as object) makes the Angular tenant selector crash.
    if "tenants" in path:
      return {
        "status": "success",
        "data": [],
        "source": "forjd",
        "degraded": True,
      }
    overview = empty_analytics_overview()
    if isinstance(overview, dict):
      return {**overview, "degraded": True}
    return overview
  if capability == "system-status":
    if "status_pages" in path:
      return []
    if "endpoints" in path or "services" in path or "incidents" in path:
      return []
    return {
      "status": "unknown",
      "detail": "forjd_capability_unavailable",
      "degraded": True,
    }
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
    "degraded": True,
  }
