"""Map FORJD native JSON → Angular-stable DEML response shapes.

Keeps deml.app dashboards and status pages working without frontend changes
while the BFF proxies tenant-scoped FORJD routes.
"""

from __future__ import annotations

import re
from typing import Any, Final

_SLUG_RE: Final[re.Pattern[str]] = re.compile(r"^[a-z0-9][a-z0-9-]{1,62}$")


def _timestamp(value: Any) -> str:
  return value.isoformat() if hasattr(value, "isoformat") else str(value or "")


# --- Public status slug aliases (legacy embeds / domain-style URLs) ---
def slugify_status_identifier(value: str) -> str:
  """Normalize free-form identifiers to FORJD slug charset."""
  return re.sub(r"[^a-z0-9]+", "-", (value or "").strip().lower()).strip("-")


def public_status_slug_candidates(raw: str) -> list[str]:
  """Exact, slugified, and domain-stem candidates for published-page lookup."""
  text = (raw or "").strip().lower()
  out: list[str] = []

  def _add(candidate: str) -> None:
    if candidate and candidate not in out and _SLUG_RE.match(candidate):
      out.append(candidate)

  _add(text)
  slugified = slugify_status_identifier(text)
  _add(slugified)
  if "." in text:
    _add(slugify_status_identifier(text.split(".", 1)[0]))
  return out


def match_published_status_page(
  pages: list[dict[str, Any]],
  *,
  identifier: str,
) -> dict[str, Any] | None:
  """Resolve a legacy embed id against the public published directory.

  Prefers exact id/slug, then slugified equality, then a unique prefix match
  (``joealongi`` → ``joealongi-dev``) when only one published page fits.
  """
  wanted = (identifier or "").strip()
  if not wanted:
    return None
  wanted_slug = slugify_status_identifier(wanted)
  for page in pages:
    if not isinstance(page, dict):
      continue
    if str(page.get("id") or "") == wanted or str(page.get("slug") or "") == wanted:
      return page
  for page in pages:
    if not isinstance(page, dict):
      continue
    if slugify_status_identifier(str(page.get("slug") or "")) == wanted_slug:
      return page
  if len(wanted_slug) < 3:
    return None
  prefix_hits = [
    page
    for page in pages
    if isinstance(page, dict)
    and (
      str(page.get("slug") or "") == wanted_slug
      or str(page.get("slug") or "").startswith(f"{wanted_slug}-")
    )
  ]
  if len(prefix_hits) == 1:
    return prefix_hits[0]
  return None


def _label(value: Any, default: str) -> str:
  return str(value or default).replace("_", " ").replace("-", " ").title()


# --- Status labels (FORJD lowercase enums → legacy Angular Title Case) ---
# Angular pages, the sidebar, and the embed widget compare against the legacy
# DEML labels ("Resolved", "Outage", "Degraded"), so map FORJD's enums here.
_SERVICE_STATUS_LABELS: Final[dict[str, str]] = {
  "operational": "Operational",
  "degraded": "Degraded",
  "partial_outage": "Degraded",
  "major_outage": "Outage",
  "outage": "Outage",
  "down": "Outage",
  "maintenance": "Maintenance",
}


def _service_status_label(value: Any) -> str:
  key = str(value or "operational").strip().lower().replace(" ", "_").replace("-", "_")
  return _SERVICE_STATUS_LABELS.get(key, _label(value, "Operational"))


def _incident_status_label(value: Any) -> str:
  return _label(value, "Investigating")


def _as_list(value: Any) -> list[Any]:
  return value if isinstance(value, list) else []


def _optional_number(value: Any) -> float | None:
  if value is None or value == "" or isinstance(value, bool):
    return None
  try:
    return float(value)
  except (TypeError, ValueError):
    return None


