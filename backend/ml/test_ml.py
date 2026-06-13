import datetime

import pytest
from django.contrib.auth.models import User
from monitor.models import Endpoints, MonitoredService, StatusPage

from ml.models import TrainingRun


@pytest.mark.django_db
def test_train_model_no_data(client):
  user = User.objects.create_user(username="testuser", password="password")
  StatusPage.objects.create(user=user, title="Platform Status", slug="platform-status")
  response = client.post("/api/v1/ml/train")
  assert response.status_code == 400
  assert "No data available for training" in response.json()["detail"]


@pytest.mark.django_db
def test_train_model_success(client):
  user = User.objects.create_user(username="testuser", password="password")
  page = StatusPage.objects.create(user=user, title="Platform Status", slug="platform-status")
  MonitoredService.objects.create(status_page=page, name="Test Service", url="http://test.com")

  Endpoints.objects.create(
    url="http://test.com",
    status_code=200,
    response_time=datetime.timedelta(milliseconds=150),
    is_active=True,
  )
  Endpoints.objects.create(
    url="http://test.com",
    status_code=500,
    response_time=datetime.timedelta(milliseconds=1000),
    is_active=False,
  )

  response = client.post("/api/v1/ml/train")
  assert response.status_code == 200
  data = response.json()
  assert data["status"] == "success"
  assert "loss" in data
  assert "average_sla" in data
  assert TrainingRun.objects.count() == 1


@pytest.mark.django_db
def test_get_latest_training(client):
  # No runs initially
  response = client.get("/api/v1/ml/latest")
  assert response.status_code == 200
  assert response.json()["average_sla"] is None

  # Create a run
  TrainingRun.objects.create(average_sla=98.5, loss=0.012)

  response = client.get("/api/v1/ml/latest")
  assert response.status_code == 200
  data = response.json()
  assert data["status"] == "success"
  assert data["average_sla"] == 98.5
  assert data["loss"] == 0.012


@pytest.mark.django_db
def test_train_and_latest_with_status_page(client):
  user = User.objects.create_user(username="testuser", password="password")
  page = StatusPage.objects.create(user=user, title="Tenant Status", slug="tenant-status")
  MonitoredService.objects.create(status_page=page, name="Test Service", url="http://tenant.com")

  Endpoints.objects.create(
    url="http://tenant.com",
    status_code=200,
    response_time=datetime.timedelta(milliseconds=100),
    is_active=True,
  )

  # Train
  train_res = client.post(f"/api/v1/ml/train?status_page_id={page.id}")
  assert train_res.status_code == 200
  assert train_res.json()["average_sla"] is not None

  # Get latest
  latest_res = client.get(f"/api/v1/ml/latest?status_page_id={page.id}")
  assert latest_res.status_code == 200
  assert latest_res.json()["average_sla"] == train_res.json()["average_sla"]
