import pytest
from django.contrib.auth.models import User
from monitor.models import StatusPage

from ml.models import ThreatReport


@pytest.mark.django_db
def test_get_threat_report_stix(client):
  # Set up status page and threat report
  user = User.objects.create_user(username="compliance_user", password="password")
  StatusPage.objects.create(user=user, title="Platform Status", slug="platform-status")
  ThreatReport.objects.create(
    user=user,
    anomaly_score=0.15,
    top_location="United States",
    location_weight=0.8,
    suspicious_ratio=0.03,
  )

  response = client.get("/api/v1/ml/threat-intel/stix")
  assert response.status_code == 200
  data = response.json()
  assert data["type"] == "bundle"
  assert "id" in data
  assert len(data["objects"]) == 2

  # Check identity object
  identity = next(obj for obj in data["objects"] if obj["type"] == "identity")
  assert identity["name"] == "Data Engineering for Machine Learning Platform"
  assert identity["identity_class"] == "organization"

  # Check indicator object
  indicator = next(obj for obj in data["objects"] if obj["type"] == "indicator")
  assert indicator["pattern_type"] == "stix"
  assert "Anomaly" in indicator["name"]
  assert "predicted threat score of 15.00%" in indicator["description"]


@pytest.mark.django_db
def test_submit_to_isac_sandbox(client):
  import json

  user = User.objects.create_user(username="compliance_user", password="password")
  StatusPage.objects.create(user=user, title="Platform Status", slug="platform-status")

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
def test_get_soc_status(client):
  response = client.get("/api/v1/ml/compliance/soc-status")
  assert response.status_code == 200
  data = response.json()
  assert data["status"] == "success"
  assert data["overall_score"] > 0.5
  assert len(data["criteria"]) == 5

  # Ensure all required criteria are present
  criteria_names = [c["name"] for c in data["criteria"]]
  assert "End-to-End Encryption in Transit" in criteria_names
  assert "AES-256 Encryption at Rest" in criteria_names
  assert "Multi-Factor Authentication (MFA)" in criteria_names
