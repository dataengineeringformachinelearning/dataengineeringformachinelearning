"""Tests for analytics export jobs and RustFS client integration."""

from __future__ import annotations

import csv
import io
import re
from datetime import timedelta
from typing import Any
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import resolve
from django.utils import timezone
from ninja.errors import HttpError
from utils.object_storage import StoredObject

from monitor.models import (
  AggregatedAnalytics,
  Endpoints,
  ExportJob,
  LighthouseScan,
  ReportArchive,
  StatusPage,
  UserProfile,
)
from monitor.services.exports import (
  EXPIRED_METADATA_RETENTION_DAYS,
  EXPORT_MAX_ATTEMPTS,
  _rows_for_job,
  _to_csv,
  expire_export_artifacts,
  process_export_job,
  process_queued_exports,
  render_export_bytes,
)
from monitor.services.pdf_report import _column_widths

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
  assert b"/MediaBox [0 0 792 612]" in pdf_body
  assert b"/Lang (en-US)" in pdf_body
  assert b"/MarkInfo << /Marked true >>" in pdf_body
  assert b"/StructTreeRoot" in pdf_body
  assert b"/S /H1" in pdf_body
  assert b"/S /Table" in pdf_body
  assert b"/Title (Analytics Report)" in pdf_body
  assert b"(DEML)" in pdf_body
  assert b"(REPORT DATA)" in pdf_body
  assert b"(DEML / CONFIDENTIAL OPERATIONAL REPORT)" in pdf_body


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
    second_result = process_export_job(str(job.id))

  result.refresh_from_db()
  assert result.status == ExportJob.Status.READY
  assert result.byte_size > 0
  assert result.checksum_sha256
  assert second_result.status == ExportJob.Status.READY
  put.assert_called_once()


@pytest.mark.django_db
def test_analytics_report_merges_daily_archive_hourly_fallback_and_gap(
  export_user: Any,
) -> None:
  today = timezone.localdate()
  ReportArchive.objects.create(
    user=export_user,
    is_platform=False,
    report_date=today - timedelta(days=1),
    period_start=timezone.now() - timedelta(days=1),
    period_end=timezone.now(),
    total_requests=100,
    avg_latency_ms=12.0,
    p99_latency_ms=20.0,
    error_rate_percent=1.0,
    threats_detected=2,
    active_incidents=1,
    unique_visitors=4,
  )
  AggregatedAnalytics.objects.create(
    user=export_user,
    is_platform=False,
    timestamp=timezone.now().replace(minute=0, second=0, microsecond=0),
    bucket_size="1h",
    total_requests=25,
    avg_latency_ms=8.0,
    p99_latency_ms=15.0,
    error_rate_percent=4.0,
    threats_detected=1,
    active_incidents=0,
    unique_visitors=3,
  )
  job = ExportJob.objects.create(
    user=export_user,
    account_id=export_user.profile.account_id,
    params={"days": 3},
  )

  rows = _rows_for_job(job)

  assert len(rows) == 3
  assert [row["report_date"] for row in rows] == [
    today.isoformat(),
    (today - timedelta(days=1)).isoformat(),
    (today - timedelta(days=2)).isoformat(),
  ]
  assert [row["coverage"] for row in rows] == [
    "hourly_fallback",
    "daily_rollup",
    "no_data",
  ]
  assert rows[0]["total_requests"] == 25
  assert rows[1]["total_requests"] == 100


@pytest.mark.django_db
def test_analytics_report_rebuilds_partial_same_day_archive(export_user: Any) -> None:
  today = timezone.localdate()
  day_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
  ReportArchive.objects.create(
    user=export_user,
    is_platform=False,
    report_date=today,
    period_start=day_start,
    period_end=day_start + timedelta(days=1),
    total_requests=10,
    summary_json={"aggregation_version": 2, "hourly_bucket_count": 1},
  )
  for hour, requests in ((1, 10), (2, 20)):
    AggregatedAnalytics.objects.create(
      user=export_user,
      is_platform=False,
      timestamp=day_start + timedelta(hours=hour),
      bucket_size="1h",
      total_requests=requests,
      avg_latency_ms=5.0,
    )
  job = ExportJob.objects.create(
    user=export_user,
    account_id=export_user.profile.account_id,
    params={"days": 1},
  )

  rows = _rows_for_job(job)

  assert rows[0]["coverage"] == "hourly_fallback"
  assert rows[0]["total_requests"] == 30


