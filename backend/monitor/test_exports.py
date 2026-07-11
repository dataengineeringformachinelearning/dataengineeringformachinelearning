"""Tests for analytics export jobs and RustFS client integration."""

from __future__ import annotations

from typing import Any
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone

from monitor.models import AggregatedAnalytics, ExportJob, UserProfile
from monitor.services.exports import process_export_job, render_export_bytes

User = get_user_model()


@pytest.fixture
def export_user(db: Any) -> Any:
  user = User.objects.create_user(username="exporter", password="x")
  UserProfile.objects.create(user=user, role="Operator")
  return user


@pytest.mark.django_db
def test_render_csv_and_pdf(export_user: Any) -> None:
  job = ExportJob(
    user=export_user,
    account_id=export_user.profile.account_id,
    kind=ExportJob.Kind.ANALYTICS,
    format=ExportJob.Format.CSV,
  )
  rows = [{"total_requests": 10, "avg_latency_ms": 12.5}]
  body, ctype, name = render_export_bytes(job, rows)
  assert "total_requests" in body.decode()
  assert ctype.startswith("text/csv")
  assert name.endswith(".csv")

  job.format = ExportJob.Format.PDF
  pdf_body, pdf_ctype, pdf_name = render_export_bytes(job, rows)
  assert pdf_body.startswith(b"%PDF")
  assert pdf_ctype == "application/pdf"
  assert pdf_name.endswith(".pdf")


@pytest.mark.django_db
def test_process_export_job_uploads(export_user: Any, settings: Any) -> None:
  settings.RUSTFS_ENDPOINT = "http://rustfs:9000"
  settings.RUSTFS_ACCESS_KEY = "k"
  settings.RUSTFS_SECRET_KEY = "s"  # pragma: allowlist secret
  settings.RUSTFS_BUCKET = "deml-exports"
  settings.RUSTFS_REGION = "us-east-1"
  settings.RUSTFS_ADDRESSING_STYLE = "path"

  AggregatedAnalytics.objects.create(
    user=export_user,
    timestamp=timezone.now(),
    total_requests=42,
    avg_latency_ms=9.0,
  )
  job = ExportJob.objects.create(
    user=export_user,
    account_id=export_user.profile.account_id,
    kind=ExportJob.Kind.ANALYTICS,
    format=ExportJob.Format.JSON,
    status=ExportJob.Status.QUEUED,
  )

  with (
    patch("monitor.services.exports.is_configured", return_value=True),
    patch("monitor.services.exports.ensure_bucket"),
    patch(
      "monitor.services.exports.put_bytes",
      return_value="s3://deml-exports/accounts/x/exports/y/z.json",
    ) as put,
  ):
    result = process_export_job(str(job.id))

  result.refresh_from_db()
  assert result.status == ExportJob.Status.READY
  assert result.byte_size > 0
  assert result.checksum_sha256
  put.assert_called_once()


@pytest.mark.django_db
def test_create_export_api_requires_storage(
  export_user: Any, client: Client, settings: Any
) -> None:
  settings.RUSTFS_ENDPOINT = ""
  settings.RUSTFS_ACCESS_KEY = ""
  settings.RUSTFS_SECRET_KEY = ""
  client.force_login(export_user)
  # API uses Firebase auth in prod; for Django test client we hit the view via ninja
  # through the permission layer — force_login may not satisfy require_auth.
  # Unit-level create path covered by service tests; API smoke via auth bypass patch.
  with patch("monitor.routers.exports.require_auth", return_value=export_user):
    with patch("monitor.routers.exports.is_configured", return_value=False):
      from ninja.errors import HttpError

      from monitor.routers.exports import ExportCreateIn, create_export

      with pytest.raises(HttpError) as exc:
        create_export(object(), ExportCreateIn(kind="analytics", format="csv", days=7))
      assert exc.value.status_code == 503
