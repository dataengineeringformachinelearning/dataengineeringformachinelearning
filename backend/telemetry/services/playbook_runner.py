"""Execute SOAR playbook actions (Webhook, Email, BlockIP, RevokeAPIKey)."""

from __future__ import annotations

import logging
from typing import Any, Final

import requests
from config.email import send_resend_email
from django.contrib.auth import get_user_model
from monitor.models import APIKey, Playbook, PlaybookAction
from utils.rate_limit import block_ip

logger = logging.getLogger(__name__)

User = get_user_model()


def execute_playbook(
  playbook: Playbook,
  context: dict[str, Any] | None = None,
  *,
  triggered_by: str = "manual",
) -> dict[str, Any]:
  """Run all actions on a playbook in order. Returns summary dict."""
  context = context or {}
  actions = list(playbook.actions.order_by("order"))
  results: list[dict[str, Any]] = []

  for action in actions:
    try:
      outcome = _execute_action(action, playbook, context)
      results.append({"action_type": action.action_type, "status": "ok", "detail": outcome})
    except Exception as exc:
      logger.exception("Playbook action %s failed: %s", action.action_type, exc)
      results.append({"action_type": action.action_type, "status": "error", "detail": str(exc)})

  return {
    "playbook_id": str(playbook.id),
    "playbook_name": playbook.name,
    "triggered_by": triggered_by,
    "actions_run": len(results),
    "results": results,
  }


def _execute_action(
  action: PlaybookAction,
  playbook: Playbook,
  context: dict[str, Any],
) -> str:
  config = action.configuration or {}
  action_type = action.action_type

  if action_type == "Webhook":
    return _run_webhook(config, playbook, context)
  if action_type == "EmailAlert":
    return _run_email(config, playbook, context)
  if action_type == "BlockIP":
    return _run_block_ip(config, context)
  if action_type == "RevokeAPIKey":
    return _run_revoke_key(config, playbook, context)
  raise ValueError(f"Unknown action type: {action_type}")


def _run_webhook(
  config: dict[str, Any],
  playbook: Playbook,
  context: dict[str, Any],
) -> str:
  url: Final[str | None] = config.get("url")
  if not url:
    raise ValueError("Webhook URL not configured")

  payload = {
    "playbook": playbook.name,
    "playbook_id": str(playbook.id),
    "context": context,
  }
  headers = {"Content-Type": "application/json"}
  if config.get("secret"):
    headers["X-DEML-Signature"] = str(config["secret"])

  response = requests.post(url, json=payload, headers=headers, timeout=10)
  response.raise_for_status()
  return f"Webhook delivered ({response.status_code})"


def _run_email(
  config: dict[str, Any],
  playbook: Playbook,
  context: dict[str, Any],
) -> str:
  user = playbook.user
  to_email = config.get("to") or (user.email if user else None)
  if not to_email:
    raise ValueError("No email recipient configured")

  subject = config.get("subject") or f"[DEML] Security alert: {playbook.name}"
  ip = context.get("ip_address") or context.get("ip") or "unknown"
  severity = context.get("severity") or "Medium"
  html = (
    f"<p>Playbook <strong>{playbook.name}</strong> was triggered.</p>"
    f"<p>Severity: {severity}<br/>Source IP: {ip}</p>"
    f"<p>Review your dashboard for details.</p>"
  )
  if not send_resend_email(to_email, subject, html):
    raise RuntimeError("Email delivery failed")
  return f"Alert sent to {to_email}"


def _run_block_ip(config: dict[str, Any], context: dict[str, Any]) -> str:
  ip = context.get("ip_address") or context.get("ip")
  if not ip:
    raise ValueError("No IP address in context for BlockIP")

  ttl: Final[int] = int(config.get("ttl_seconds") or 86400)
  if not block_ip(str(ip), ttl_seconds=ttl):
    raise RuntimeError("Blocklist unavailable (Redis/Dragonfly offline)")
  return f"Blocked {ip} for {ttl}s"


def _run_revoke_key(
  config: dict[str, Any],
  playbook: Playbook,
  context: dict[str, Any],
) -> str:
  user = playbook.user
  if not user:
    raise ValueError("Playbook has no owner for RevokeAPIKey")

  key_id = config.get("api_key_id") or context.get("api_key_id")
  prefix = config.get("prefix") or context.get("api_key_prefix")

  qs = APIKey.objects.filter(user=user, is_active=True)
  if key_id:
    qs = qs.filter(id=key_id)
  elif prefix:
    qs = qs.filter(prefix=prefix)
  else:
    qs = qs.order_by("-created_at")[:1]

  revoked = qs.update(is_active=False)
  if revoked == 0:
    raise ValueError("No matching API key to revoke")
  return f"Revoked {revoked} API key(s)"
