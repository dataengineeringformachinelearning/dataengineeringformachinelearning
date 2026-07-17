import datetime
import math
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from account.platform import ensure_platform_status_page
from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import Client
from monitor.models import BenchmarkRun, Endpoints, MonitoredService, StatusPage, UserProfile

from ml.ml_services import (
  SpikingTemporalForecaster,
  _benchmark_sla_model,
  _benchmark_threat_model,
  _publish_benchmark_to_ui,
  _publish_model_artifact,
)
from ml.models import ThreatReport, TrainingRun


def test_spiking_temporal_forecaster_returns_one_prediction_per_sequence() -> None:
  torch = pytest.importorskip("torch")
  model = SpikingTemporalForecaster()

  predictions = model(torch.zeros((4, 8, model.FEATURE_DIM), dtype=torch.float32))

  assert predictions.shape == (4, 1)


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
    patch(
      "ml.management.commands.train_all_models.train_platform_threat_model",
      return_value={"status": "trained"},
    ),
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


def test_required_hugging_face_publish_config_cannot_be_silently_skipped(
  monkeypatch: pytest.MonkeyPatch,
) -> None:
  monkeypatch.setenv("HF_MODEL_PUBLISH_REQUIRED", "true")
  monkeypatch.delenv("HF_TOKEN", raising=False)
  monkeypatch.delenv("HF_REPO_ID", raising=False)

  with pytest.raises(RuntimeError, match="not configured"):
    _publish_model_artifact(
      "/tmp/model.pt",
      path_in_repo="models/model.pt",
      model_label="test model",
    )


def test_hugging_face_upload_failure_is_propagated(monkeypatch: pytest.MonkeyPatch) -> None:
  monkeypatch.setenv("HF_MODEL_PUBLISH_REQUIRED", "true")
  monkeypatch.setenv("HF_TOKEN", "test-token")
  monkeypatch.setenv("HF_REPO_ID", "test-owner/test-models")

  with patch("huggingface_hub.HfApi") as api_class:
    api_class.return_value.upload_file.side_effect = RuntimeError("Hub unavailable")
    with pytest.raises(RuntimeError, match="Failed to publish test model"):
      _publish_model_artifact(
        "/tmp/model.pt",
        path_in_repo="models/model.pt",
        model_label="test model",
      )


def test_hugging_face_commit_message_does_not_expose_model_label(
  monkeypatch: pytest.MonkeyPatch,
) -> None:
  monkeypatch.setenv("HF_TOKEN", "test-token")
  monkeypatch.setenv("HF_REPO_ID", "test-owner/test-models")

  with patch("huggingface_hub.HfApi") as api_class:
    _publish_model_artifact(
      "/tmp/model.pt",
      path_in_repo="sla_models/hashed-tenant.pt",
      model_label="private-username SLA model",
    )

  upload_call = api_class.return_value.upload_file.call_args.kwargs
  assert upload_call["commit_message"] == ("Publish model artifact: sla_models/hashed-tenant.pt")
  assert "private-username" not in upload_call["commit_message"]


def test_benchmark_projection_uses_named_firestore_database() -> None:
  with patch("firebase_admin.firestore.client") as firestore_client:
    _publish_benchmark_to_ui({}, is_platform=True)

  firestore_client.assert_called_once_with(database_id="deml")
  firestore_client.return_value.collection.assert_called_once_with("ml_benchmarks")


def test_required_benchmark_projection_failure_is_propagated(
  monkeypatch: pytest.MonkeyPatch,
) -> None:
  monkeypatch.setenv("FIRESTORE_BENCHMARK_PUBLISH_REQUIRED", "true")

  with (
    patch("firebase_admin.firestore.client", side_effect=RuntimeError("Firestore unavailable")),
    pytest.raises(RuntimeError, match="Failed to publish ML benchmark projection"),
  ):
    _publish_benchmark_to_ui({}, is_platform=True)


@pytest.mark.django_db
def test_daily_training_command_propagates_partial_failures() -> None:
  with (
    patch(
      "ml.management.commands.train_all_models.train_platform_threat_model",
      return_value={"status": "trained"},
    ),
    patch(
      "ml.management.commands.train_all_models.train_tenant_sla",
      side_effect=RuntimeError("publish failed"),
    ),
    patch(
      "ml.management.commands.train_all_models.train_threat_model",
      return_value=SimpleNamespace(anomaly_score=0.25),
    ) as threat_model,
    patch(
      "ml.management.commands.train_all_models.train_spiking_temporal_forecaster",
      return_value=None,
    ),
    patch(
      "ml.management.commands.train_all_models.run_benchmark_suite", return_value={}
    ) as benchmark_suite,
    patch("ml.ml_services.train_ces_model", return_value={"status": "trained"}),
    pytest.raises(CommandError, match="1 failed step"),
  ):
    call_command("train_all_models")

  threat_model.assert_called_once_with(None, is_platform=True)
  benchmark_suite.assert_called_once_with(is_platform=True)