def _optional_int(value: Any) -> int | None:
  if value is None or value == "" or isinstance(value, bool):
    return None
  if isinstance(value, float) and not value.is_integer():
    return None
  try:
    parsed = int(value)
  except (TypeError, ValueError):
    return None
  return parsed if parsed >= 0 else None


def _optional_text(value: Any) -> str | None:
  if value is None:
    return None
  if hasattr(value, "isoformat"):
    value = value.isoformat()
  if not isinstance(value, str):
    return None
  text = value.strip()
  return text or None


def _series_points(rows: list[Any], *, value_key: str, out_key: str) -> list[dict[str, Any]]:
  points: list[dict[str, Any]] = []
  for row in rows:
    if not isinstance(row, dict):
      continue
    label = str(row.get("label") or row.get("time") or "")
    points.append(
      {
        "label": label,
        "time": label,
        out_key: row.get(value_key) if row.get(value_key) is not None else 0,
      }
    )
  return points


# --- Analytics overview (dashboard / analytics / vulnerabilities pages) ---
def deml_analytics_overview(forjd_body: dict[str, Any]) -> dict[str, Any]:
  """Shape FORJD ``/api/v1/analytics/overview`` into the Angular CES envelope."""
  ces_raw = forjd_body.get("ces") if isinstance(forjd_body.get("ces"), dict) else {}
  raw_time_series = _as_list(forjd_body.get("time_series"))
  time_series = _series_points(raw_time_series, value_key="latency", out_key="latency")
  # Angular Request Frequency chart still reads ``request_frequency``; FORJD
  # only emits requests on ``time_series`` — mirror them for the product UI.
  request_frequency = _series_points(raw_time_series, value_key="requests", out_key="requests")
  for idx, row in enumerate(raw_time_series):
    if isinstance(row, dict) and idx < len(time_series):
      time_series[idx]["requests"] = int(row.get("requests") or 0)

  uptime_series = _series_points(
    _as_list(forjd_body.get("uptime_series")), value_key="uptime", out_key="uptime"
  )
  security_alerts = _series_points(
    _as_list(forjd_body.get("threat_series")), value_key="count", out_key="count"
  )

  threat_severity: list[dict[str, Any]] = []
  for row in _as_list(forjd_body.get("threat_severity")):
    if not isinstance(row, dict):
      continue
    threat_severity.append(
      {
        "severity": str(row.get("severity") or "Detected"),
        "count": int(row.get("count") or 0),
      }
    )

  forecast = ces_raw.get("spiking_temporal_forecast")
  if forecast is None:
    forecast = forjd_body.get("spiking_temporal_forecast")
  temporal_status = ces_raw.get("temporal_status")
  if temporal_status is None:
    temporal_status = forjd_body.get("temporal_status")
  temporal_backend = ces_raw.get("temporal_backend")
  if temporal_backend is None:
    temporal_backend = forjd_body.get("temporal_backend")
  temporal_sample_count = ces_raw.get("temporal_sample_count")
  if temporal_sample_count is None:
    temporal_sample_count = forjd_body.get("temporal_sample_count")
  temporal_scored_at = ces_raw.get("temporal_scored_at")
  if temporal_scored_at is None:
    temporal_scored_at = forjd_body.get("temporal_scored_at")
  uses_norse = ces_raw.get("uses_norse")
  if uses_norse is None:
    uses_norse = forjd_body.get("uses_norse")

  deml_metrics = forjd_body.get("deml_control_plane")
  deml_metrics = deml_metrics if isinstance(deml_metrics, dict) else {}
  honeypot_score = forjd_body.get("honeypot_score")
  if honeypot_score is None:
    honeypot_score = deml_metrics.get("honeypot_score", 0)

  forjd_benchmarking = forjd_body.get("benchmarking")
  if not isinstance(forjd_benchmarking, dict):
    forjd_benchmarking = deml_metrics.get("benchmarking")
  if not isinstance(forjd_benchmarking, dict):
    forjd_benchmarking = {"current_scope": None, "platform_reference": None}
  latest_benchmark = ces_raw.get("latest_benchmark")
  if not isinstance(latest_benchmark, dict):
    latest_benchmark = forjd_benchmarking.get("current_scope")
  latest_benchmark_score = ces_raw.get("latest_benchmark_score")
  if latest_benchmark_score is None and isinstance(latest_benchmark, dict):
    latest_benchmark_score = latest_benchmark.get("score_percent")

  return {
    "status": "success",
    "data": {
      "benchmarking": forjd_benchmarking,
      "honeypot_score": float(honeypot_score or 0),
      "ces": {
        "level": float(ces_raw.get("ces_level") or 0),
        "threat": float(ces_raw.get("ces_threat") or 0),
        "sla": float(ces_raw.get("ces_sla") or 0),
        "stability": float(ces_raw.get("ces_stability") or 0),
        "spiking_temporal_forecast": _optional_number(forecast),
        "temporal_status": _optional_text(temporal_status),
        "temporal_backend": _optional_text(temporal_backend),
        "temporal_sample_count": _optional_int(temporal_sample_count),
        "temporal_scored_at": _optional_text(temporal_scored_at),
        "uses_norse": (uses_norse if isinstance(uses_norse, bool) else None),
        "latest_benchmark_score": latest_benchmark_score,
        "latest_benchmark": latest_benchmark,
      },
      "user_metrics": {
        "p99_latency_ms": float(forjd_body.get("p99_latency_ms") or 0),
        "uptime_percent": (
          None if forjd_body.get("uptime_pct") is None else float(forjd_body.get("uptime_pct") or 0)
        ),
        "total_requests_24h": int(forjd_body.get("total_requests") or 0),
        "active_incidents": int(forjd_body.get("active_incidents") or 0),
        "threats_detected_24h": int(forjd_body.get("threats_detected") or 0),
        "unique_visitors": int(forjd_body.get("unique_visitors") or 0),
        "data_available": forjd_body.get("data_available") is not False,
        "available_sites": [
          str(site)
          for site in _as_list(forjd_body.get("available_sites"))
          if site is not None and str(site).strip()
        ],
        "time_series": time_series,
        "request_frequency": request_frequency,
        "uptime_series": uptime_series,
        "threat_severity": threat_severity,
        "security_alerts": security_alerts,
        # Routing-tag charts from FORJD rollup metadata (region/label/component).
        "origin_distribution": [
          row for row in _as_list(forjd_body.get("origin_distribution")) if isinstance(row, dict)
        ],
        "http_statuses": [
          row for row in _as_list(forjd_body.get("http_statuses")) if isinstance(row, dict)
        ],
        "endpoint_counts": [
          row for row in _as_list(forjd_body.get("endpoint_counts")) if isinstance(row, dict)
        ],
        # DEML control-plane metrics (never from FORJD sealed plane).
        "widget_interactions": int(deml_metrics.get("widget_interactions") or 0),
        "cookie_consents": deml_metrics.get("cookie_consents")
        if isinstance(deml_metrics.get("cookie_consents"), dict)
        else {"analytical": 0, "marketing": 0},
        "active_providers": [
          str(p)
          for p in _as_list(deml_metrics.get("active_providers"))
          if p is not None and str(p).strip()
        ],
        "api_usage": deml_metrics.get("api_usage")
        if isinstance(deml_metrics.get("api_usage"), dict)
        else {"usage_current_minute": 0, "quota_per_minute": 60},
      },
    },
    "source": "forjd",
    "degraded": False,
  }


