"""Authenticated analytics export API (RustFS-backed artifacts)."""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any
from urllib.parse import urlencode

from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse, HttpResponse
from django.utils import timezone
from ninja import Router, Schema
from ninja.errors import HttpError
from utils.object_storage import (
  ObjectStorageNotConfiguredError,
  get_object_stream,
  is_configured,
)
from utils.permissions import require_auth

from monitor.models import ExportJob
from monitor.services.exports import EXPORT_MAX_ATTEMPTS, expire_export_job

logger = logging.getLogger(__name__)
router = Router(tags=["exports"])
DOWNLOAD_TOKEN_SALT = "monitor.exports.download.v1"
DOWNLOAD_TOKEN_TTL_SECONDS = 900
MAX_ACTIVE_EXPORTS_PER_USER = 3
MAX_EXPORTS_PER_USER_PER_HOUR = 20


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
  attempts: int
  next_attempt_at: str | None = None
  retrying: bool
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
  retrying = job.status == ExportJob.Status.FAILED and job.attempts < EXPORT_MAX_ATTEMPTS
  return ExportJobOut(
    id=str(job.id),
    kind=job.kind,
    format=job.format,
    status=job.status,
    byte_size=job.byte_size,
    content_type=job.content_type or "",
    error=job.error or "",
    attempts=job.attempts,
    next_attempt_at=job.next_attempt_at.isoformat() if job.next_attempt_at else None,
    retrying=retrying,
    created_at=job.created_at.isoformat(),
    completed_at=job.completed_at.isoformat() if job.completed_at else None,
    expires_at=job.expires_at.isoformat() if job.expires_at else None,
    download_ready=job.status == ExportJob.Status.READY and bool(job.object_key),
  )


@router.get("", response=list[ExportJobOut])
def list_exports(request: Any) -> list[ExportJobOut]:
  user = require_auth(request)
  jobs = ExportJob.objects.filter(user=user).order_by("-created_at")[:50]
  return [_serialize(job) for job in jobs]


@router.post("", response=ExportJobOut)
def create_export(request: Any, payload: ExportCreateIn) -> ExportJobOut:
  user = require_auth(request)
  kind = (payload.kind or ExportJob.Kind.ANALYTICS).lower()
  fmt = (payload.format or ExportJob.Format.CSV).lower()
  if kind not in ExportJob.Kind.values:
    raise HttpError(400, f"Invalid kind. Allowed: {', '.join(ExportJob.Kind.values)}")
  if fmt not in ExportJob.Format.values:
    raise HttpError(400, f"Invalid format. Allowed: {', '.join(ExportJob.Format.values)}")

  site_url = str(payload.site_url or "").strip()
  site_scoped_kinds = {ExportJob.Kind.ANALYTICS, ExportJob.Kind.LIGHTHOUSE}
  if site_url and kind not in site_scoped_kinds:
    raise HttpError(400, "site_url is supported only for analytics and lighthouse exports")

  if not is_configured():
    raise HttpError(
      503,
      "Export storage is not configured (set RUSTFS_ENDPOINT and credentials)",
    )

  requested_days = int(payload.days or 7)
  max_days = 30 if kind == ExportJob.Kind.LIGHTHOUSE or site_url else 90
  days = max(1, min(requested_days, max_days))
  params: dict[str, Any] = {"days": days}
  if site_url:
    params["site_url"] = site_url

  # A stable per-user row serializes quota checks with job creation. Without
  # this lock, concurrent requests can both observe capacity and exceed the
  # active/hourly limits before either insert becomes visible to the other.
  user_model = get_user_model()
  with transaction.atomic():
    try:
      locked_user = user_model.objects.select_for_update().get(pk=user.pk)
    except user_model.DoesNotExist as exc:
      raise HttpError(409, "Account deletion is already in progress") from exc
    profile = getattr(locked_user, "profile", None)
    if not profile or not profile.account_id:
      raise HttpError(400, "Account profile not provisioned")

    active_count = (
      ExportJob.objects.filter(user=locked_user)
      .filter(
        Q(status__in=[ExportJob.Status.QUEUED, ExportJob.Status.RUNNING])
        | Q(status=ExportJob.Status.FAILED, attempts__lt=EXPORT_MAX_ATTEMPTS)
      )
      .count()
    )
    if active_count >= MAX_ACTIVE_EXPORTS_PER_USER:
      raise HttpError(429, "Too many active exports; wait for an existing job to finish")
    recent_count = ExportJob.objects.filter(
      user=locked_user,
      created_at__gte=timezone.now() - timedelta(hours=1),
    ).count()
    if recent_count >= MAX_EXPORTS_PER_USER_PER_HOUR:
      raise HttpError(429, "Hourly export limit reached")

    job = ExportJob.objects.create(
      user=locked_user,
      account_id=profile.account_id,
      kind=kind,
      format=fmt,
      params=params,
      status=ExportJob.Status.QUEUED,
    )
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
    expire_export_job(job)
    raise HttpError(410, "Export expired")

  expires_in = DOWNLOAD_TOKEN_TTL_SECONDS
  token = signing.dumps(
    {
      "job_id": str(job.id),
      "object_key": job.object_key,
      "checksum": job.checksum_sha256,
    },
    salt=DOWNLOAD_TOKEN_SALT,
    compress=True,
  )
  query = urlencode({"token": token})
  backend_url = (getattr(settings, "BACKEND_URL", "") or request.build_absolute_uri("/")).rstrip(
    "/"
  )
  url = f"{backend_url}/api/v1/exports/{job.id}/content?{query}"
  filename = job.object_key.rsplit("/", 1)[-1]
  return ExportDownloadOut(
    url=url,
    expires_in=expires_in,
    content_type=job.content_type or "application/octet-stream",
    filename_hint=filename,
  )


