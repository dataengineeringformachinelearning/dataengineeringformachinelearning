from typing import Any

import pytest
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from django.test import AsyncClient
from monitor.models import BugReport

User = get_user_model()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_report_issue_records_authenticated_user_interaction(
  async_client: AsyncClient,
) -> None:
  user = await sync_to_async(User.objects.create_user)(username="learner")
  payload: dict[str, Any] = {
    "user_description": "The lesson instructions are unclear",
    "telemetry_context": {"route": "/account"},
  }

  response = await async_client.post(
    "/api/v1/agent/report-issue",
    data=payload,
    content_type="application/json",
    headers={"authorization": "Bearer mock-token-learner-learner@example.com"},
  )

  assert response.status_code == 200
  data = response.json()
  assert data["status"] == "recorded"
  report = await sync_to_async(BugReport.objects.get)(id=data["id"])
  assert report.user_id == user.id
  assert report.user_description == payload["user_description"]
