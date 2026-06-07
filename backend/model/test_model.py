import pytest
from monitor.models import Endpoints
from model.models import TrainingRun
import datetime

@pytest.mark.django_db
def test_train_model_no_data(client):
    response = client.post("/api/v1/model/train")
    assert response.status_code == 400
    assert "No data available for training" in response.json()["detail"]

@pytest.mark.django_db
def test_train_model_success(client):
    Endpoints.objects.create(
        url="http://test.com",
        status_code=200,
        response_time=datetime.timedelta(milliseconds=150),
        is_active=True
    )
    Endpoints.objects.create(
        url="http://test.com",
        status_code=500,
        response_time=datetime.timedelta(milliseconds=1000),
        is_active=False
    )
    
    response = client.post("/api/v1/model/train")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "loss" in data
    assert "average_sla" in data
    assert TrainingRun.objects.count() == 1

@pytest.mark.django_db
def test_get_latest_training(client):
    # No runs initially
    response = client.get("/api/v1/model/latest")
    assert response.status_code == 200
    assert response.json()["average_sla"] is None
    
    # Create a run
    TrainingRun.objects.create(
        average_sla=98.5,
        loss=0.012
    )
    
    response = client.get("/api/v1/model/latest")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["average_sla"] == 98.5
    assert data["loss"] == 0.012