@router.get("/{job_id}/content")
def stream_export(request: Any, job_id: str, token: str) -> HttpResponse:
  """Stream a private RustFS object through a short-lived signed application URL."""
  try:
    payload = signing.loads(
      token,
      salt=DOWNLOAD_TOKEN_SALT,
      max_age=DOWNLOAD_TOKEN_TTL_SECONDS,
    )
  except signing.SignatureExpired as exc:
    raise HttpError(410, "Download link expired") from exc
  except signing.BadSignature as exc:
    raise HttpError(403, "Invalid download link") from exc

  try:
    job = ExportJob.objects.get(id=job_id)
  except (ExportJob.DoesNotExist, ValueError) as exc:
    raise HttpError(404, "Export not found") from exc

  if not isinstance(payload, dict) or payload.get("job_id") != str(job.id):
    raise HttpError(403, "Invalid download link")
  if payload.get("object_key") != job.object_key or payload.get("checksum") != job.checksum_sha256:
    raise HttpError(403, "Invalid download link")
  if job.status == ExportJob.Status.EXPIRED:
    raise HttpError(410, "Export expired")
  if job.status != ExportJob.Status.READY or not job.object_key:
    raise HttpError(409, f"Export not ready (status={job.status})")
  if job.expires_at and job.expires_at < timezone.now():
    expire_export_job(job)
    raise HttpError(410, "Export expired")

  try:
    stored = get_object_stream(key=job.object_key)
  except ObjectStorageNotConfiguredError as exc:
    raise HttpError(503, "Export storage is not configured") from exc
  except (BotoCoreError, ClientError) as exc:
    logger.exception("export artifact read failed id=%s", job.id)
    raise HttpError(502, "Export artifact is temporarily unavailable") from exc

  filename = job.object_key.rsplit("/", 1)[-1]
  response = FileResponse(
    stored.body,
    as_attachment=True,
    filename=filename,
    content_type=job.content_type or stored.content_type,
  )
  if stored.content_length:
    response["Content-Length"] = str(stored.content_length)
  response["Cache-Control"] = "private, no-store"
  response["Referrer-Policy"] = "no-referrer"
  response["X-Content-Type-Options"] = "nosniff"
  return response
