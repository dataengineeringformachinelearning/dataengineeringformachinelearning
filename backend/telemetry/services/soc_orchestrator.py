"""Silent SOC orchestration: correlate → case → playbook → audit."""

from __future__ import annotations

import logging
from typing import Any

from django.contrib.auth import get_user_model
from monitor.models import (
  Incident,
  IncidentCase,
  Playbook,
  PlaybookAction,
  StatusPage,
  ThreatIntelligence,
)
from utils.rate_limit import block_ip

from telemetry.services.correlation_engine import (
  CorrelationMatch,
  evaluate_correlation_rules,
  evaluate_playbook_trigger,
)
from telemetry.services.playbook_runner import execute_playbook
from telemetry.services.security_events import write_security_event

logger = logging.getLogger(__name__)

User = get_user_model()

DEFAULT_PLAYBOOKS: list[dict[str, Any]] = [
  {
    "name": "Auto-contain malicious IP",
    "description": "Silently blocks IPs flagged by threat intel feeds.",
    "trigger_conditions": {"is_malicious": True},
    "actions": [{"action_type": "BlockIP", "order": 0, "configuration": {"ttl_seconds": 86400}}],
  },
  {
    "name": "High-confidence abuse alert",
    "description": "Emails operator when abuse score exceeds threshold.",
    "trigger_conditions": {"min_abuse_score": 75},
    "actions": [
      {
        "action_type": "EmailAlert",
        "order": 0,
        "configuration": {"subject": "[DEML] High abuse score detected"},
      }
    ],
  },
]


def ensure_default_playbooks(user: Any) -> None:
  """Seed low-profile default playbooks once per user (active by default)."""
  if not user or Playbook.objects.filter(user=user).exists():
    return
  for spec in DEFAULT_PLAYBOOKS:
    pb = Playbook.objects.create(
      user=user,
      name=spec["name"],
      description=spec.get("description", ""),
      is_active=True,
      trigger_conditions=spec.get("trigger_conditions", {}),
    )
    for action_spec in spec.get("actions", []):
      PlaybookAction.objects.create(
        playbook=pb,
        action_type=action_spec["action_type"],
        order=action_spec.get("order", 0),
        configuration=action_spec.get("configuration", {}),
      )


def _severity_rank(severity: str) -> int:
  order = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
  return order.get(severity, 1)


def _pick_severity(matches: list[CorrelationMatch]) -> str:
  if not matches:
    return "Medium"
  return max((m.severity for m in matches), key=_severity_rank)


def _maybe_link_status_incident(
  user: Any,
  case: IncidentCase,
  title: str,
  severity: str,
) -> None:
  """Bridge SOC case to public status page incident for Critical/High only."""
  if severity not in ("Critical", "High") or not user:
    return
  page = StatusPage.objects.filter(user=user, is_published=True).order_by("-updated_at").first()
  if not page:
    return
  incident = Incident.objects.create(
    user=user,
    status_page=page,
    title=title[:255],
    message=case.description or "Automated security correlation detected an active threat.",
    status="Investigating",
  )
  case.status_incident = incident
  case.save(update_fields=["status_incident"])


def _create_or_update_case(
  user: Any,
  matches: list[CorrelationMatch],
  context: dict[str, Any],
  threat_ids: list[Any] | None = None,
) -> IncidentCase | None:
  if not user or not matches:
    return None

  severity = _pick_severity(matches)
  primary = matches[0]
  open_case = (
    IncidentCase.objects.filter(
      user=user, status__in=["Open", "Investigating"], title=primary.title
    )
    .order_by("-created_at")
    .first()
  )
  if open_case:
    if _severity_rank(severity) > _severity_rank(open_case.severity):
      open_case.severity = severity
      open_case.save(update_fields=["severity", "updated_at"])
    return open_case

  description = "; ".join(m.description for m in matches)
  case = IncidentCase.objects.create(
    user=user,
    title=primary.title,
    description=description,
    status="Open",
    severity=severity,
  )
  if threat_ids:
    case.related_threats.set(threat_ids)
  _maybe_link_status_incident(user, case, primary.title, severity)
  return case


