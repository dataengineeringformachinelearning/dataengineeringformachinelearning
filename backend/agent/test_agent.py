import django.urls.converters as converters

if "uuid" in converters.DEFAULT_CONVERTERS:
  del converters.DEFAULT_CONVERTERS["uuid"]
if "uuid" in converters.REGISTERED_CONVERTERS:
  del converters.REGISTERED_CONVERTERS["uuid"]
converters.get_converters.cache_clear()

from unittest.mock import AsyncMock, patch

import pytest
from asgiref.sync import sync_to_async
from django.test import AsyncClient, Client
from monitor.models import BugReport


@pytest.mark.django_db
@pytest.mark.asyncio
async def test_report_issue_endpoint(async_client: AsyncClient) -> None:
  payload = {
    "user_description": "There is a bug in the telemetry pipeline",
    "telemetry_context": {
      "url": "http://localhost:4200/",
      "userAgent": "Mozilla/5.0",
      "recentErrors": ["Failed to fetch telemetry"],
    },
  }

  # Mock process_user_issue to avoid hitting Google Gemini API during tests
  with patch(
    "agent.api.process_user_issue", AsyncMock(return_value="AI analysis complete")
  ) as mock_process:
    response = await async_client.post(
      "/api/v1/agent/report-issue", data=payload, content_type="application/json"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "id" in data

    # Verify it was saved to the database
    bug_report = await sync_to_async(BugReport.objects.get)(id=data["id"])
    assert bug_report.user_description == payload["user_description"]
    assert bug_report.telemetry_context == payload["telemetry_context"]
    assert bug_report.processed_report is None or bug_report.processed_report == ""

    # Verify process_user_issue was called with bug_report_id
    mock_process.assert_called_once_with(
      user_description=payload["user_description"],
      telemetry_context=payload["telemetry_context"],
      bug_report_id=data["id"],
    )


@pytest.mark.django_db
def test_vulnerability_lifecycle(client: Client) -> None:
  # 1. Report a vulnerability
  payload = {
    "title": "SQL Injection in Search Endpoint",
    "description": "Found a potential SQLi vulnerability at /api/explore",
    "telemetry_context": {"browser": "Chrome"},
    "customer_id": "Cust-123",
    "severity": "High",
  }

  response = client.post(
    "/api/v1/agent/vulnerabilities", data=payload, content_type="application/json"
  )
  assert response.status_code == 200
  data = response.json()
  assert data["title"] == payload["title"]
  assert data["severity"] == "High"
  assert data["status"] == "Triage"
  vuln_id = data["id"]

  # 2. Get list of vulnerabilities
  list_response = client.get("/api/v1/agent/vulnerabilities")
  assert list_response.status_code == 200
  vulns = list_response.json()
  assert len(vulns) >= 1
  assert any(v["id"] == vuln_id for v in vulns)

  # 3. Update/Prioritize the vulnerability
  update_payload = {
    "status": "In Progress",
    "impact": 5,
    "likelihood": 4,
    "severity": "Critical",
  }

  update_response = client.patch(
    f"/api/v1/agent/vulnerabilities/{vuln_id}",
    data=update_payload,
    content_type="application/json",
  )
  assert update_response.status_code == 200
  updated_data = update_response.json()
  assert updated_data["status"] == "In Progress"
  assert updated_data["impact"] == 5
  assert updated_data["likelihood"] == 4
  assert updated_data["severity"] == "Critical"