@pytest.mark.django_db
def test_site_report_honors_selected_url(export_user: Any) -> None:
  selected_url = "https://selected.example/health"
  for url, status_code, active, latency_ms in (
    (selected_url, 404, True, 10),
    (selected_url, 503, False, 30),
    ("https://other.example/health", 503, False, 500),
  ):
    Endpoints.objects.create(
      user=export_user,
      is_platform=False,
      url=url,
      status_code=status_code,
      response_time=timedelta(milliseconds=latency_ms),
      is_active=active,
    )
  job = ExportJob.objects.create(
    user=export_user,
    account_id=export_user.profile.account_id,
    params={"days": 1, "site_url": selected_url},
  )

  rows = _rows_for_job(job)

  assert len(rows) == 1
  assert rows[0]["coverage"] == "raw_site"
  assert rows[0]["total_requests"] == 2
  assert rows[0]["error_rate_percent"] == 50.0
  assert rows[0]["p99_latency_ms"] == 30.0


@pytest.mark.django_db
def test_lighthouse_report_uses_durable_site_projection(export_user: Any) -> None:
  page = StatusPage.objects.create(
    user=export_user,
    title="Quality page",
    slug="quality-page",
  )
  selected_url = "https://selected.example/"
  for url, performance in ((selected_url, 99.0), ("https://other.example/", 12.0)):
    LighthouseScan.objects.create(
      status_page=page,
      user=export_user,
      account_id=export_user.profile.account_id,
      is_platform=False,
      url=url,
      scanned_at=timezone.now(),
      performance=performance,
      accessibility=98.0,
      best_practices=97.0,
      seo=96.0,
    )
  job = ExportJob.objects.create(
    user=export_user,
    account_id=export_user.profile.account_id,
    kind=ExportJob.Kind.LIGHTHOUSE,
    params={"days": 30, "site_url": selected_url.rstrip("/")},
  )

  rows = _rows_for_job(job)

  assert len(rows) == 1
  assert rows[0]["url"] == selected_url
  assert rows[0]["performance"] == 99.0


@pytest.mark.django_db
def test_pdf_report_paginates_visible_rows(export_user: Any) -> None:
  job = ExportJob(
    user=export_user,
    account_id=export_user.profile.account_id,
    kind=ExportJob.Kind.ANALYTICS,
    format=ExportJob.Format.PDF,
  )
  rows = [{"day": index, "requests": index * 10} for index in range(60)]

  with patch("monitor.services.pdf_report._column_widths", wraps=_column_widths) as column_widths:
    body, _content_type, _name = render_export_bytes(job, rows)

  page_count_match = re.search(rb"/Count (\d+)", body)
  assert page_count_match is not None
  page_count = int(page_count_match.group(1))
  assert page_count >= 2
  assert body.count(b"(REPORT DATA)") == page_count
  column_widths.assert_called_once()


@pytest.mark.django_db
def test_pdf_report_renders_themed_empty_state(export_user: Any) -> None:
  job = ExportJob(
    user=export_user,
    account_id=export_user.profile.account_id,
    kind=ExportJob.Kind.ANALYTICS,
    format=ExportJob.Format.PDF,
  )

  body, _content_type, _name = render_export_bytes(job, [])

  assert b"/Count 1" in body
  assert b"(No data for selected range)" in body


@pytest.mark.django_db
def test_pdf_report_preserves_winansi_location_text(export_user: Any) -> None:
  job = ExportJob(
    user=export_user,
    account_id=export_user.profile.account_id,
    kind=ExportJob.Kind.THREAT,
    format=ExportJob.Format.PDF,
  )

  body, _content_type, _name = render_export_bytes(
    job,
    [{"location": "São José", "analyst": "Zoë"}],
  )

  assert "São José".encode("cp1252") in body
  assert "Zoë".encode("cp1252") in body


