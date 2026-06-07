import torch
import torch.nn as nn
import torch.optim as optim
from ninja import Router, Schema
from ninja.errors import HttpError
from monitor.models import Endpoints, StatusPage
from model.models import TrainingRun
from model.services import train_tenant_sla
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

@router.api_operation(["GET", "POST"], "/train", response=TrainOut)
def train_model(request, status_page_id: Optional[str] = None):
    status_page = None
    if status_page_id:
        try:
            status_page = StatusPage.objects.get(id=status_page_id)
        except (StatusPage.DoesNotExist, ValueError):
            raise HttpError(404, "Status page not found")
    else:
        status_page = StatusPage.objects.filter(slug="platform-status").first()

    if not status_page:
        raise HttpError(400, "No status page available for training")

    run = train_tenant_sla(status_page)
    if not run:
        raise HttpError(400, f"No data available for training status page '{status_page.title}'")

    return {
        'status': 'success',
        'message': f"Model trained successfully for tenant '{status_page.title}'",
        'average_sla': run.average_sla,
        'loss': run.loss,
        'run_id': str(run.id)
    }

@router.get("/latest", response=LatestRunOut)
def get_latest_training(request, status_page_id: Optional[str] = None):
    if status_page_id:
        run = TrainingRun.objects.filter(status_page_id=status_page_id).first()
    else:
        default_page = StatusPage.objects.filter(slug="platform-status").first()
        if default_page:
            run = TrainingRun.objects.filter(status_page=default_page).first()
        else:
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
