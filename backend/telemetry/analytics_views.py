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
def get_analytics_overview(request, account_id: str | None = None, site_url: str | None = None):
  user = require_auth(request)
  try:
    data = OverviewService.build(user, account_id=account_id, site_url=site_url)
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


class PlaybookOut(Schema):
  id: str
  name: str
  description: str | None = None
  is_active: bool


class PlaybookUpdate(Schema):
  is_active: bool | None = None


@router.get("/incidents", response=list[IncidentCaseOut])
def get_incidents(request, account_id: str | None = None):
  user = require_auth(request)
  from monitor.models import IncidentCase

  profile = getattr(user, "profile", None)
  if account_id and profile and str(account_id) != str(profile.account_id):
    return []

  cases = list(IncidentCase.objects.filter(user=user).order_by("-created_at"))

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
def get_playbooks(request, account_id: str | None = None):
  user = require_auth(request)
  from monitor.models import Playbook

  profile = getattr(user, "profile", None)
  if account_id and profile and str(account_id) != str(profile.account_id):
    return []

  playbooks = list(Playbook.objects.filter(user=user).order_by("name"))

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
