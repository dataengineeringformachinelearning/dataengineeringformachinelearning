import logging

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
async def report_issue(request, payload: IssueReportPayload):
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
def report_vulnerability(request, payload: VulnerabilityReportPayload):
  from monitor.models import Vulnerability

  # Set default severity if not provided or valid
  severity = payload.severity
  if severity not in ["Low", "Medium", "High", "Critical"]:
    severity = "Medium"

  vuln = Vulnerability.objects.create(
    title=payload.title,
    description=payload.description,
    telemetry_context=payload.telemetry_context,
    customer_id=payload.customer_id,
    cve_id=payload.cve_id,
    severity=severity,
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
def list_vulnerabilities(request):
  from monitor.models import Vulnerability

  # For now, let's return all vulnerabilities sorted by creation time
  vulns = Vulnerability.objects.all().order_by("-created_at")
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
def update_vulnerability(request, vuln_id: str, payload: VulnerabilityUpdatePayload):
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
