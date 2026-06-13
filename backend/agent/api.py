import logging

from django.http import HttpResponse
from ninja import Router, Schema

from agent.llm_agent import process_user_issue

logger = logging.getLogger(__name__)

router = Router()


class IssueReportPayload(Schema):
  user_description: str
  telemetry_context: dict


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
    return HttpResponse(status=500, content="Internal Server Error")
