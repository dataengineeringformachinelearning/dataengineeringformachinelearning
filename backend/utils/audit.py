import json
import logging
from typing import Any

from monitor.models import AuditLog

from utils.request import get_client_ip, get_user_agent

logger = logging.getLogger("monitor.audit")


def log_audit_event(
  request: Any,
  action: str,
  resource_id: str | None = None,
  details: dict[str, Any] | None = None,
) -> AuditLog | None:
  """Utility to log an audit event for compliance tracking."""
  try:
    user = (
      request.user
      if request and getattr(request, "user", None) and request.user.is_authenticated
      else None
    )
    ip = get_client_ip(request) if request else None
    ua = get_user_agent(request) if request else None

    # Log via Python logger for centralized GCP/SIEM streaming
    logger.info(
      "Audit Event: action=%s, resource_id=%s, user=%s, ip=%s, ua=%s, details=%s",
      action,
      resource_id,
      user.username if user else "anonymous",
      ip,
      ua,
      json.dumps(details or {}),
    )

    log = AuditLog.objects.create(
      user=user,
      action=action,
      resource_id=resource_id,
      details=details or {},
      ip_address=ip or None,
      user_agent=ua or None,
    )
    return log
  except Exception as e:
    logger.exception("Failed to log audit event: %s", e)
    return None
