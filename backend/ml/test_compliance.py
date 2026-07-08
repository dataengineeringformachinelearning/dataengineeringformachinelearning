import pytest
from django.contrib.auth.models import User
from django.test import Client
from monitor.models import StatusPage, UserProfile

from ml.models import ThreatReport


@pytest.mark.django_db
def test_get_threat_report_stix(client: Client) -> None:
  user = User.objects.create_user(username="compliance_user", password="password")
  UserProfile.objects.get_or_create(user=user)
  page = StatusPage.objects.create(
    user=user, title="My Status", slug="compliance-status", is_published=True
  )
  ThreatReport.objects.create(
    user=user,
    is_platform=False,
    anomaly_score=0.15,
    top_location="United States",
    location_weight=0.8,
    suspicious_ratio=0.03,
  )

  response = client.get(f"/api/v1/ml/threat-intel/stix?status_page_id={page.id}")
  assert response.status_code == 200
  data = response.json()
  assert data["type"] == "bundle"
  assert "id" in data
  assert len(data["objects"]) == 2

  identity = next(obj for obj in data["objects"] if obj["type"] == "identity")
  assert identity["name"] == "DEML (DATA ENGINEERING FOR MACHINE LEARNING)"
  assert identity["identity_class"] == "organization"

  indicator = next(obj for obj in data["objects"] if obj["type"] == "indicator")
  assert indicator["pattern_type"] == "stix"
  assert "Anomaly" in indicator["name"]
  assert "predicted threat score of 15.00%" in indicator["description"]


@pytest.mark.django_db
def test_submit_to_isac_sandbox(client: Client) -> None:
  import json

  payload = {"destination": "CISA"}
  response = client.post(
    "/api/v1/ml/threat-intel/submit-isac", data=json.dumps(payload), content_type="application/json"
  )
  assert response.status_code == 200
  data = response.json()
  assert data["status"] == "success"
  assert "Sandbox" in data["message"]
  assert data["mode"] == "sandbox"
  assert "sent_payload" in data
  assert any("Simulated transmission completed" in log for log in data["logs"])


@pytest.mark.django_db
def test_get_soc_status(client: Client) -> None:
  response = client.get("/api/v1/ml/compliance/soc-status")
  assert response.status_code == 200
  data = response.json()
  assert data["status"] == "success"
  assert data["overall_score"] > 0.5
  assert len(data["criteria"]) == 5

  criteria_names = [c["name"] for c in data["criteria"]]
  assert "End-to-End Encryption" in criteria_names
  assert "AES-256 Encryption at Rest" in criteria_names
  assert "Multi-Factor Authentication (MFA) & Google SSO" in criteria_names
