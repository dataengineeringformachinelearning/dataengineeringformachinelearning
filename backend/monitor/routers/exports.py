"""Authenticated analytics export API (RustFS-backed artifacts)."""

from __future__ import annotations

import logging
import threading
from typing import Any

from django.utils import timezone
from ninja import Router, Schema
from ninja.errors import HttpError
from utils.object_storage import generate_presigned_get, is_configured
from utils.permissions import require_auth

from monitor.models import ExportJob
from monitor.services.exports import process_export_job

logger = logging.getLogger(__name__)
router = Router(tags=["exports"])


class ExportCreateIn(Schema):
  kind: str = ExportJob.Kind.ANALYTICS
  format: str = ExportJob.Format.CSV
  days: int = 7
  site_url: str | None = None


class ExportJobOut(Schema):
  id: str
  kind: str
  format: str
  status: str
  byte_size: int
  content_type: str
  error: str
  created_at: str
  completed_at: str | None = None
  expires_at: str | None = None
  download_ready: bool


class ExportDownloadOut(Schema):
  url: str
  expires_in: int
  content_type: str
  filename_hint: str


def _serialize(job: ExportJob) -> ExportJobOut:
  return ExportJobOut(
    id=str(job.id),
    kind=job.kind,
    format=job.format,
    status=job.status,
    byte_size=job.byte_size,
    content_type=job.content_type or "",
    error=job.error or "",
    created_at=job.created_at.isoformat(),
    completed_at=job.completed_at.isoformat() if job.completed_at else None,
    expires_at=job.expires_at.isoformat() if job.expires_at else None,
    download_ready=job.status == ExportJob.Status.READY and bool(job.object_key),
  )


def _kick_async(job_id: str) -> None:
  def _run() -> None:
    try:
      process_export_job(job_id)
    except Exception:
      logger.exception("background export failed job_id=%s", job_id)

  thread = threading.Thread(target=_run, name=f"export-{job_id[:8]}", daemon=True)
  thread.start()


@router.get("", response=list[ExportJobOut])
def list_exports(request: Any) -> list[ExportJobOut]:
  user = require_auth(request)
  jobs = ExportJob.objects.filter(user=user).order_by("-created_at")[:50]
  return [_serialize(job) for job in jobs]


@router.post("", response=ExportJobOut)
def create_export(request: Any, payload: ExportCreateIn) -> ExportJobOut:
  user = require_auth(request)
  profile = getattr(user, "profile", None)
  if not profile or not profile.account_id:
    raise HttpError(400, "Account profile not provisioned")

  kind = (payload.kind or ExportJob.Kind.ANALYTICS).lower()
  fmt = (payload.format or ExportJob.Format.CSV).lower()
  if kind not in ExportJob.Kind.values:
    raise HttpError(400, f"Invalid kind. Allowed: {', '.join(ExportJob.Kind.values)}")
  if fmt not in ExportJob.Format.values:
    raise HttpError(400, f"Invalid format. Allowed: {', '.join(ExportJob.Format.values)}")

  if not is_configured():
    raise HttpError(
      503,
      "Export storage is not configured (set RUSTFS_ENDPOINT and credentials)",
    )

  days = max(1, min(int(payload.days or 7), 90))
  params: dict[str, Any] = {"days": days}
  if payload.site_url:
    params["site_url"] = payload.site_url

  job = ExportJob.objects.create(
    user=user,
    account_id=profile.account_id,
    kind=kind,
    format=fmt,
    params=params,
    status=ExportJob.Status.QUEUED,
  )
  _kick_async(str(job.id))
  return _serialize(job)


@router.get("/{job_id}", response=ExportJobOut)
def get_export(request: Any, job_id: str) -> ExportJobOut:
  user = require_auth(request)
  try:
    job = ExportJob.objects.get(id=job_id, user=user)
  except (ExportJob.DoesNotExist, ValueError) as exc:
    raise HttpError(404, "Export not found") from exc
  return _serialize(job)


@router.get("/{job_id}/download", response=ExportDownloadOut)
def download_export(request: Any, job_id: str) -> ExportDownloadOut:
  user = require_auth(request)
  try:
    job = ExportJob.objects.get(id=job_id, user=user)
  except (ExportJob.DoesNotExist, ValueError) as exc:
    raise HttpError(404, "Export not found") from exc

  if job.status == ExportJob.Status.EXPIRED:
    raise HttpError(410, "Export expired")
  if job.status != ExportJob.Status.READY or not job.object_key:
    raise HttpError(409, f"Export not ready (status={job.status})")

  if job.expires_at and job.expires_at < timezone.now():
    job.status = ExportJob.Status.EXPIRED
    job.save(update_fields=["status"])
    raise HttpError(410, "Export expired")

  expires_in = 900
  url = generate_presigned_get(key=job.object_key, expires_in=expires_in)
  filename = job.object_key.rsplit("/", 1)[-1]
  return ExportDownloadOut(
    url=url,
    expires_in=expires_in,
    content_type=job.content_type or "application/octet-stream",
    filename_hint=filename,
  )
