import logging
from typing import Any

from django.http import HttpResponse
from ninja import Router, Schema

from agent.llm_agent import process_user_issue

logger = logging.getLogger(__name__)

router = Router()


class IssueReportPayload(Schema):
  user_description: str
  telemetry_context: dict


class VulnerabilityReportPayload(Schema):
  title: str
  description: str
  telemetry_context: dict
  customer_id: str = "Internal"
  cve_id: str | None = None
  severity: str = "Medium"


class VulnerabilityUpdatePayload(Schema):
  status: str | None = None
  severity: str | None = None
  impact: int | None = None
  likelihood: int | None = None


class VulnerabilityOut(Schema):
  id: str
  title: str
  description: str
  status: str
  severity: str
  impact: int
  likelihood: int
  cve_id: str | None = None
  customer_id: str
  telemetry_context: dict | None = None
  created_at: str

  updated_at: str


@router.post("/report-issue")
async def report_issue(request: Any, payload: IssueReportPayload) -> Any:
  try:
    from asgiref.sync import sync_to_async
    from monitor.models import BugReport

    # Create bug report in database
    bug_report = await sync_to_async(BugReport.objects.create)(
      user_description=payload.user_description, telemetry_context=payload.telemetry_context
    )

    response = await process_user_issue(
      user_description=payload.user_description,
      telemetry_context=payload.telemetry_context,
      bug_report_id=str(bug_report.id),
    )
    logger.info(f"Successfully processed issue: {response}")
    return {
      "status": "success",
      "message": "Issue processed and sent to Redpanda",
      "id": str(bug_report.id),
    }
  except Exception:
    logger.exception("Error processing issue")
    # nosemgrep: python.django.security.audit.xss.direct-use-of-httpresponse.direct-use-of-httpresponse
    return HttpResponse(status=500, content="Internal Server Error")


@router.post("/vulnerabilities", response=VulnerabilityOut)
def report_vulnerability(request: Any, payload: VulnerabilityReportPayload) -> Any:
  import uuid

  from monitor.models import TenantMembership, Vulnerability

  # Set default severity if not provided or valid
  severity = payload.severity
  if severity not in ["Low", "Medium", "High", "Critical"]:
    severity = "Medium"

  tenant_id = None
  try:
    if payload.customer_id and payload.customer_id != "Internal":
      tenant_uuid = uuid.UUID(payload.customer_id)
      tenant_id = tenant_uuid
  except ValueError:
    pass

  if not tenant_id and request.user.is_authenticated:
    tm = TenantMembership.objects.filter(user=request.user).first()
    if tm:
      tenant_id = tm.tenant_id

  vuln = Vulnerability.objects.create(
    title=payload.title,
    description=payload.description,
    telemetry_context=payload.telemetry_context,
    customer_id=payload.customer_id,
    cve_id=payload.cve_id,
    severity=severity,
    tenant_id=tenant_id,
  )

  return {
    "id": str(vuln.id),
    "title": vuln.title,
    "description": vuln.description,
    "status": vuln.status,
    "severity": vuln.severity,
    "impact": vuln.impact,
    "likelihood": vuln.likelihood,
    "cve_id": vuln.cve_id,
    "customer_id": vuln.customer_id,
    "telemetry_context": vuln.telemetry_context,
    "created_at": vuln.created_at.isoformat(),
    "updated_at": vuln.updated_at.isoformat(),
  }


@router.get("/vulnerabilities", response=list[VulnerabilityOut])
def list_vulnerabilities(request: Any) -> Any:
  from django.db.models import Q
  from monitor.models import TenantMembership, Vulnerability

  if request.user.is_authenticated:
    memberships = TenantMembership.objects.filter(user=request.user).values_list(
      "tenant_id", flat=True
    )
    tenant_ids_str = [str(t_id) for t_id in memberships]

    vulns = Vulnerability.objects.filter(
      Q(tenant_id__in=memberships)
      | Q(customer_id__in=tenant_ids_str)
      | Q(customer_id=str(request.user.id))
    ).order_by("-created_at")
  else:
    vulns = Vulnerability.objects.filter(customer_id="Internal").order_by("-created_at")

  return [
    {
      "id": str(v.id),
      "title": v.title,
      "description": v.description,
      "status": v.status,
      "severity": v.severity,
      "impact": v.impact,
      "likelihood": v.likelihood,
      "cve_id": v.cve_id,
      "customer_id": v.customer_id,
      "telemetry_context": v.telemetry_context,
      "created_at": v.created_at.isoformat(),
      "updated_at": v.updated_at.isoformat(),
    }
    for v in vulns
  ]


@router.patch("/vulnerabilities/{vuln_id}", response=VulnerabilityOut)
def update_vulnerability(request: Any, vuln_id: str, payload: VulnerabilityUpdatePayload) -> Any:
  from django.shortcuts import get_object_or_404
  from monitor.models import Vulnerability

  vuln = get_object_or_404(Vulnerability, id=vuln_id)

  if payload.status is not None:
    vuln.status = payload.status
  if payload.severity is not None:
    vuln.severity = payload.severity
  if payload.impact is not None:
    vuln.impact = payload.impact
  if payload.likelihood is not None:
    vuln.likelihood = payload.likelihood

  vuln.save()

  return {
    "id": str(vuln.id),
    "title": vuln.title,
    "description": vuln.description,
    "status": vuln.status,
    "severity": vuln.severity,
    "impact": vuln.impact,
    "likelihood": vuln.likelihood,
    "cve_id": vuln.cve_id,
    "customer_id": vuln.customer_id,
    "telemetry_context": vuln.telemetry_context,
    "created_at": vuln.created_at.isoformat(),
    "updated_at": vuln.updated_at.isoformat(),
  }
