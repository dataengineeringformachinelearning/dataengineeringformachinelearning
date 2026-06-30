import logging

from account.context import account_context
from ninja import Router
from ninja.errors import HttpError
from utils.permissions import require_auth

from telemetry.services.overview import OverviewService

logger = logging.getLogger(__name__)
router = Router()


@router.get("/tenants")
def get_user_accounts(request):
  ctx = account_context(request)
  profile = getattr(ctx.user, "profile", None)
  accounts = [
    {
      "id": str(profile.account_id),
      "name": f"{ctx.user.first_name or ctx.user.username}'s Workspace",
      "slug": ctx.user.username,
      "is_platform": False,
      "role": profile.role,
    }
  ]
  return {"status": "success", "data": accounts}


@router.get("/overview")
def get_analytics_overview(
  request,
  account_id: str | None = None,
  tenant_id: str | None = None,
  site_url: str | None = None,
):
  user = require_auth(request)
  scoped_account_id = account_id or tenant_id
  try:
    data = OverviewService.build(user, account_id=scoped_account_id, site_url=site_url)
  except PermissionError:
    raise HttpError(403, "Access denied to this account") from None
  except ValueError as exc:
    raise HttpError(403, str(exc)) from exc
  return {"status": "success", "data": data}


from ninja import Schema


class IncidentCaseOut(Schema):
  id: str
  title: str
  description: str | None = None
  status: str
  severity: str
  created_at: str


class IncidentCaseUpdate(Schema):
  status: str | None = None
  severity: str | None = None


class PlaybookExecuteOut(Schema):
  status: str
  message: str
  actions_run: int


class PlaybookOut(Schema):
  id: str
  name: str
  description: str | None = None
  is_active: bool


class PlaybookUpdate(Schema):
  is_active: bool | None = None


@router.get("/incidents", response=list[IncidentCaseOut])
def get_incidents(
  request,
  account_id: str | None = None,
  tenant_id: str | None = None,
):
  user = require_auth(request)
  from account.context import resolve_scope_from_account_id
  from monitor.models import IncidentCase

  scoped_account_id = account_id or tenant_id
  profile = getattr(user, "profile", None)
  scoped_user = user
  if scoped_account_id and profile:
    resolved_user, _ = resolve_scope_from_account_id(scoped_account_id)
    if resolved_user is not None:
      scoped_user = resolved_user
    elif str(scoped_account_id) != str(profile.account_id):
      return []

  cases = list(IncidentCase.objects.filter(user=scoped_user).order_by("-created_at"))

  return [
    IncidentCaseOut(
      id=str(c.id),
      title=c.title,
      description=c.description,
      status=c.status,
      severity=c.severity,
      created_at=c.created_at.isoformat(),
    )
    for c in cases
  ]


@router.patch("/incidents/{incident_id}", response=IncidentCaseOut)
def update_incident(request, incident_id: str, payload: IncidentCaseUpdate):
  user = require_auth(request)
  from monitor.models import IncidentCase

  try:
    case = IncidentCase.objects.get(id=incident_id, user=user)
  except IncidentCase.DoesNotExist:
    from ninja.errors import HttpError

    raise HttpError(404, "Incident not found") from None

  if payload.status is not None:
    case.status = payload.status
  if payload.severity is not None:
    case.severity = payload.severity
  case.save()
  return IncidentCaseOut(
    id=str(case.id),
    title=case.title,
    description=case.description,
    status=case.status,
    severity=case.severity,
    created_at=case.created_at.isoformat(),
  )


@router.get("/playbooks", response=list[PlaybookOut])
def get_playbooks(
  request,
  account_id: str | None = None,
  tenant_id: str | None = None,
):
  user = require_auth(request)
  from account.context import resolve_scope_from_account_id
  from monitor.models import Playbook

  scoped_account_id = account_id or tenant_id
  profile = getattr(user, "profile", None)
  scoped_user = user
  if scoped_account_id and profile:
    resolved_user, _ = resolve_scope_from_account_id(scoped_account_id)
    if resolved_user is not None:
      scoped_user = resolved_user
    elif str(scoped_account_id) != str(profile.account_id):
      return []

  playbooks = list(Playbook.objects.filter(user=scoped_user).order_by("name"))

  return [
    PlaybookOut(id=str(p.id), name=p.name, description=p.description, is_active=p.is_active)
    for p in playbooks
  ]


@router.patch("/playbooks/{playbook_id}", response=PlaybookOut)
def update_playbook(request, playbook_id: str, payload: PlaybookUpdate):
  user = require_auth(request)
  from monitor.models import Playbook

  try:
    playbook = Playbook.objects.get(id=playbook_id, user=user)
  except Playbook.DoesNotExist:
    from ninja.errors import HttpError

    raise HttpError(404, "Playbook not found") from None

  if payload.is_active is not None:
    playbook.is_active = payload.is_active
  playbook.save()
  return PlaybookOut(
    id=str(playbook.id),
    name=playbook.name,
    description=playbook.description,
    is_active=playbook.is_active,
  )


@router.post("/playbooks/{playbook_id}/execute", response=PlaybookExecuteOut)
def execute_playbook(request, playbook_id: str):
  user = require_auth(request)
  from monitor.models import Playbook
  from utils.audit import log_audit_event

  from telemetry.services.playbook_runner import execute_playbook as run_playbook

  try:
    playbook = Playbook.objects.get(id=playbook_id, user=user)
  except Playbook.DoesNotExist:
    raise HttpError(404, "Playbook not found") from None

  if not playbook.is_active:
    raise HttpError(400, "Playbook is paused — activate it before running")

  result = run_playbook(playbook, {"user_id": user.id}, triggered_by="manual")
  log_audit_event(
    request,
    "playbook.executed",
    resource_id=str(playbook.id),
    details={"actions_run": result.get("actions_run", 0), "name": playbook.name},
  )
  action_summary = (
    ", ".join(r.get("action_type", "") for r in result.get("results", [])[:5])
    or "no configured steps"
  )
  return PlaybookExecuteOut(
    status="executed",
    message=f"Playbook '{playbook.name}' executed ({action_summary})",
    actions_run=result.get("actions_run", 0),
  )
