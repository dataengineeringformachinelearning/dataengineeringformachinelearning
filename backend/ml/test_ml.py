import datetime

import pytest
from account.platform import ensure_platform_status_page
from django.contrib.auth.models import User
from django.test import Client
from monitor.models import Endpoints, MonitoredService, StatusPage

from ml.models import TrainingRun


@pytest.mark.django_db
def test_train_model_no_data(client: Client) -> None:
  ensure_platform_status_page()
  response = client.post("/api/v1/ml/train")
  assert response.status_code == 400
  assert "No data available for training" in response.json()["detail"]


@pytest.mark.django_db
def test_train_model_success(client: Client) -> None:
  page = ensure_platform_status_page()
  MonitoredService.objects.create(status_page=page, name="Test Service", url="http://test.com")

  Endpoints.objects.create(
    url="http://test.com",
    status_code=200,
    response_time=datetime.timedelta(milliseconds=150),
    is_active=True,
    is_platform=True,
    user=None,
  )
  Endpoints.objects.create(
    url="http://test.com",
    status_code=500,
    response_time=datetime.timedelta(milliseconds=1000),
    is_active=False,
    is_platform=True,
    user=None,
  )

  response = client.post("/api/v1/ml/train")
  assert response.status_code == 200
  data = response.json()
  assert data["status"] == "success"
  assert "loss" in data
  assert "average_sla" in data
  assert TrainingRun.objects.filter(is_platform=True, user__isnull=True).count() == 1


@pytest.mark.django_db
def test_get_latest_training(client: Client) -> None:
  response = client.get("/api/v1/ml/latest")
  assert response.status_code == 200
  assert response.json()["average_sla"] is None

  TrainingRun.objects.create(
    average_sla=98.5, loss=0.012, is_platform=True, user=None, model_type=TrainingRun.MODEL_TYPE_SLA
  )

  response = client.get("/api/v1/ml/latest")
  assert response.status_code == 200
  data = response.json()
  assert data["status"] == "success"
  assert data["average_sla"] == 98.5
  assert data["loss"] == 0.012


@pytest.mark.django_db
def test_train_and_latest_with_status_page(client: Client) -> None:
  user = User.objects.create_user(username="testuser", password="password")
  page = StatusPage.objects.create(
    user=user, title="Tenant Status", slug="tenant-status", is_published=True
  )
  MonitoredService.objects.create(status_page=page, name="Test Service", url="http://tenant.com")

  Endpoints.objects.create(
    url="http://tenant.com",
    status_code=200,
    response_time=datetime.timedelta(milliseconds=100),
    is_active=True,
    user=user,
    is_platform=False,
  )

  train_res = client.post(f"/api/v1/ml/train?status_page_id={page.id}")
  assert train_res.status_code == 200
  assert train_res.json()["average_sla"] is not None

  latest_res = client.get(f"/api/v1/ml/latest?status_page_id={page.id}")
  assert latest_res.status_code == 200
  assert latest_res.json()["average_sla"] == train_res.json()["average_sla"]


@pytest.mark.django_db
def test_get_temporal_forecast(client: Client) -> None:
  page = ensure_platform_status_page()
  response = client.get(f"/api/v1/ml/temporal-forecast?status_page_id={page.id}")
  assert response.status_code == 200
  data = response.json()
  assert data["status"] == "success"
  assert data["spiking_temporal_forecast"] is not None

  TrainingRun.objects.create(
    average_sla=72.5,
    loss=0.04,
    is_platform=True,
    user=None,
    model_type=TrainingRun.MODEL_TYPE_SPIKING,
  )
  from django.core.cache import cache

  cache.delete(f"ml:temporal_forecast:{page.id}")
  response = client.get(f"/api/v1/ml/temporal-forecast?status_page_id={page.id}")
  assert response.status_code == 200
  assert response.json()["spiking_temporal_forecast"] == 72.5


@pytest.mark.django_db
def test_latest_training_ignores_spiking_runs(client: Client) -> None:
  ensure_platform_status_page()
  TrainingRun.objects.create(
    average_sla=55.0,
    loss=0.02,
    is_platform=True,
    user=None,
    model_type=TrainingRun.MODEL_TYPE_SPIKING,
  )
  TrainingRun.objects.create(
    average_sla=98.5,
    loss=0.012,
    is_platform=True,
    user=None,
    model_type=TrainingRun.MODEL_TYPE_SLA,
  )

  response = client.get("/api/v1/ml/latest")
  assert response.status_code == 200
  assert response.json()["average_sla"] == 98.5
