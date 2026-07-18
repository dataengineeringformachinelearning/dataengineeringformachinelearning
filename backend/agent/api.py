"""User-originated learning-platform interactions."""

from typing import Any

from monitor.models import BugReport
from ninja import Router, Schema
from ninja.errors import HttpError

router = Router(tags=["Interactions"])


class IssueReportPayload(Schema):
  user_description: str
  telemetry_context: dict[str, Any] = {}


@router.post("/report-issue")
def report_issue(request: Any, payload: IssueReportPayload) -> dict[str, str]:
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")
  report = BugReport.objects.create(
    user=request.user,
    user_description=payload.user_description,
    telemetry_context=payload.telemetry_context,
  )
  return {"status": "recorded", "id": str(report.id)}
