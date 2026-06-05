import torch
import torch.nn as nn
import torch.optim as optim
from ninja import Router, Schema
from ninja.errors import HttpError
from monitor.models import Endpoints
from model.models import TrainingRun
import datetime
from typing import Optional

router = Router()

class TrainOut(Schema):
    status: str
    message: Optional[str] = None
    average_sla: Optional[float] = None
    loss: Optional[float] = None
    run_id: Optional[str] = None

class LatestRunOut(Schema):
    status: str
    message: Optional[str] = None
    average_sla: Optional[float] = None
    loss: Optional[float] = None
    created_at: Optional[datetime.datetime] = None

class SLAPredictor(nn.Module):
    def __init__(self):
        super(SLAPredictor, self).__init__()
        self.fc1 = nn.Linear(3, 16)
        self.fc2 = nn.Linear(16, 1)
        self.relu = nn.ReLU()

    def forward(self, x):
        x = self.relu(self.fc1(x))
        x = self.fc2(x)
        return x

@router.api_operation(["GET", "POST"], "/train", response=TrainOut)
def train_model(request):
    endpoints = Endpoints.objects.all()
    
    if not endpoints:
        raise HttpError(400, "No data available for training")

    x_data = []
    y_data = []

    for ep in endpoints:
        status = float(ep.status_code) / 100.0
        resp_time = ep.response_time.total_seconds()
        active = 1.0 if ep.is_active else 0.0

        x_data.append([status, resp_time, active])

        target_sla = 100.0
        if not ep.is_active or ep.status_code >= 400:
            target_sla = 0.0
        else:
            target_sla = max(0.0, 100.0 - (resp_time * 5.0))
        
        y_data.append([target_sla])

    X = torch.tensor(x_data, dtype=torch.float32)
    Y = torch.tensor(y_data, dtype=torch.float32)

    model = SLAPredictor()
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.01)

    final_loss = 0.0
    for epoch in range(50):
        optimizer.zero_grad()
        outputs = model(X)
        loss = criterion(outputs, Y)
        loss.backward()
        optimizer.step()
        final_loss = loss.item()

    model.eval()
    with torch.no_grad():
        preds = model(X)
        avg_predicted_sla = preds.mean().item()

    run = TrainingRun.objects.create(
        average_sla=avg_predicted_sla,
        loss=final_loss
    )

    return {
        'status': 'success',
        'message': 'Model trained successfully',
        'average_sla': avg_predicted_sla,
        'loss': final_loss,
        'run_id': str(run.id)
    }

@router.get("/latest", response=LatestRunOut)
def get_latest_training(request):
    run = TrainingRun.objects.first()
    if run:
        return {
            'status': 'success',
            'average_sla': run.average_sla,
            'loss': run.loss,
            'created_at': run.created_at
        }
    else:
        return {
            'status': 'success',
            'average_sla': None,
            'message': 'No training runs available'
        }