def _log_system_audit(action: str, resource_id: str, details: dict[str, Any]) -> None:
  from monitor.models import AuditLog

  try:
    AuditLog.objects.create(
      user=None,
      action=action,
      resource_id=resource_id,
      details=details,
    )
  except Exception as exc:
    logger.debug("Audit log write failed: %s", exc)


def process_security_signal(context: dict[str, Any]) -> dict[str, Any] | None:
  """
  Main entry: evaluate rules, write events, create cases, auto-run playbooks.
  Runs silently — intended for projector/worker hooks.
  """
  matches = evaluate_correlation_rules(context)
  if not matches and not context.get("force_process"):
    return None

  user = context.get("user")
  user_id = context.get("user_id")
  if not user and user_id:
    try:
      user = User.objects.get(id=user_id)
    except User.DoesNotExist:
      user = None

  if user:
    ensure_default_playbooks(user)

  account_id = context.get("account_id") or context.get("tenant_id")
  correlation_id = context.get("correlation_id") or str(
    context.get("ip") or context.get("ip_address") or ""
  )

  for match in matches:
    write_security_event(
      event_type=f"correlation.{match.rule_id}",
      source=context.get("source", "telemetry"),
      severity=match.severity,
      account_id=str(account_id) if account_id else None,
      user_id=user.id if user else None,
      correlation_id=correlation_id,
      raw={**context, "rule_id": match.rule_id, "title": match.title},
    )

  threat_ids = context.get("threat_ids") or []
  case = _create_or_update_case(user, matches, context, threat_ids=threat_ids) if matches else None

  if context.get("is_malicious") or context.get("malicious_ip_detected"):
    ip = context.get("ip_address") or context.get("ip")
    if ip:
      block_ip(str(ip))

  playbooks_run = 0
  if user:
    for playbook in Playbook.objects.filter(user=user, is_active=True):
      if evaluate_playbook_trigger(playbook, context):
        result = execute_playbook(playbook, context, triggered_by="auto")
        playbooks_run += 1
        write_security_event(
          event_type="playbook.executed",
          source="soar",
          severity="Info",
          account_id=str(account_id) if account_id else None,
          user_id=user.id,
          correlation_id=correlation_id,
          raw=result,
        )
        _log_system_audit(
          "playbook.auto_executed",
          str(playbook.id),
          {"playbook": playbook.name, "actions_run": result.get("actions_run", 0)},
        )

  if case:
    _log_system_audit(
      "incident_case.created",
      str(case.id),
      {"title": case.title, "severity": case.severity, "rules": [m.rule_id for m in matches]},
    )

  return {
    "matches": [m.rule_id for m in matches],
    "case_id": str(case.id) if case else None,
    "playbooks_run": playbooks_run,
  }


def process_threat_intel_batch(
  payloads: list[dict[str, Any]],
  created_threats: list[ThreatIntelligence] | None = None,
) -> None:
  """Hook after bulk threat intel insert."""
  for payload in payloads:
    ctx = {
      "source": payload.get("source", "threat_intel"),
      "ip": payload.get("ip"),
      "ip_address": payload.get("ip"),
      "is_malicious": payload.get("is_malicious", False),
      "abuse_score": payload.get("abuse_confidence_score", 0),
      "user_id": payload.get("user_id"),
      "account_id": payload.get("account_id") or payload.get("tenant_id"),
      "event_type": "threat_intel",
    }
    if payload.get("is_malicious") or int(ctx["abuse_score"]) > 50:
      process_security_signal(ctx)


def process_endpoint_batch(
  malicious_ips: set[str],
  account_contexts: list[dict[str, Any]],
) -> None:
  """Hook after endpoint telemetry with malicious IP flags."""
  for item in account_contexts:
    ip = item.get("ip_address")
    if ip not in malicious_ips and not item.get("telemetry_context", {}).get(
      "malicious_ip_detected"
    ):
      continue
    ctx = {
      **item,
      "ip": ip,
      "threat_match": True,
      "malicious_ip_detected": True,
      "event_type": "endpoint_telemetry",
    }
    process_security_signal(ctx)
