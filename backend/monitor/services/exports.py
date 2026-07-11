"""Build analytics export artifacts and store them in RustFS."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import logging
from datetime import timedelta
from typing import Any, Final

import polars as pl
from django.utils import timezone
from utils.object_storage import (
  ObjectStorageNotConfiguredError,
  ensure_bucket,
  export_object_key,
  is_configured,
  put_bytes,
)

from monitor.models import (
  AggregatedAnalytics,
  ExportJob,
  ReportArchive,
  ThreatIntelligence,
  Vulnerability,
)

logger = logging.getLogger(__name__)

DEFAULT_RETENTION_DAYS: Final[int] = 14
CONTENT_TYPES: Final[dict[str, str]] = {
  ExportJob.Format.CSV: "text/csv; charset=utf-8",
  ExportJob.Format.JSON: "application/json",
  ExportJob.Format.PARQUET: "application/vnd.apache.parquet",
  ExportJob.Format.PDF: "application/pdf",
}


def _rows_for_job(job: ExportJob) -> list[dict[str, Any]]:
  params = job.params if isinstance(job.params, dict) else {}
  days = int(params.get("days") or 7)
  days = max(1, min(days, 90))
  since = timezone.now() - timedelta(days=days)

  if job.kind == ExportJob.Kind.THREAT:
    qs = ThreatIntelligence.objects.filter(user=job.user, timestamp__gte=since).order_by(
      "-timestamp"
    )[:5000]
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
      for row in qs
    ]

  if job.kind == ExportJob.Kind.VULNERABILITIES:
    qs = Vulnerability.objects.filter(user=job.user).order_by("-created_at")[:5000]
    return [
      {
        "id": str(row.id),
        "title": getattr(row, "title", "") or getattr(row, "cve_id", "") or "",
        "severity": getattr(row, "severity", "") or "",
        "status": getattr(row, "status", "") or "",
        "created_at": row.created_at.isoformat() if getattr(row, "created_at", None) else "",
      }
      for row in qs
    ]

  if job.kind == ExportJob.Kind.LIGHTHOUSE:
    qs = AggregatedAnalytics.objects.filter(user=job.user, timestamp__gte=since).order_by(
      "-timestamp"
    )[:2000]
    rows: list[dict[str, Any]] = []
    for row in qs:
      meta = row.metadata if isinstance(row.metadata, dict) else {}
      scores = meta.get("lighthouse_scores") or meta.get("lighthouse") or {}
      if not isinstance(scores, dict):
        continue
      rows.append(
        {
          "timestamp": row.timestamp.isoformat() if row.timestamp else "",
          "performance": scores.get("performance"),
          "accessibility": scores.get("accessibility"),
          "best_practices": scores.get("best_practices") or scores.get("best-practices"),
          "seo": scores.get("seo"),
        }
      )
    return rows

  # analytics (default) - prefer ReportArchive for daily rollups (faster)
  days = int(job.params.get("days", 7)) if isinstance(job.params, dict) else 7
  days = max(1, min(days, 90))
  since = timezone.now() - timedelta(days=days)

  # Use ReportArchive for daily rollups when requesting 7+ days
  if job.user and days >= 7:
    archive_qs = ReportArchive.objects.filter(
      user=job.user, report_date__gte=since.date()
    ).order_by("-report_date")[:days]
    if archive_qs.exists():
      return [
        {
          "report_date": row.report_date.isoformat(),
          "total_requests": row.total_requests,
          "avg_latency_ms": row.avg_latency_ms,
          "p99_latency_ms": row.p99_latency_ms,
          "error_rate_percent": row.error_rate_percent,
          "threats_detected": row.threats_detected,
          "active_incidents": row.active_incidents,
          "unique_visitors": row.unique_visitors,
        }
        for row in archive_qs
      ]

  qs = AggregatedAnalytics.objects.filter(user=job.user, timestamp__gte=since).order_by(
    "-timestamp"
  )[:5000]
  return [
    {
      "timestamp": row.timestamp.isoformat() if row.timestamp else "",
      "bucket_size": row.bucket_size,
      "total_requests": row.total_requests,
      "avg_latency_ms": row.avg_latency_ms,
      "p99_latency_ms": row.p99_latency_ms,
      "error_rate_percent": row.error_rate_percent,
      "threats_detected": row.threats_detected,
      "active_incidents": row.active_incidents,
      "unique_visitors": row.unique_visitors,
      "widget_interactions": row.widget_interactions,
    }
    for row in qs
  ]


def _to_csv(rows: list[dict[str, Any]]) -> bytes:
  if not rows:
    return b"message\nNo data for selected range\n"
  buf = io.StringIO()
  writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
  writer.writeheader()
  writer.writerows(rows)
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
    for row in rows[:200]:
      lines.append(" | ".join(str(row.get(h, ""))[:40] for h in headers))
    if len(rows) > 200:
      lines.append(f"... truncated {len(rows) - 200} additional rows")

  # Escape PDF string specials
  def esc(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

  y_start = 750
  content_cmds: list[str] = ["BT", "/F1 10 Tf", f"50 {y_start} Td", "14 TL"]
  first = True
  for line in lines:
    chunk = esc(line[:110])
    if first:
      content_cmds.append(f"({chunk}) Tj")
      first = False
    else:
      content_cmds.append("T*")
      content_cmds.append(f"({chunk}) Tj")
  content_cmds.append("ET")
  stream = "\n".join(content_cmds).encode("latin-1", errors="replace")

  objects: list[bytes] = []
  objects.append(b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n")
  objects.append(b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n")
  objects.append(
    b"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
    b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n"
  )
  objects.append(
    f"4 0 obj<< /Length {len(stream)} >>stream\n".encode() + stream + b"\nendstream\nendobj\n"
  )
  objects.append(b"5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n")

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

  if not is_configured():
    job.status = ExportJob.Status.FAILED
    job.error = "Object storage (RustFS) is not configured"
    job.completed_at = timezone.now()
    job.save(update_fields=["status", "error", "completed_at"])
    return job

  job.status = ExportJob.Status.RUNNING
  job.started_at = timezone.now()
  job.error = ""
  job.save(update_fields=["status", "started_at", "error"])

  try:
    rows = _rows_for_job(job)
    body, content_type, filename = render_export_bytes(job, rows)
    digest = hashlib.sha256(body).hexdigest()
    key = export_object_key(
      account_id=str(job.account_id),
      job_id=str(job.id),
      filename=filename,
    )
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
        "error",
      ]
    )
    logger.info("export job ready id=%s bytes=%s", job.id, job.byte_size)
  except ObjectStorageNotConfiguredError as exc:
    job.status = ExportJob.Status.FAILED
    job.error = str(exc)[:1000]
    job.completed_at = timezone.now()
    job.save(update_fields=["status", "error", "completed_at"])
  except Exception as exc:
    logger.exception("export job failed id=%s", job.id)
    job.status = ExportJob.Status.FAILED
    job.error = str(exc)[:1000]
    job.completed_at = timezone.now()
    job.save(update_fields=["status", "error", "completed_at"])
  return job


def process_queued_exports(*, limit: int = 20) -> int:
  """Process queued (and reclaim stale running) export jobs. Returns count processed."""
  now = timezone.now()
  stale_before = now - timedelta(hours=1)
  ExportJob.objects.filter(
    status=ExportJob.Status.RUNNING,
    started_at__lt=stale_before,
  ).update(status=ExportJob.Status.QUEUED, error="reclaimed after stale run")

  ExportJob.objects.filter(
    status=ExportJob.Status.READY,
    expires_at__isnull=False,
    expires_at__lt=now,
  ).update(status=ExportJob.Status.EXPIRED)

  ids = list(
    ExportJob.objects.filter(status=ExportJob.Status.QUEUED)
    .order_by("created_at")
    .values_list("id", flat=True)[:limit]
  )
  for job_id in ids:
    process_export_job(str(job_id))
  return len(ids)
