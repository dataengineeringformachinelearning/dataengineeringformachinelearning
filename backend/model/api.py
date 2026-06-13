import datetime

from monitor.models import StatusPage
from ninja import Router, Schema
from ninja.errors import HttpError

from model.models import TrainingRun
from model.services import train_tenant_sla

router = Router()


class TrainOut(Schema):
  status: str
  message: str | None = None
  average_sla: float | None = None
  loss: float | None = None
  run_id: str | None = None


class LatestRunOut(Schema):
  status: str
  message: str | None = None
  average_sla: float | None = None
  loss: float | None = None
  created_at: datetime.datetime | None = None


@router.api_operation(["GET", "POST"], "/train", response=TrainOut)
def train_model(request, status_page_id: str | None = None):
  status_page = None
  if status_page_id:
    try:
      status_page = StatusPage.objects.get(id=status_page_id)
    except (StatusPage.DoesNotExist, ValueError):
      raise HttpError(404, "Status page not found") from None
  else:
    status_page = StatusPage.objects.filter(slug="platform-status").first()

  if not status_page:
    raise HttpError(400, "No status page available for training")

  run = train_tenant_sla(status_page)
  if not run:
    raise HttpError(400, f"No data available for training status page '{status_page.title}'")

  return {
    "status": "success",
    "message": f"Model trained successfully for tenant '{status_page.title}'",
    "average_sla": run.average_sla,
    "loss": run.loss,
    "run_id": str(run.id),
  }


@router.get("/latest", response=LatestRunOut)
def get_latest_training(request, status_page_id: str | None = None):
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
      "status": "success",
      "average_sla": run.average_sla,
      "loss": run.loss,
      "created_at": run.created_at,
    }
  else:
    return {"status": "success", "average_sla": None, "message": "No training runs available"}


from model.models import ThreatReport
from model.services import train_threat_model


class ThreatReportOut(Schema):
  status: str
  anomaly_score: float | None = None
  top_location: str | None = None
  location_weight: float | None = None
  suspicious_ratio: float | None = None
  created_at: datetime.datetime | None = None
  message: str | None = None


@router.post("/threat-intel/train", response=ThreatReportOut)
def train_threat_intel(request):
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")

  report = train_threat_model(request.user)
  return {
    "status": "success",
    "anomaly_score": report.anomaly_score,
    "top_location": report.top_location,
    "location_weight": report.location_weight,
    "suspicious_ratio": report.suspicious_ratio,
    "created_at": report.created_at,
  }


@router.get("/threat-intel/report", response=ThreatReportOut)
def get_threat_report(request, status_page_id: str | None = None):
  report = None
  if request.user.is_authenticated:
    report = ThreatReport.objects.filter(user=request.user).first()

  if not report:
    report = ThreatReport.objects.first()

  if report:
    return {
      "status": "success",
      "anomaly_score": report.anomaly_score,
      "top_location": report.top_location,
      "location_weight": report.location_weight,
      "suspicious_ratio": report.suspicious_ratio,
      "created_at": report.created_at,
    }
  else:
    from django.contrib.auth.models import User

    default_user = User.objects.first()
    if default_user:
      report = train_threat_model(default_user)
      return {
        "status": "success",
        "anomaly_score": report.anomaly_score,
        "top_location": report.top_location,
        "location_weight": report.location_weight,
        "suspicious_ratio": report.suspicious_ratio,
        "created_at": report.created_at,
      }
    return {"status": "success", "message": "No threat intelligence reports available"}
