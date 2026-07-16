"""Build analytics export artifacts and store them in RustFS."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import logging
import math
from datetime import timedelta
from typing import Any, Final

import polars as pl
from django.db.models import Avg, Count, F, Max, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from utils.object_storage import (
  ObjectStorageNotConfiguredError,
  delete_object,
  ensure_bucket,
  export_object_key,
  is_configured,
  put_bytes,
)
from utils.retention import (
  EXPORT_ARTIFACT_RETENTION_DAYS,
  EXPORT_JOB_RETENTION_DAYS,
  REPORT_ARCHIVE_RETENTION_DAYS,
)
from utils.service_urls import endpoint_storage_url

from monitor.models import (
  AggregatedAnalytics,
  Endpoints,
  ExportJob,
  LighthouseScan,
  ReportArchive,
  ThreatIntelligence,
  Vulnerability,
)

logger = logging.getLogger(__name__)

DEFAULT_RETENTION_DAYS: Final[int] = EXPORT_ARTIFACT_RETENTION_DAYS
EXPIRED_METADATA_RETENTION_DAYS: Final[int] = EXPORT_JOB_RETENTION_DAYS
EXPORT_MAX_ATTEMPTS: Final[int] = 5
CONTENT_TYPES: Final[dict[str, str]] = {
  ExportJob.Format.CSV: "text/csv; charset=utf-8",
  ExportJob.Format.JSON: "application/json",
  ExportJob.Format.PARQUET: "application/vnd.apache.parquet",
  ExportJob.Format.PDF: "application/pdf",
}


def _empty_daily_analytics_row(report_date: Any) -> dict[str, Any]:
  return {
    "report_date": report_date.isoformat(),
    "total_requests": 0,
    "avg_latency_ms": 0.0,
    "p99_latency_ms": 0.0,
    "error_rate_percent": 0.0,
    "threats_detected": 0,
    "active_incidents": 0,
    "unique_visitors": 0,
    "coverage": "no_data",
  }


def _site_analytics_rows(job: ExportJob, *, days: int, site_url: str) -> list[dict[str, Any]]:
  """Build an accurate site-scoped report from the retained raw window."""
  retained_days = min(days, 30)
  today = timezone.localdate()
  first_date = today - timedelta(days=retained_days - 1)
  start = timezone.make_aware(timezone.datetime.combine(first_date, timezone.datetime.min.time()))
  lookup_urls = {
    site_url,
    endpoint_storage_url(site_url, is_platform=False),
  }
  base_qs = Endpoints.objects.filter(
    user=job.user,
    is_platform=False,
    url__in=lookup_urls,
    last_tested__gte=start,
  ).exclude(status_code=0)
  aggregates = (
    base_qs.annotate(report_date=TruncDate("last_tested"))
    .values("report_date")
    .annotate(
      total_requests=Count("id"),
      avg_latency=Avg("response_time"),
      max_latency=Max("response_time"),
      failed_requests=Count("id", filter=Q(is_active=False) | Q(status_code__gte=500)),
      unique_visitors=Count("ip_address", distinct=True),
    )
  )
  rows_by_date: dict[Any, dict[str, Any]] = {}
  for aggregate in aggregates:
    report_date = aggregate["report_date"]
    total_requests = int(aggregate["total_requests"] or 0)
    day_start = timezone.make_aware(
      timezone.datetime.combine(report_date, timezone.datetime.min.time())
    )
    day_end = day_start + timedelta(days=1)
    p99_latency_ms = 0.0
    if total_requests > 0:
      p99_index = max(0, math.ceil(total_requests * 0.99) - 1)
      p99_latency = (
        base_qs.filter(last_tested__gte=day_start, last_tested__lt=day_end)
        .order_by("response_time")
        .values_list("response_time", flat=True)[p99_index]
      )
      p99_latency_ms = round(p99_latency.total_seconds() * 1000.0, 2)
    avg_latency = aggregate["avg_latency"]
    failed_requests = int(aggregate["failed_requests"] or 0)
    rows_by_date[report_date] = {
      "report_date": report_date.isoformat(),
      "total_requests": total_requests,
      "avg_latency_ms": (round(avg_latency.total_seconds() * 1000.0, 2) if avg_latency else 0.0),
      "p99_latency_ms": p99_latency_ms,
      "error_rate_percent": (
        round((failed_requests / total_requests) * 100.0, 2) if total_requests else 0.0
      ),
      "threats_detected": 0,
      "active_incidents": 0,
      "unique_visitors": int(aggregate["unique_visitors"] or 0),
      "coverage": "raw_site",
    }

  return [
    rows_by_date.get(
      today - timedelta(days=offset),
      _empty_daily_analytics_row(today - timedelta(days=offset)),
    )
    for offset in range(days)
  ]


def _daily_analytics_rows(job: ExportJob, *, days: int) -> list[dict[str, Any]]:
  """Merge fast daily archives with fresher hourly projections when needed."""
  today = timezone.localdate()
  first_date = today - timedelta(days=days - 1)
  archives = list(
    ReportArchive.objects.filter(
      user=job.user,
      is_platform=False,
      report_date__gte=first_date,
      report_date__lte=today,
    ).order_by("-report_date")
  )
  archives_by_date = {row.report_date: row for row in archives}
  rows_by_date: dict[Any, dict[str, Any]] = {
    row.report_date: {
      "report_date": row.report_date.isoformat(),
      "total_requests": row.total_requests,
      "avg_latency_ms": row.avg_latency_ms,
      "p99_latency_ms": row.p99_latency_ms,
      "error_rate_percent": row.error_rate_percent,
      "threats_detected": row.threats_detected,
      "active_incidents": row.active_incidents,
      "unique_visitors": row.unique_visitors,
      "coverage": "daily_rollup",
    }
    for row in archives
  }

  start = timezone.make_aware(timezone.datetime.combine(first_date, timezone.datetime.min.time()))
  hourly = AggregatedAnalytics.objects.filter(
    user=job.user,
    is_platform=False,
    bucket_size="1h",
    timestamp__gte=start,
  )
  hourly_summaries = (
    hourly.annotate(report_date=TruncDate("timestamp"))
    .values("report_date")
    .annotate(bucket_count=Count("id"), source_max_updated_at=Max("updated_at"))
  )
  stale_dates: set[Any] = set()
  for summary in hourly_summaries:
    report_date = summary["report_date"]
    archive = archives_by_date.get(report_date)
    if archive is None:
      stale_dates.add(report_date)
      continue

    archive_summary = archive.summary_json if isinstance(archive.summary_json, dict) else {}
    try:
      aggregation_version = int(archive_summary.get("aggregation_version") or 0)
      archived_bucket_count = int(archive_summary.get("hourly_bucket_count") or 0)
    except (TypeError, ValueError):
      aggregation_version = 0
      archived_bucket_count = 0
    bucket_count = int(summary["bucket_count"] or 0)
    source_max_updated_at = summary["source_max_updated_at"]

    # Never replace a complete daily row with a partial set left at the raw
    # retention boundary. New/mutated hourly input does supersede the archive.
    if aggregation_version < 2 or bucket_count > archived_bucket_count:
      stale_dates.add(report_date)
      continue
    if bucket_count < archived_bucket_count or source_max_updated_at is None:
      continue

    archived_source_raw = archive_summary.get("source_max_updated_at")
    archived_source = (
      parse_datetime(str(archived_source_raw)) if archived_source_raw else archive.created_at
    )
    if archived_source is not None and timezone.is_naive(archived_source):
      archived_source = timezone.make_aware(archived_source)
    if archived_source is None or source_max_updated_at > archived_source:
      stale_dates.add(report_date)

  hourly_by_date: dict[Any, list[AggregatedAnalytics]] = {}
  if stale_dates:
    for bucket in hourly.filter(timestamp__date__in=stale_dates).order_by("timestamp"):
      bucket_date = timezone.localtime(bucket.timestamp).date()
      hourly_by_date.setdefault(bucket_date, []).append(bucket)

  for report_date, buckets in hourly_by_date.items():
    total_requests = sum(bucket.total_requests for bucket in buckets)
    weighted_latency = sum(bucket.avg_latency_ms * bucket.total_requests for bucket in buckets)
    weighted_errors = sum(bucket.error_rate_percent * bucket.total_requests for bucket in buckets)
    rows_by_date[report_date] = {
      "report_date": report_date.isoformat(),
      "total_requests": total_requests,
      "avg_latency_ms": (round(weighted_latency / total_requests, 2) if total_requests else 0.0),
      "p99_latency_ms": max((bucket.p99_latency_ms for bucket in buckets), default=0.0),
      "error_rate_percent": (round(weighted_errors / total_requests, 2) if total_requests else 0.0),
      "threats_detected": sum(bucket.threats_detected for bucket in buckets),
      "active_incidents": max((bucket.active_incidents for bucket in buckets), default=0),
      "unique_visitors": max((bucket.unique_visitors for bucket in buckets), default=0),
      "coverage": "hourly_fallback",
    }

  return [
    rows_by_date.get(
      today - timedelta(days=offset),
      _empty_daily_analytics_row(today - timedelta(days=offset)),
    )
    for offset in range(days)
  ]


def _rows_for_job(job: ExportJob) -> list[dict[str, Any]]:
  params = job.params if isinstance(job.params, dict) else {}
  days = int(params.get("days") or 7)
  days = max(1, min(days, 90))
  since = timezone.now() - timedelta(days=days)

  if job.kind == ExportJob.Kind.THREAT:
    qs = ThreatIntelligence.objects.filter(user=job.user, timestamp__gte=since).order_by(
      "-timestamp"
    )
    return [
      {
        "timestamp": row.timestamp.isoformat() if row.timestamp else "",
        "source": row.source,
        "ip_address": row.ip_address or "",
        "location": row.location or "",
        "abuse_confidence_score": row.abuse_confidence_score,
        "is_malicious": row.is_malicious,
        "suspicious_requests": row.suspicious_requests,
        "raw": json.dumps(row.raw_payload or {}, default=str)[:2000],
      }
      for row in qs.iterator(chunk_size=2000)
    ]

  if job.kind == ExportJob.Kind.VULNERABILITIES:
    qs = Vulnerability.objects.filter(user=job.user, created_at__gte=since).order_by("-created_at")
    return [
      {
        "id": str(row.id),
        "title": getattr(row, "title", "") or getattr(row, "cve_id", "") or "",
        "severity": getattr(row, "severity", "") or "",
        "status": getattr(row, "status", "") or "",
        "created_at": row.created_at.isoformat() if getattr(row, "created_at", None) else "",
      }
      for row in qs.iterator(chunk_size=2000)
    ]

  if job.kind == ExportJob.Kind.LIGHTHOUSE:
    since = timezone.now() - timedelta(days=min(days, 30))
    lighthouse = LighthouseScan.objects.filter(
      user=job.user,
      is_platform=False,
      scanned_at__gte=since,
    )
    site_url = str(params.get("site_url") or "").strip()
    if site_url:
      site_variants = {site_url, site_url.rstrip("/"), f"{site_url.rstrip('/')}/"}
      lighthouse = lighthouse.filter(url__in=site_variants)
    return [
      {
        "timestamp": row.scanned_at.isoformat(),
        "url": row.url,
        "performance": row.performance,
        "accessibility": row.accessibility,
        "best_practices": row.best_practices,
        "seo": row.seo,
      }
      for row in lighthouse.order_by("-scanned_at").iterator(chunk_size=500)
    ]

  # Analytics: daily archives are the fast path; hourly rows fill current or
  # missed archive dates so a partial archive never truncates the report.
  days = int(job.params.get("days", 7)) if isinstance(job.params, dict) else 7
  days = max(1, min(days, REPORT_ARCHIVE_RETENTION_DAYS))  # Cap at Neon retention limit
  site_url = str(job.params.get("site_url") or "").strip()
  if site_url:
    return _site_analytics_rows(job, days=min(days, 30), site_url=site_url)
  return _daily_analytics_rows(job, days=days)


def _to_csv(rows: list[dict[str, Any]]) -> bytes:
  if not rows:
    return b"message\nNo data for selected range\n"
  buf = io.StringIO()
  writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
  writer.writeheader()
  writer.writerows(
    {
      key: (
        f"'{value}"
        if isinstance(value, str)
        and value.lstrip()
        and value.lstrip()[0] in {"=", "+", "-", "@", "\t", "\r"}
        else value
      )
      for key, value in row.items()
    }
    for row in rows
  )
  return buf.getvalue().encode("utf-8")


def _to_json(rows: list[dict[str, Any]]) -> bytes:
  return json.dumps({"count": len(rows), "rows": rows}, indent=2, default=str).encode("utf-8")


def _to_parquet(rows: list[dict[str, Any]]) -> bytes:
  if not rows:
    frame = pl.DataFrame({"message": ["No data for selected range"]})
  else:
    frame = pl.DataFrame(rows)
  sink = io.BytesIO()
  frame.write_parquet(sink)
  return sink.getvalue()


def _to_pdf(rows: list[dict[str, Any]], *, title: str) -> bytes:
  """Minimal multi-page text PDF (no third-party PDF runtime)."""
  lines = [title, f"Generated: {timezone.now().isoformat()}", f"Rows: {len(rows)}", ""]
  if not rows:
    lines.append("No data for selected range.")
  else:
    headers = list(rows[0].keys())
    lines.append(" | ".join(headers))
    lines.append("-" * min(100, max(20, len(lines[-1]))))
    for row in rows[:1000]:
      lines.append(" | ".join(str(row.get(h, ""))[:40] for h in headers))
    if len(rows) > 1000:
      lines.append(f"... truncated {len(rows) - 1000} additional rows")

  # Escape PDF string specials
  def esc(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

  lines_per_page = 48
  pages = [lines[index : index + lines_per_page] for index in range(0, len(lines), lines_per_page)]
  pages = pages or [["No data for selected range."]]
  page_ids = [3 + (index * 2) for index in range(len(pages))]
  content_ids = [page_id + 1 for page_id in page_ids]
  font_id = 3 + (len(pages) * 2)

  objects: list[bytes] = [
    b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    (
      f"2 0 obj<< /Type /Pages /Kids [{' '.join(f'{page_id} 0 R' for page_id in page_ids)}] "
      f"/Count {len(pages)} >>endobj\n"
    ).encode(),
  ]
  for page_number, page_lines in enumerate(pages):
    page_id = page_ids[page_number]
    content_id = content_ids[page_number]
    content_cmds: list[str] = ["BT", "/F1 10 Tf", "50 750 Td", "14 TL"]
    for line_number, line in enumerate(page_lines):
      if line_number > 0:
        content_cmds.append("T*")
      content_cmds.append(f"({esc(line[:110])}) Tj")
    content_cmds.append("ET")
    stream = "\n".join(content_cmds).encode("latin-1", errors="replace")
    objects.append(
      (
        f"{page_id} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        f"/Contents {content_id} 0 R /Resources << /Font << /F1 {font_id} 0 R >> >> "
        ">>endobj\n"
      ).encode()
    )
    objects.append(
      f"{content_id} 0 obj<< /Length {len(stream)} >>stream\n".encode()
      + stream
      + b"\nendstream\nendobj\n"
    )
  objects.append(
    f"{font_id} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n".encode()
  )

  out = bytearray(b"%PDF-1.4\n")
  offsets = [0]
  for obj in objects:
    offsets.append(len(out))
    out.extend(obj)
  xref_pos = len(out)
  out.extend(f"xref\n0 {len(offsets)}\n".encode())
  out.extend(b"0000000000 65535 f \n")
  for off in offsets[1:]:
    out.extend(f"{off:010d} 00000 n \n".encode())
  out.extend(
    f"trailer<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode()
  )
  return bytes(out)


def render_export_bytes(job: ExportJob, rows: list[dict[str, Any]]) -> tuple[bytes, str, str]:
  """Return (body, content_type, filename)."""
  stamp = timezone.now().strftime("%Y%m%dT%H%M%SZ")
  base = f"deml-{job.kind}-{stamp}"
  if job.format == ExportJob.Format.JSON:
    return _to_json(rows), CONTENT_TYPES[ExportJob.Format.JSON], f"{base}.json"
  if job.format == ExportJob.Format.PARQUET:
    return _to_parquet(rows), CONTENT_TYPES[ExportJob.Format.PARQUET], f"{base}.parquet"
  if job.format == ExportJob.Format.PDF:
    return (
      _to_pdf(rows, title=f"DEML {job.kind} export"),
      CONTENT_TYPES[ExportJob.Format.PDF],
      f"{base}.pdf",
    )
  return _to_csv(rows), CONTENT_TYPES[ExportJob.Format.CSV], f"{base}.csv"


def process_export_job(job_id: str) -> ExportJob:
  """Run one export job end-to-end. Safe to retry while queued/running/failed."""
  job = ExportJob.objects.select_related("user").get(id=job_id)
  if job.status == ExportJob.Status.READY and job.storage_uri:
    return job
  if job.status == ExportJob.Status.EXPIRED:
    return job

  started_at = timezone.now()
  claimed = (
    ExportJob.objects.filter(
      id=job.id,
      attempts__lt=EXPORT_MAX_ATTEMPTS,
    )
    .filter(
      Q(status=ExportJob.Status.QUEUED)
      | Q(
        status=ExportJob.Status.FAILED,
        next_attempt_at__isnull=True,
      )
      | Q(
        status=ExportJob.Status.FAILED,
        next_attempt_at__lte=started_at,
      )
    )
    .update(
      status=ExportJob.Status.RUNNING,
      started_at=started_at,
      error="",
      next_attempt_at=None,
      attempts=F("attempts") + 1,
    )
  )
  if claimed == 0:
    job.refresh_from_db()
    return job
  job.refresh_from_db()

  if not is_configured():
    _mark_export_failed(job, "Object storage (RustFS) is not configured")
    return job

  try:
    if job.object_key:
      delete_object(key=job.object_key)
      job.object_key = ""
      job.storage_uri = ""
      job.save(update_fields=["object_key", "storage_uri"])

    rows = _rows_for_job(job)
    body, content_type, filename = render_export_bytes(job, rows)
    digest = hashlib.sha256(body).hexdigest()
    key = export_object_key(
      account_id=str(job.account_id),
      job_id=str(job.id),
      filename=filename,
    )
    # Persist the deterministic cleanup reference before upload. If the final
    # metadata save fails, a retry or retention pass can still delete this key.
    job.object_key = key
    job.storage_uri = ""
    job.save(update_fields=["object_key", "storage_uri"])
    ensure_bucket()
    uri = put_bytes(
      key=key,
      body=body,
      content_type=content_type,
      metadata={
        "job_id": str(job.id),
        "account_id": str(job.account_id),
        "kind": job.kind,
        "format": job.format,
      },
    )
    job.storage_uri = uri
    job.object_key = key
    job.content_type = content_type
    job.byte_size = len(body)
    job.checksum_sha256 = digest
    job.status = ExportJob.Status.READY
    job.completed_at = timezone.now()
    job.expires_at = timezone.now() + timedelta(days=DEFAULT_RETENTION_DAYS)
    job.next_attempt_at = None
    job.error = ""
    job.save(
      update_fields=[
        "storage_uri",
        "object_key",
        "content_type",
        "byte_size",
        "checksum_sha256",
        "status",
        "completed_at",
        "expires_at",
        "next_attempt_at",
        "error",
      ]
    )
    logger.info("export job ready id=%s bytes=%s", job.id, job.byte_size)
  except ObjectStorageNotConfiguredError as exc:
    _compensate_failed_upload(job)
    _mark_export_failed(job, str(exc))
  except Exception as exc:
    logger.exception("export job failed id=%s", job.id)
    _compensate_failed_upload(job)
    _mark_export_failed(job, str(exc))
  return job


def _compensate_failed_upload(job: ExportJob) -> None:
  """Best-effort object cleanup while preserving its key if deletion fails."""
  if not job.object_key:
    return
  try:
    delete_object(key=job.object_key)
  except Exception:
    logger.exception("failed export object compensation failed id=%s", job.id)
    return
  job.object_key = ""
  job.storage_uri = ""
  try:
    job.save(update_fields=["object_key", "storage_uri"])
  except Exception:
    logger.exception("failed export compensation metadata update failed id=%s", job.id)


def _mark_export_failed(job: ExportJob, error: str) -> None:
  completed_at = timezone.now()
  retry_minutes = min(60, 2 ** max(0, job.attempts - 1))
  job.status = ExportJob.Status.FAILED
  job.error = error[:1000]
  job.completed_at = completed_at
  job.next_attempt_at = (
    completed_at + timedelta(minutes=retry_minutes) if job.attempts < EXPORT_MAX_ATTEMPTS else None
  )
  job.save(update_fields=["status", "error", "completed_at", "next_attempt_at"])


def expire_export_job(job: ExportJob) -> bool:
  """Delete one stored artifact and mark its metadata expired.

  The row is left untouched when object deletion fails so the scheduled cleanup
  path can retry without losing the only reference to the private object.
  """
  if job.object_key:
    try:
      delete_object(key=job.object_key)
    except Exception:
      logger.exception("export artifact deletion failed id=%s", job.id)
      return False

  job.status = ExportJob.Status.EXPIRED
  job.storage_uri = ""
  job.object_key = ""
  if job.expires_at is None:
    job.expires_at = timezone.now()
  job.save(update_fields=["status", "storage_uri", "object_key", "expires_at"])
  return True


def expire_export_artifacts(
  *,
  now: Any | None = None,
  limit: int = 200,
) -> tuple[int, int]:
  """Expire stored files, then prune aged metadata rows.

  Returns ``(artifacts_expired, metadata_rows_pruned)``. The bounded artifact
  batch keeps maintenance predictable; subsequent worker ticks drain any
  backlog. Metadata remains queryable for the configured 90-day audit window
  after artifact expiry.
  """
  cleanup_time = now or timezone.now()
  legacy_artifact_cutoff = cleanup_time - timedelta(days=DEFAULT_RETENTION_DAYS)
  candidates = list(
    ExportJob.objects.filter(status__in=[ExportJob.Status.READY, ExportJob.Status.EXPIRED])
    .filter(
      Q(expires_at__lte=cleanup_time)
      | Q(expires_at__isnull=True, created_at__lte=legacy_artifact_cutoff)
    )
    .exclude(status=ExportJob.Status.EXPIRED, object_key="")
    .order_by("expires_at")[: max(1, limit)]
  )

  expired_count = sum(1 for job in candidates if expire_export_job(job))

  terminal_failed = list(
    ExportJob.objects.filter(
      status=ExportJob.Status.FAILED,
      attempts__gte=EXPORT_MAX_ATTEMPTS,
    )
    .exclude(object_key="")
    .order_by("completed_at")[: max(1, limit)]
  )
  for job in terminal_failed:
    if not job.object_key:
      continue
    try:
      delete_object(key=job.object_key)
    except Exception:
      logger.exception("terminal failed export artifact deletion failed id=%s", job.id)
      continue
    job.object_key = ""
    job.storage_uri = ""
    job.save(update_fields=["object_key", "storage_uri"])

  metadata_cutoff = cleanup_time - timedelta(days=EXPIRED_METADATA_RETENTION_DAYS)
  expired_metadata_deleted, _ = ExportJob.objects.filter(
    status=ExportJob.Status.EXPIRED,
    expires_at__isnull=False,
    expires_at__lt=metadata_cutoff,
    object_key="",
  ).delete()
  failed_metadata_deleted, _ = ExportJob.objects.filter(
    status=ExportJob.Status.FAILED,
    attempts__gte=EXPORT_MAX_ATTEMPTS,
    completed_at__lt=metadata_cutoff,
    object_key="",
  ).delete()
  return expired_count, expired_metadata_deleted + failed_metadata_deleted


def process_queued_exports(*, limit: int = 20) -> int:
  """Process queued (and reclaim stale running) export jobs. Returns count processed."""
  now = timezone.now()
  expired_count, metadata_deleted = expire_export_artifacts(now=now)
  if expired_count or metadata_deleted:
    logger.info(
      "export retention completed artifacts=%s metadata=%s",
      expired_count,
      metadata_deleted,
    )
  stale_before = now - timedelta(hours=1)
  stale = ExportJob.objects.filter(
    status=ExportJob.Status.RUNNING,
    started_at__lt=stale_before,
  )
  stale.filter(attempts__lt=EXPORT_MAX_ATTEMPTS).update(
    status=ExportJob.Status.QUEUED,
    error="reclaimed after stale run",
    next_attempt_at=now,
  )
  stale.filter(attempts__gte=EXPORT_MAX_ATTEMPTS).update(
    status=ExportJob.Status.FAILED,
    error="export exhausted retries after stale run",
    completed_at=now,
    next_attempt_at=None,
  )

  ids = list(
    ExportJob.objects.filter(attempts__lt=EXPORT_MAX_ATTEMPTS)
    .filter(
      Q(status=ExportJob.Status.QUEUED)
      | Q(status=ExportJob.Status.FAILED, next_attempt_at__isnull=True)
      | Q(status=ExportJob.Status.FAILED, next_attempt_at__lte=now)
    )
    .order_by("created_at")
    .values_list("id", flat=True)[:limit]
  )
  for job_id in ids:
    process_export_job(str(job_id))
  return len(ids)