def test_csv_neutralizes_spreadsheet_formulas() -> None:
  body = _to_csv(
    [
      {
        "title": '=HYPERLINK("https://attacker.invalid")',
        "safe": "ordinary text",
        "number": -42,
      }
    ]
  )
  row = next(csv.DictReader(io.StringIO(body.decode("utf-8"))))

  assert row["title"].startswith("'=")
  assert row["safe"] == "ordinary text"
  assert row["number"] == "-42"


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


@pytest.mark.django_db
def test_export_api_serializes_retry_state(export_user: Any) -> None:
  next_attempt_at = timezone.now() + timedelta(minutes=2)
  job = ExportJob.objects.create(
    user=export_user,
    account_id=export_user.profile.account_id,
    status=ExportJob.Status.FAILED,
    attempts=1,
    next_attempt_at=next_attempt_at,
    error="temporary storage outage",
  )

  from monitor.routers.exports import _serialize

  retrying = _serialize(job)
  assert retrying.attempts == 1
  assert retrying.next_attempt_at == next_attempt_at.isoformat()
  assert retrying.retrying is True

  job.attempts = EXPORT_MAX_ATTEMPTS
  job.next_attempt_at = None
  terminal = _serialize(job)
  assert terminal.attempts == EXPORT_MAX_ATTEMPTS
  assert terminal.next_attempt_at is None
  assert terminal.retrying is False


@pytest.mark.django_db
def test_create_export_api_applies_site_scope_and_day_caps(export_user: Any) -> None:
  from monitor.routers.exports import ExportCreateIn, create_export

  with (
    patch("monitor.routers.exports.require_auth", return_value=export_user),
    patch("monitor.routers.exports.is_configured", return_value=True),
  ):
    analytics = create_export(
      object(),
      ExportCreateIn(
        kind=ExportJob.Kind.ANALYTICS,
        format=ExportJob.Format.CSV,
        days=90,
        site_url="  https://selected.example/health  ",
      ),
    )
    analytics_job = ExportJob.objects.get(id=analytics.id)
    assert analytics_job.params == {
      "days": 30,
      "site_url": "https://selected.example/health",
    }
    analytics_job.status = ExportJob.Status.READY
    analytics_job.save(update_fields=["status"])

    lighthouse = create_export(
      object(),
      ExportCreateIn(
        kind=ExportJob.Kind.LIGHTHOUSE,
        format=ExportJob.Format.JSON,
        days=90,
      ),
    )
    lighthouse_job = ExportJob.objects.get(id=lighthouse.id)
    assert lighthouse_job.params == {"days": 30}
    lighthouse_job.status = ExportJob.Status.READY
    lighthouse_job.save(update_fields=["status"])

    threat = create_export(
      object(),
      ExportCreateIn(
        kind=ExportJob.Kind.THREAT,
        format=ExportJob.Format.JSON,
        days=90,
      ),
    )
    assert ExportJob.objects.get(id=threat.id).params == {"days": 90}

    with pytest.raises(HttpError) as exc:
      create_export(
        object(),
        ExportCreateIn(
          kind=ExportJob.Kind.VULNERABILITIES,
          format=ExportJob.Format.CSV,
          site_url="https://unsupported.example",
        ),
      )

  assert exc.value.status_code == 400
  assert "site_url" in str(exc.value)


@pytest.mark.django_db
def test_create_export_api_counts_retrying_failures_as_active(export_user: Any) -> None:
  for _index in range(3):
    ExportJob.objects.create(
      user=export_user,
      account_id=export_user.profile.account_id,
      status=ExportJob.Status.FAILED,
      attempts=1,
      next_attempt_at=timezone.now() + timedelta(minutes=1),
    )

  from monitor.routers.exports import ExportCreateIn, create_export

  with (
    patch("monitor.routers.exports.require_auth", return_value=export_user),
    patch("monitor.routers.exports.is_configured", return_value=True),
  ):
    with pytest.raises(HttpError) as exc:
      create_export(object(), ExportCreateIn())

  assert exc.value.status_code == 429
  assert "active exports" in str(exc.value)


