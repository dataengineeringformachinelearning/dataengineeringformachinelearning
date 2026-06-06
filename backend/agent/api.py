from ninja import Router, Schema
from django.http import HttpResponse
from agent.llm_agent import process_user_issue
import logging

logger = logging.getLogger(__name__)

router = Router()

class IssueReportPayload(Schema):
    user_description: str
    telemetry_context: dict

@router.post("/report-issue")
async def report_issue(request, payload: IssueReportPayload):
    try:
        response = await process_user_issue(
            user_description=payload.user_description,
            telemetry_context=payload.telemetry_context
        )
        logger.info(f"Successfully processed issue: {response}")
        return {"status": "success", "message": "Issue processed and sent to Redpanda"}
    except Exception as e:
        logger.error(f"Error processing issue: {e}")
        return HttpResponse(status=500, content=f"Internal Server Error: {e}")