def deml_discovered_endpoints(forjd_body: dict[str, Any]) -> list[dict[str, Any]]:
  """Shape FORJD discovered-endpoints / assets into Angular EndpointData[]."""
  rows = forjd_body.get("endpoints")
  if not isinstance(rows, list):
    rows = forjd_body.get("assets")
  if not isinstance(rows, list):
    rows = forjd_body.get("items")
  if not isinstance(rows, list):
    return []
  out: list[dict[str, Any]] = []
  for row in rows:
    if not isinstance(row, dict):
      continue
    url = str(row.get("url") or row.get("endpoint") or row.get("name") or "")
    created = row.get("created_at") or row.get("last_seen_at") or row.get("updated_at") or ""
    out.append(
      {
        "id": str(row.get("id") or ""),
        "url": url,
        "last_tested": created.isoformat() if hasattr(created, "isoformat") else str(created or ""),
        "status_code": int(row.get("status_code") or row.get("http_status") or 0),
        "response_time": str(row.get("response_time") or row.get("latency_ms") or ""),
        "ip_address": str(row.get("ip_address") or row.get("ip") or ""),
        "is_active": bool(row.get("is_active", True)),
      }
    )
  return out


def empty_analytics_overview() -> dict[str, Any]:
  body = deml_analytics_overview(
    {
      "total_requests": 0,
      "active_incidents": 0,
      "threats_detected": 0,
      "unique_visitors": 0,
      "p99_latency_ms": 0,
      "uptime_pct": None,
      "data_available": False,
      "ces": {
        "ces_level": 0,
        "ces_threat": 0,
        "ces_sla": 0,
        "ces_stability": 0,
        "spiking_temporal_forecast": None,
        "temporal_status": "unavailable",
        "temporal_backend": None,
        "temporal_sample_count": None,
        "temporal_scored_at": None,
      },
      "time_series": [],
      "uptime_series": [],
      "threat_series": [],
      "threat_severity": [],
    }
  )
  body["degraded"] = True
  body["source"] = "deml_forjd_fallback"
  body["code"] = "forjd_read_fallback"
  return body