@pytest.mark.django_db
def test_create_export_api_locks_user_during_quota_check(export_user: Any) -> None:
  from monitor.routers.exports import ExportCreateIn, create_export

  with (
    patch("monitor.routers.exports.require_auth", return_value=export_user),
    patch("monitor.routers.exports.is_configured", return_value=True),
    patch.object(
      User.objects,
      "select_for_update",
      wraps=User.objects.select_for_update,
    ) as select_for_update,
  ):
    create_export(object(), ExportCreateIn())

  select_for_update.assert_called_once_with()


@pytest.mark.django_db
def test_exports_collection_route_uses_canonical_trailing_slash() -> None:
  match = resolve("/api/v1/exports/")
  assert match.url_name == "list_exports"


@pytest.mark.django_db
def test_signed_backend_proxy_streams_private_artifact(
  export_user: Any,
  settings: Any,
) -> None:
  settings.BACKEND_URL = "https://backend.example.test"
  object_key = "accounts/a/exports/j/report.pdf"
  job = ExportJob.objects.create(
    user=export_user,
    account_id=export_user.profile.account_id,
    kind=ExportJob.Kind.ANALYTICS,
    format=ExportJob.Format.PDF,
    status=ExportJob.Status.READY,
    object_key=object_key,
    storage_uri=f"s3://deml-exports/{object_key}",
    checksum_sha256="a" * 64,
    content_type="application/pdf",
    expires_at=timezone.now() + timedelta(days=1),
  )

  from monitor.routers.exports import download_export, stream_export

  with patch("monitor.routers.exports.require_auth", return_value=export_user):
    download = download_export(object(), str(job.id))

  assert download.url.startswith(f"https://backend.example.test/api/v1/exports/{job.id}/content?")
  assert "railway.internal" not in download.url
  token = parse_qs(urlparse(download.url).query)["token"][0]
  stored = StoredObject(io.BytesIO(b"%PDF-report"), "application/pdf", 11)
  with patch("monitor.routers.exports.get_object_stream", return_value=stored) as get_object:
    response = stream_export(object(), str(job.id), token)

  assert b"".join(response.streaming_content) == b"%PDF-report"
  assert response["Content-Type"] == "application/pdf"
  assert response["Cache-Control"] == "private, no-store"
  assert response["Referrer-Policy"] == "no-referrer"
  get_object.assert_called_once_with(key=object_key)


@pytest.mark.django_db
def test_signed_backend_proxy_rejects_invalid_token(export_user: Any) -> None:
  job = ExportJob.objects.create(
    user=export_user,
    account_id=export_user.profile.account_id,
    status=ExportJob.Status.READY,
    object_key="accounts/a/exports/j/report.csv",
    checksum_sha256="b" * 64,
    expires_at=timezone.now() + timedelta(days=1),
  )

  from monitor.routers.exports import stream_export

  with pytest.raises(HttpError) as exc:
    stream_export(object(), str(job.id), "invalid")
  assert exc.value.status_code == 403


