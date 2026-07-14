import datetime
import math
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from account.platform import ensure_platform_status_page
from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import Client
from monitor.models import BenchmarkRun, Endpoints, MonitoredService, StatusPage, UserProfile

from ml.ml_services import _benchmark_sla_model, _benchmark_threat_model
from ml.models import ThreatReport, TrainingRun


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


@pytest.mark.django_db
def test_sla_benchmark_compares_forecast_with_observed_availability() -> None:
  TrainingRun.objects.create(
    average_sla=80.0,
    loss=0.01,
    is_platform=True,
    user=None,
    model_type=TrainingRun.MODEL_TYPE_SLA,
  )
  Endpoints.objects.create(
    url="https://healthy.example",
    status_code=200,
    response_time=datetime.timedelta(milliseconds=100),
    is_active=True,
    is_platform=True,
    user=None,
  )
  Endpoints.objects.create(
    url="https://failed.example",
    status_code=503,
    response_time=datetime.timedelta(milliseconds=900),
    is_active=False,
    is_platform=True,
    user=None,
  )

  mae, rmse, accuracy, dataset_size = _benchmark_sla_model(is_platform=True)

  assert mae == pytest.approx(0.5)
  assert rmse == pytest.approx(math.sqrt(0.34))
  assert accuracy == pytest.approx(0.5)
  assert dataset_size == 2


@pytest.mark.django_db
def test_threat_benchmark_uses_observed_suspicious_ratio() -> None:
  ThreatReport.objects.create(
    is_platform=True,
    anomaly_score=0.8,
    suspicious_ratio=0.6,
  )
  ThreatReport.objects.create(
    is_platform=True,
    anomaly_score=0.2,
    suspicious_ratio=0.4,
  )

  mae, rmse, accuracy, dataset_size = _benchmark_threat_model(is_platform=True)

  assert mae == pytest.approx(0.2)
  assert rmse == pytest.approx(0.2)
  assert accuracy == pytest.approx(1.0)
  assert dataset_size == 2


@pytest.mark.django_db
def test_public_benchmark_feed_exposes_platform_scope_only(client: Client) -> None:
  user = User.objects.create_user(username="private-benchmark", password="password")
  BenchmarkRun.objects.create(
    is_platform=True,
    model_type="sla",
    mae=0.1,
    rmse=0.2,
    accuracy=0.9,
    training_duration_seconds=1.0,
    dataset_size=10,
    benchmark_score=0.8,
  )
  BenchmarkRun.objects.create(
    user=user,
    is_platform=False,
    model_type="threat",
    mae=0.9,
    rmse=0.9,
    accuracy=0.1,
    training_duration_seconds=1.0,
    dataset_size=2,
    benchmark_score=0.1,
  )

  response = client.get("/api/v1/system-status/benchmarks")

  assert response.status_code == 200
  payload = response.json()
  assert len(payload) == 1
  assert payload[0]["model_type"] == "sla"


@pytest.mark.django_db
def test_daily_training_command_benchmarks_each_account_and_platform() -> None:
  user = User.objects.create_user(username="scheduled-benchmark", password="password")
  UserProfile.objects.get_or_create(user=user)

  with (
    patch("ml.management.commands.train_all_models.train_tenant_sla", return_value=None),
    patch(
      "ml.management.commands.train_all_models.train_threat_model",
      return_value=SimpleNamespace(anomaly_score=0.25),
    ),
    patch(
      "ml.management.commands.train_all_models.train_spiking_temporal_forecaster",
      return_value=None,
    ),
    patch("ml.management.commands.train_all_models.run_benchmark_suite") as benchmark_suite,
    patch("ml.ml_services.train_ces_model", return_value={"status": "trained"}),
  ):
    benchmark_suite.return_value = {"sla": {}, "threat": {}}
    call_command("train_all_models")

  benchmark_suite.assert_any_call(user=user, is_platform=False)
  benchmark_suite.assert_any_call(is_platform=True)
