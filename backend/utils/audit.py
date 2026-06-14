from typing import Any

from monitor.models import AuditLog

from utils.request import get_client_ip, get_user_agent


def log_audit_event(
  request: Any,
  action: str,
  resource_id: str | None = None,
  details: dict[str, Any] | None = None,
) -> AuditLog:
  """Utility to log an audit event for compliance tracking."""
  user = request.user if request.user and request.user.is_authenticated else None
  ip = get_client_ip(request)
  ua = get_user_agent(request)

  log = AuditLog.objects.create(
    user=user,
    action=action,
    resource_id=resource_id,
    details=details or {},
    ip_address=ip or None,
    user_agent=ua or None,
  )
  return log