@pytest.mark.django_db
def test_export_retention_deletes_artifact_then_prunes_metadata(export_user: Any) -> None:
  now = timezone.now()
  artifact = ExportJob.objects.create(
    user=export_user,
    account_id=export_user.profile.account_id,
    status=ExportJob.Status.READY,
    object_key="accounts/a/exports/artifact/report.csv",
    storage_uri="s3://deml-exports/accounts/a/exports/artifact/report.csv",
    expires_at=now - timedelta(minutes=1),
  )
  stale_metadata = ExportJob.objects.create(
    user=export_user,
    account_id=export_user.profile.account_id,
    status=ExportJob.Status.EXPIRED,
    expires_at=now - timedelta(days=EXPIRED_METADATA_RETENTION_DAYS + 1),
  )
  fresh = ExportJob.objects.create(
    user=export_user,
    account_id=export_user.profile.account_id,
    status=ExportJob.Status.READY,
    object_key="accounts/a/exports/fresh/report.csv",
    expires_at=now + timedelta(days=1),
  )

  with patch("monitor.services.exports.delete_object") as delete:
    expired_count, metadata_deleted = expire_export_artifacts(now=now)

  assert expired_count == 1
  assert metadata_deleted == 1
  delete.assert_called_once_with(key="accounts/a/exports/artifact/report.csv")
  artifact.refresh_from_db()
  fresh.refresh_from_db()
  assert artifact.status == ExportJob.Status.EXPIRED
  assert artifact.object_key == ""
  assert artifact.storage_uri == ""
  assert not ExportJob.objects.filter(id=stale_metadata.id).exists()
  assert fresh.status == ExportJob.Status.READY


@pytest.mark.django_db
def test_export_retention_keeps_reference_when_delete_fails(export_user: Any) -> None:
  now = timezone.now()
  job = ExportJob.objects.create(
    user=export_user,
    account_id=export_user.profile.account_id,
    status=ExportJob.Status.READY,
    object_key="accounts/a/exports/retry/report.csv",
    storage_uri="s3://deml-exports/accounts/a/exports/retry/report.csv",
    expires_at=now - timedelta(minutes=1),
  )

  with patch("monitor.services.exports.delete_object", side_effect=RuntimeError("offline")):
    expired_count, metadata_deleted = expire_export_artifacts(now=now)

  job.refresh_from_db()
  assert (expired_count, metadata_deleted) == (0, 0)
  assert job.status == ExportJob.Status.READY
  assert job.object_key == "accounts/a/exports/retry/report.csv"


@pytest.mark.django_db
def test_failed_export_retries_then_succeeds(export_user: Any, settings: Any) -> None:
  settings.RUSTFS_ENDPOINT = "http://rustfs:9000"
  settings.RUSTFS_ACCESS_KEY = "k"
  settings.RUSTFS_SECRET_KEY = "s"  # pragma: allowlist secret
  settings.RUSTFS_USE_SSL = False
  job = ExportJob.objects.create(
    user=export_user,
    account_id=export_user.profile.account_id,
    kind=ExportJob.Kind.ANALYTICS,
    format=ExportJob.Format.JSON,
  )

  with (
    patch("monitor.services.exports.is_configured", return_value=True),
    patch("monitor.services.exports.ensure_bucket"),
    patch("monitor.services.exports.delete_object"),
    patch("monitor.services.exports.put_bytes", side_effect=RuntimeError("temporary outage")),
  ):
    first = process_export_job(str(job.id))

  first.refresh_from_db()
  assert first.status == ExportJob.Status.FAILED
  assert first.attempts == 1
  assert first.next_attempt_at is not None
  ExportJob.objects.filter(id=job.id).update(next_attempt_at=timezone.now() - timedelta(seconds=1))

  with (
    patch("monitor.services.exports.is_configured", return_value=True),
    patch("monitor.services.exports.ensure_bucket"),
    patch("monitor.services.exports.delete_object"),
    patch("monitor.services.exports.put_bytes", return_value="s3://deml-exports/recovered"),
  ):
    assert process_queued_exports(limit=1) == 1

  job.refresh_from_db()
  assert job.status == ExportJob.Status.READY
  assert job.attempts == 2
  assert job.next_attempt_at is None


@pytest.mark.django_db
def test_terminal_failed_export_metadata_is_pruned(export_user: Any) -> None:
  now = timezone.now()
  job = ExportJob.objects.create(
    user=export_user,
    account_id=export_user.profile.account_id,
    status=ExportJob.Status.FAILED,
    attempts=EXPORT_MAX_ATTEMPTS,
    completed_at=now - timedelta(days=EXPIRED_METADATA_RETENTION_DAYS + 1),
  )

  _expired, metadata_deleted = expire_export_artifacts(now=now)

  assert metadata_deleted == 1
  assert not ExportJob.objects.filter(id=job.id).exists()