# --- Status pages list (MonitorService expects a JSON array) ---
def _uptime_history_points(value: Any) -> list[dict[str, Any]]:
  if not isinstance(value, list):
    return []
  out: list[dict[str, Any]] = []
  for row in value:
    if not isinstance(row, dict):
      continue
    date = str(row.get("date") or "").strip()
    status = str(row.get("status") or "no_data").strip() or "no_data"
    if not date:
      continue
    uptime = _optional_number(row.get("uptime"))
    out.append({"date": date, "status": status, "uptime": uptime})
  return out


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
    "overall_uptime": _optional_number(page.get("overall_uptime")),
    "cumulative_sla": _optional_number(page.get("cumulative_sla")),
    "uptime_history": _uptime_history_points(page.get("uptime_history")),
    "p99_latency": _optional_number(page.get("p99_latency")),
    "total_requests": (
      int(page["total_requests"]) if isinstance(page.get("total_requests"), int | float) else None
    ),
    "threats_detected_24h": (
      int(page["threats_detected_24h"])
      if isinstance(page.get("threats_detected_24h"), int | float)
      else None
    ),
    # Public intelligence (ciphertext-free) — explore/status seed ML gauges without auth.
    "spiking_temporal_forecast": _optional_number(page.get("spiking_temporal_forecast")),
    "temporal_status": _optional_text(page.get("temporal_status")),
    "temporal_backend": _optional_text(page.get("temporal_backend")),
    "temporal_sample_count": _optional_int(page.get("temporal_sample_count")),
    "temporal_scored_at": _optional_text(page.get("temporal_scored_at")),
    "threat_anomaly_score": _optional_number(page.get("threat_anomaly_score")),
    "threat_suspicious_ratio": _optional_number(page.get("threat_suspicious_ratio")),
    "uses_norse": (bool(page["uses_norse"]) if isinstance(page.get("uses_norse"), bool) else None),
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
        "url": str(row.get("description") or row.get("url") or ""),
        "status_page_id": str(row.get("page_id") or row.get("status_page_id") or ""),
        "created_at": updated.isoformat() if hasattr(updated, "isoformat") else str(updated or ""),
        "status": _service_status_label(row.get("status")),
        "sla": _optional_number(row.get("sla")),
        "uptime_history": _uptime_history_points(row.get("uptime_history")),
        "p99_latency": _optional_number(row.get("p99_latency")),
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
      "status": "Operational",
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
        "status": _incident_status_label(row.get("status")),
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
      "status": "Investigating",
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


