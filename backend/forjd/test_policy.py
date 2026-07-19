from __future__ import annotations

import json

import pytest
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.test import RequestFactory
from monitor.models import AuditLog

from forjd.policy import action_policy, actor_for_request, require_forjd_action

User = get_user_model()

_PRO_ACTIONS = frozenset(
  {
    "export.write",
    "model.admin",
    "playbook.admin",
    "playbook.execute",
    "siem.signal.write",
    "projection.run",
    "vulnerability.write",
    "case.write",
  }
)


@pytest.mark.parametrize(
  ("action", "allowed_roles"),
  [
    ("read", {"Viewer", "Operator", "Security Admin"}),
    ("ingest.write", {"Operator", "Security Admin"}),
    ("case.write", {"Operator", "Security Admin"}),
    ("vulnerability.write", {"Operator", "Security Admin"}),
    ("replay.write", {"Operator", "Security Admin"}),
    ("export.write", {"Operator", "Security Admin"}),
    ("playbook.execute", {"Operator", "Security Admin"}),
    ("status.admin", {"Security Admin"}),
    ("playbook.admin", {"Security Admin"}),
    ("integration.admin", {"Security Admin"}),
    ("model.admin", {"Security Admin"}),
    ("domain.destructive", {"Security Admin"}),
  ],
)
def test_action_policy_matrix(action: str, allowed_roles: set[str]) -> None:
  policy = action_policy(action)
  assert policy.roles == allowed_roles
  assert policy.requires_pro is (action in _PRO_ACTIONS)


@pytest.mark.parametrize(
  "action",
  [
    "read",
    "ingest.write",
    "report.write",
    "status.admin",
    "session.write",
    "security-alert.write",
    "replay.write",
  ],
)
def test_core_product_actions_do_not_require_pro(action: str) -> None:
  assert action_policy(action).requires_pro is False


async def _request_for(role: str, *, pro: bool = False):
  user = await sync_to_async(User.objects.create_user)(username=f"policy-{role}-{pro}")
  user.profile.role = role
  if pro:
    user.profile.tier = "Pro"
    user.profile.subscription_active = True
  else:
    user.profile.tier = "Standard"
    user.profile.subscription_active = False
  await sync_to_async(user.profile.save)(update_fields=["role", "tier", "subscription_active"])
  request = RequestFactory().post("/api/v1/analytics/playbooks")
  request.user = user
  request.firebase_token = {"uid": user.username}
  request.correlation_id = "policy-request-0001"
  return request, user


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize(("status", "outcome"), [(200, "SUCCEEDED"), (503, "FAILED")])
async def test_privileged_decorator_audits_attempt_and_result(
  status: int,
  outcome: str,
) -> None:
  request, user = await _request_for("Security Admin", pro=True)

  @require_forjd_action("playbook.admin")
  async def view(_request):
    response = JsonResponse({"ok": status < 400}, status=status)
    response["X-FORJD-Request-ID"] = "forjd-request-0001"
    return response

  response = await view(request)

  assert response.status_code == status
  logs = await sync_to_async(list)(AuditLog.objects.filter(user=user).order_by("timestamp"))
  assert [row.action for row in logs] == [
    "FORJD_PLAYBOOK_ADMIN_ATTEMPTED",
    f"FORJD_PLAYBOOK_ADMIN_{outcome}",
  ]
  assert logs[-1].details["upstream_request_id"] == "forjd-request-0001"


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_privileged_decorator_denies_viewer_and_audits_denial() -> None:
  request, user = await _request_for("Viewer", pro=True)

  @require_forjd_action("playbook.admin")
  async def view(_request):
    return JsonResponse({"ok": True})

  response = await view(request)

  assert response.status_code == 403
  assert json.loads(response.content)["code"] == "forjd_action_forbidden"
  log = await sync_to_async(AuditLog.objects.get)(user=user)
  assert log.action == "FORJD_PLAYBOOK_ADMIN_DENIED"


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_pro_action_denies_standard_operator() -> None:
  request, user = await _request_for("Operator", pro=False)

  @require_forjd_action("export.write")
  async def view(_request):
    return JsonResponse({"ok": True})

  response = await view(request)

  assert response.status_code == 403
  body = json.loads(response.content)
  assert body["code"] == "pro_required"
  assert body["detail"] == "Pro subscription required"
  log = await sync_to_async(AuditLog.objects.get)(user=user)
  assert log.action == "FORJD_EXPORT_WRITE_DENIED"


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_actor_loads_tier_and_subscription_flags() -> None:
  request, user = await _request_for("Operator", pro=True)

  actor = await actor_for_request(request)

  assert actor.user_id == user.id
  assert actor.role == "Operator"
  assert actor.tier == "Pro"
  assert actor.subscription_active is True


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_actor_accepts_deml_api_key_auth_marker() -> None:
  request, user = await _request_for("Operator")
  del request.firebase_token
  request.deml_api_key = object()

  actor = await actor_for_request(request)

  assert actor.user_id == user.id
  assert actor.role == "Operator"
