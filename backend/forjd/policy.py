"""Central DEML authorization and audit policy for FORJD BFF actions.

Firebase identities terminate in Django.  This module decides whether the
local actor may exchange a request for the account's tenant-bound FORJD
service credential; FORJD still enforces service scopes, tenant binding, and
RLS independently.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable, Mapping
from dataclasses import dataclass
from functools import wraps
from typing import Final, ParamSpec, TypeVar
from uuid import UUID

from asgiref.sync import sync_to_async
from django.http import HttpRequest, HttpResponse, JsonResponse
from monitor.models import AuditLog

P = ParamSpec("P")
R = TypeVar("R", bound=HttpResponse)

VIEWER: Final[str] = "Viewer"
OPERATOR: Final[str] = "Operator"
SECURITY_ADMIN: Final[str] = "Security Admin"

READ_ROLES: Final[frozenset[str]] = frozenset({VIEWER, OPERATOR, SECURITY_ADMIN})
OPERATOR_ROLES: Final[frozenset[str]] = frozenset({OPERATOR, SECURITY_ADMIN})
ADMIN_ROLES: Final[frozenset[str]] = frozenset({SECURITY_ADMIN})


@dataclass(frozen=True, slots=True)
class ActionPolicy:
  roles: frozenset[str]
  privileged: bool = True


ACTION_POLICIES: Final[dict[str, ActionPolicy]] = {
  "read": ActionPolicy(READ_ROLES, privileged=False),
  # Any authenticated product user may file an issue report document.
  "report.write": ActionPolicy(READ_ROLES, privileged=False),
  "ingest.write": ActionPolicy(OPERATOR_ROLES),
  "case.write": ActionPolicy(OPERATOR_ROLES),
  "vulnerability.write": ActionPolicy(OPERATOR_ROLES),
  "replay.write": ActionPolicy(OPERATOR_ROLES),
  "export.write": ActionPolicy(OPERATOR_ROLES),
  "playbook.execute": ActionPolicy(OPERATOR_ROLES),
  "projection.run": ActionPolicy(OPERATOR_ROLES),
  "session.write": ActionPolicy(OPERATOR_ROLES),
  "siem.signal.write": ActionPolicy(OPERATOR_ROLES),
  "security-alert.write": ActionPolicy(OPERATOR_ROLES),
  "status.admin": ActionPolicy(ADMIN_ROLES),
  "playbook.admin": ActionPolicy(ADMIN_ROLES),
  "integration.admin": ActionPolicy(ADMIN_ROLES),
  "model.admin": ActionPolicy(ADMIN_ROLES),
  "domain.destructive": ActionPolicy(ADMIN_ROLES),
}


@dataclass(frozen=True, slots=True)
class ForjdActorContext:
  user_id: int
  account_id: UUID
  role: str


@dataclass(frozen=True, slots=True)
class ForjdPolicyError(RuntimeError):
  status: int
  detail: str
  code: str


def action_policy(action: str) -> ActionPolicy:
  """Fail secure when a new action was not added to the policy matrix."""
  return ACTION_POLICIES.get(action, ActionPolicy(ADMIN_ROLES))


def is_privileged_action(action: str) -> bool:
  return action_policy(action).privileged


async def actor_for_request(request: HttpRequest) -> ForjdActorContext:
  cached = getattr(request, "_forjd_actor_context", None)
  if isinstance(cached, ForjdActorContext):
    return cached
  has_end_user_auth = bool(
    getattr(request, "firebase_token", None) or getattr(request, "deml_api_key", None)
  )
  if (
    not request.user.is_authenticated
    or not getattr(request.user, "is_active", False)
    or not has_end_user_auth
  ):
    raise ForjdPolicyError(401, "Authentication required", "authentication_required")

  profile_values = await sync_to_async(
    lambda: (
      getattr(getattr(request.user, "profile", None), "account_id", None),
      getattr(getattr(request.user, "profile", None), "role", VIEWER),
    )
  )()
  account_id, role = profile_values
  if account_id is None:
    raise ForjdPolicyError(403, "The authenticated user has no DEML account", "account_required")

  actor = ForjdActorContext(
    user_id=int(request.user.id),
    account_id=account_id,
    role=str(role or VIEWER),
  )
  request._forjd_actor_context = actor
  return actor


async def record_forjd_audit(
  *,
  actor: ForjdActorContext,
  request: HttpRequest,
  action: str,
  outcome: str,
  tenant_id: UUID | None = None,
  status: int | None = None,
  resource_id: str | None = None,
  upstream_request_id: str | None = None,
) -> None:
  """Persist metadata-only authorization evidence; never request bodies/tokens."""
  request_id = str(getattr(request, "correlation_id", "") or "")[:128]
  resource = str(resource_id or request.path or "")[:255]
  details = {
    "forjd_action": action,
    "outcome": outcome,
    "role": actor.role,
    "request_id": request_id,
  }
  if tenant_id is not None:
    details["forjd_tenant_id"] = str(tenant_id)
  if status is not None:
    details["status"] = int(status)
  if upstream_request_id:
    details["upstream_request_id"] = str(upstream_request_id)[:128]
  await sync_to_async(AuditLog.objects.create)(
    user_id=actor.user_id,
    action=f"FORJD_{action.upper().replace('.', '_')}_{outcome.upper()}",
    resource_id=resource,
    details=details,
    ip_address=None,
    user_agent="",
  )


async def authorize_forjd_action(
  request: HttpRequest,
  action: str,
  *,
  resource_id: str | None = None,
) -> ForjdActorContext:
  actor = await actor_for_request(request)
  policy = action_policy(action)
  if actor.role not in policy.roles:
    await record_forjd_audit(
      actor=actor,
      request=request,
      action=action,
      outcome="denied",
      status=403,
      resource_id=resource_id,
    )
    raise ForjdPolicyError(
      403,
      "The authenticated role is not authorized for this FORJD action",
      "forjd_action_forbidden",
    )
  return actor


def policy_error_response(exc: ForjdPolicyError) -> JsonResponse:
  return JsonResponse({"detail": exc.detail, "code": exc.code}, status=exc.status)


def action_for_native_request(method: str, target_path: str) -> str:
  """Map the allowlisted native proxy routes onto the local role matrix."""
  verb = method.upper()
  path = target_path.rstrip("/")
  if verb in {"GET", "HEAD"}:
    return "read"
  if path.startswith("/api/v1/ingest"):
    return "ingest.write"
  if path == "/api/v1/projections/run":
    return "projection.run"
  if path.startswith("/api/v1/replay"):
    return "replay.write"
  if path.startswith("/api/v1/sessions"):
    return "session.write" if verb == "POST" else "domain.destructive"
  if path.startswith("/api/v1/status"):
    return "status.admin"
  if path == "/api/v1/integrations/security-alert":
    return "security-alert.write"
  if path.startswith("/api/v1/exports"):
    return "export.write"
  if path.startswith("/api/v1/soc/cases"):
    return "case.write"
  if path.startswith("/api/v1/playbooks"):
    return "playbook.execute" if path.endswith("/execute") else "playbook.admin"
  if path.startswith("/api/v1/vulnerabilities"):
    return "vulnerability.write"
  if path.startswith("/api/v1/siem/signals"):
    return "siem.signal.write"
  if path.startswith(("/api/v1/ml", "/api/v1/threat-ml", "/api/v1/sla")):
    return "model.admin"
  return "domain.destructive"


def _resolve_decorated_action(
  request: HttpRequest,
  actions: str | Mapping[str, str],
) -> str:
  if isinstance(actions, str):
    return actions
  # Unknown methods are left to the view's 405 response without elevating them.
  return actions.get(request.method.upper(), "read")


def require_forjd_action(
  actions: str | Mapping[str, str],
) -> Callable[[Callable[P, Awaitable[R]]], Callable[P, Awaitable[HttpResponse]]]:
  """Authorize a typed adapter and audit every privileged attempt/result."""

  def decorator(view: Callable[P, Awaitable[R]]) -> Callable[P, Awaitable[HttpResponse]]:
    @wraps(view)
    async def wrapped(request: HttpRequest, *args: P.args, **kwargs: P.kwargs) -> HttpResponse:
      action = _resolve_decorated_action(request, actions)
      resource_id = next(
        (str(value) for key, value in kwargs.items() if key.endswith("_id")),
        request.path,
      )
      try:
        actor = await authorize_forjd_action(request, action, resource_id=resource_id)
      except ForjdPolicyError as exc:
        return policy_error_response(exc)

      privileged = is_privileged_action(action)
      if privileged:
        await record_forjd_audit(
          actor=actor,
          request=request,
          action=action,
          outcome="attempted",
          resource_id=resource_id,
        )
      try:
        response = await view(request, *args, **kwargs)
      except Exception:
        if privileged:
          await record_forjd_audit(
            actor=actor,
            request=request,
            action=action,
            outcome="failed",
            status=500,
            resource_id=resource_id,
          )
        raise
      upstream_request_id = response.headers.get("X-FORJD-Request-ID") or str(
        getattr(request, "_forjd_upstream_request_id", "") or ""
      )
      if upstream_request_id:
        response["X-FORJD-Request-ID"] = upstream_request_id
      if privileged:
        await record_forjd_audit(
          actor=actor,
          request=request,
          action=action,
          outcome="succeeded" if response.status_code < 400 else "failed",
          status=response.status_code,
          resource_id=resource_id,
          upstream_request_id=upstream_request_id,
        )
      return response

    return wrapped

  return decorator