# --- ML latest SLA stat (MlService.fetchLatestStat expects TrainingResponse) ---
def deml_sla_latest(overview_body: dict[str, Any]) -> dict[str, Any]:
  """Expose only an explicit SLA prediction, never current availability."""
  ces = overview_body.get("ces") if isinstance(overview_body.get("ces"), dict) else {}
  sla = ces.get("predicted_sla")
  if sla is None:
    sla = overview_body.get("predicted_sla")
  if sla is None:
    sla = overview_body.get("average_sla")
  return {
    "status": "success",
    "average_sla": _optional_number(sla),
    "created_at": None,
  }


# --- ML temporal forecast (status/explore gauge polls a single number) ---
def deml_temporal_forecast(overview_body: dict[str, Any]) -> dict[str, Any]:
  """Shape FORJD analytics overview into the Angular ``TemporalForecastResponse``."""
  ces = overview_body.get("ces") if isinstance(overview_body.get("ces"), dict) else {}
  forecast = ces.get("spiking_temporal_forecast")
  if forecast is None:
    forecast = overview_body.get("spiking_temporal_forecast")
  uses_norse = ces.get("uses_norse")
  if uses_norse is None:
    uses_norse = overview_body.get("uses_norse")
  temporal_status = ces.get("temporal_status")
  if temporal_status is None:
    temporal_status = overview_body.get("temporal_status")
  temporal_backend = ces.get("temporal_backend")
  if temporal_backend is None:
    temporal_backend = overview_body.get("temporal_backend")
  temporal_sample_count = ces.get("temporal_sample_count")
  if temporal_sample_count is None:
    temporal_sample_count = overview_body.get("temporal_sample_count")
  temporal_scored_at = ces.get("temporal_scored_at")
  if temporal_scored_at is None:
    temporal_scored_at = overview_body.get("temporal_scored_at")
  return {
    "status": "success",
    "spiking_temporal_forecast": _optional_number(forecast),
    "temporal_status": _optional_text(temporal_status),
    "temporal_backend": _optional_text(temporal_backend),
    "temporal_sample_count": _optional_int(temporal_sample_count),
    "temporal_scored_at": _optional_text(temporal_scored_at),
    "uses_norse": uses_norse if isinstance(uses_norse, bool) else None,
    "created_at": _optional_text(temporal_scored_at),
  }


# --- Threat report (status/explore pages poll anomaly stats from ML scores) ---
def deml_threat_report(scores_body: dict[str, Any]) -> dict[str, Any]:
  """Shape FORJD ``/api/v1/ml/scores`` into the Angular ``ThreatReportResponse``."""
  scores = scores_body.get("scores")
  rows = [row for row in scores if isinstance(row, dict)] if isinstance(scores, list) else []
  if not rows:
    return {
      "status": "success",
      "anomaly_score": None,
      "top_location": None,
      "location_weight": None,
      "suspicious_ratio": None,
      "created_at": None,
      "message": "No threat intelligence reports available",
    }
  numeric = [score for row in rows if (score := _optional_number(row.get("score"))) is not None]
  anomalies = sum(1 for row in rows if row.get("is_anomaly"))
  newest = rows[0].get("created_at")
  return {
    "status": "success",
    "anomaly_score": max(numeric) if numeric else None,
    "top_location": None,
    "location_weight": None,
    "suspicious_ratio": anomalies / len(rows),
    "created_at": str(newest) if newest else None,
  }


# --- ML latest (legacy array shape; kept for catalog fallbacks) ---
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
