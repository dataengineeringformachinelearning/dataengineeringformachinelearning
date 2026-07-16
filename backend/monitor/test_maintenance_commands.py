import datetime
import uuid
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from utils.retention import (
  BENCHMARK_RUN_RETENTION_DAYS,
  HONEYPOT_INTERACTION_RETENTION_DAYS,
  LIGHTHOUSE_SCAN_RETENTION_DAYS,
  RAW_TELEMETRY_RETENTION_DAYS,
  REPORT_ARCHIVE_RETENTION_DAYS,
  SCHEDULED_TASK_RUN_RETENTION_DAYS,
  SEARCH_QUERY_RETENTION_DAYS,
  TELEMETRY_INGEST_RECEIPT_RETENTION_DAYS,
)

from monitor.management.commands.db_cleanup import Command as CleanupCommand
from monitor.models import (
  AggregatedAnalytics,
  AuditLog,
  BenchmarkRun,
  Endpoints,
  HealthProbeObservation,
  HoneypotEndpoint,
  HoneypotInteraction,
  Incident,
  LighthouseScan,
  MonitoredService,
  OutboxEvent,
  ReportArchive,
  ScheduledTaskRun,
  SearchQuery,
  StatusPage,
  StatusPageUptimeDaily,
  TelemetryIngestReceipt,
)


@pytest.mark.django_db
def test_aggregate_analytics_uses_scheduled_hour_and_exact_p99() -> None:
  scheduled_for = datetime.datetime(2026, 7, 15, 19, 37, tzinfo=datetime.timezone.utc)
  hour_start = datetime.datetime(2026, 7, 15, 18, 0, tzinfo=datetime.timezone.utc)
  hour_end = hour_start + datetime.timedelta(hours=1)

  samples = [
    Endpoints(
      user=None,
      is_platform=True,
      url=f"https://platform.example.test/{latency_ms}",
      status_code=200,
      response_time=datetime.timedelta(milliseconds=latency_ms),
      is_active=True,
    )
    for latency_ms in range(1, 5_101)
  ]
  Endpoints.objects.bulk_create(samples)
  sample_ids = [sample.id for sample in samples]
  Endpoints.objects.filter(id__in=sample_ids).update(
    last_tested=hour_start + datetime.timedelta(minutes=30)
  )
  Endpoints.objects.filter(id=sample_ids[0]).update(last_tested=hour_start)

  before_bucket = Endpoints.objects.create(
    user=None,
    is_platform=True,
    url="https://platform.example.test/before",
    status_code=503,
    response_time=datetime.timedelta(seconds=30),
    is_active=False,
  )
  at_bucket_end = Endpoints.objects.create(
    user=None,
    is_platform=True,
    url="https://platform.example.test/end",
    status_code=503,
    response_time=datetime.timedelta(seconds=30),
    is_active=False,
  )
  Endpoints.objects.filter(id=before_bucket.id).update(
    last_tested=hour_start - datetime.timedelta(microseconds=1)
  )
  Endpoints.objects.filter(id=at_bucket_end.id).update(last_tested=hour_end)

  call_command("aggregate_analytics", scheduled_for=scheduled_for.isoformat())
  call_command("aggregate_analytics", scheduled_for=scheduled_for.isoformat())

  analytics = AggregatedAnalytics.objects.get(
    user=None,
    is_platform=True,
    timestamp=hour_start,
    bucket_size="1h",
  )
  assert AggregatedAnalytics.objects.count() == 1
  assert analytics.total_requests == 5_100
  assert analytics.avg_latency_ms == pytest.approx(2_550.5)
  assert analytics.p99_latency_ms == 5_049.0
  assert analytics.error_rate_percent == 0.0


@pytest.mark.django_db
def test_aggregate_analytics_does_not_copy_current_incident_into_history() -> None:
  scheduled_for = datetime.datetime(2026, 7, 10, 19, 5, tzinfo=datetime.timezone.utc)
  hour_start = datetime.datetime(2026, 7, 10, 18, 0, tzinfo=datetime.timezone.utc)
  page = StatusPage.objects.create(
    user=None,
    is_platform=True,
    title="Historical incident scope",
    slug="historical-incident-scope",
  )
  current_incident = Incident.objects.create(
    user=None,
    status_page=page,
    title="Created later",
    message="Must not appear in the historical bucket",
    status="Investigating",
  )
  Incident.objects.filter(id=current_incident.id).update(
    created_at=hour_start + datetime.timedelta(days=2)
  )
  endpoint = Endpoints.objects.create(
    user=None,
    is_platform=True,
    url="https://historical.example.test/health",
    status_code=200,
    response_time=datetime.timedelta(milliseconds=10),
    is_active=True,
  )
  Endpoints.objects.filter(id=endpoint.id).update(
    last_tested=hour_start + datetime.timedelta(minutes=30)
  )

  call_command("aggregate_analytics", scheduled_for=scheduled_for.isoformat())

  analytics = AggregatedAnalytics.objects.get(
    user=None,
    is_platform=True,
    timestamp=hour_start,
    bucket_size="1h",
  )
  assert analytics.active_incidents == 0


@pytest.mark.django_db
def test_db_cleanup_enforces_retention_boundaries_and_preserves_nonterminal_runs() -> None:
  now = datetime.datetime(2026, 7, 15, 12, 0, tzinfo=datetime.timezone.utc)
  raw_cutoff = now - datetime.timedelta(days=RAW_TELEMETRY_RETENTION_DAYS)
  receipt_cutoff = now - datetime.timedelta(days=TELEMETRY_INGEST_RECEIPT_RETENTION_DAYS)
  report_cutoff = now.date() - datetime.timedelta(days=REPORT_ARCHIVE_RETENTION_DAYS)
  task_cutoff = now - datetime.timedelta(days=SCHEDULED_TASK_RUN_RETENTION_DAYS)
  lighthouse_cutoff = now - datetime.timedelta(days=LIGHTHOUSE_SCAN_RETENTION_DAYS)
  just_before = datetime.timedelta(microseconds=1)
  dlq_cutoff = now - datetime.timedelta(days=7)

  page = StatusPage.objects.create(
    user=None,
    is_platform=True,
    title="Platform status",
    slug="maintenance-platform-status",
    is_published=True,
  )
  service = MonitoredService.objects.create(
    status_page=page,
    name="Platform API",
    url="https://platform.example.test/health",
  )

  expired_probe = HealthProbeObservation.objects.create(
    observation_key="retention-expired",
    monitored_service=service,
    user=None,
    account_id=None,
    is_platform=True,
    url=service.url,
    status_code=200,
    response_time_ms=25,
    is_active=True,
    observed_at=raw_cutoff - just_before,
  )
  boundary_probe = HealthProbeObservation.objects.create(
    observation_key="retention-boundary",
    monitored_service=service,
    user=None,
    account_id=None,
    is_platform=True,
    url=service.url,
    status_code=200,
    response_time_ms=25,
    is_active=True,
    observed_at=raw_cutoff,
  )
  fresh_probe = HealthProbeObservation.objects.create(
    observation_key="retention-fresh",
    monitored_service=service,
    user=None,
    account_id=None,
    is_platform=True,
    url=service.url,
    status_code=200,
    response_time_ms=25,
    is_active=True,
    observed_at=raw_cutoff + datetime.timedelta(seconds=1),
  )

  receipts = [
    TelemetryIngestReceipt.objects.create(
      topic="telemetry-raw",
      partition=0,
      offset=offset,
      account_id=uuid.uuid4(),
    )
    for offset in range(3)
  ]
  TelemetryIngestReceipt.objects.filter(id=receipts[0].id).update(
    processed_at=receipt_cutoff - just_before
  )
  TelemetryIngestReceipt.objects.filter(id=receipts[1].id).update(processed_at=receipt_cutoff)
  TelemetryIngestReceipt.objects.filter(id=receipts[2].id).update(
    processed_at=receipt_cutoff + datetime.timedelta(seconds=1)
  )

  expired_report = ReportArchive.objects.create(
    user=None,
    is_platform=True,
    report_date=report_cutoff - datetime.timedelta(days=1),
    period_start=raw_cutoff,
    period_end=raw_cutoff + datetime.timedelta(days=1),
  )
  boundary_report = ReportArchive.objects.create(
    user=None,
    is_platform=True,
    report_date=report_cutoff,
    period_start=raw_cutoff,
    period_end=raw_cutoff + datetime.timedelta(days=1),
  )
  fresh_report = ReportArchive.objects.create(
    user=None,
    is_platform=True,
    report_date=report_cutoff + datetime.timedelta(days=1),
    period_start=raw_cutoff,
    period_end=raw_cutoff + datetime.timedelta(days=1),
  )

  expired_uptime = StatusPageUptimeDaily.objects.create(
    status_page=page,
    user=None,
    is_platform=True,
    report_date=report_cutoff - datetime.timedelta(days=1),
    total_checks=1,
    successful_checks=1,
  )
  boundary_uptime = StatusPageUptimeDaily.objects.create(
    status_page=page,
    user=None,
    is_platform=True,
    report_date=report_cutoff,
    total_checks=1,
    successful_checks=1,
  )
  fresh_uptime = StatusPageUptimeDaily.objects.create(
    status_page=page,
    user=None,
    is_platform=True,
    report_date=report_cutoff + datetime.timedelta(days=1),
    total_checks=1,
    successful_checks=1,
  )

  expired_completed = ScheduledTaskRun.objects.create(
    task_name="expired-completed",
    scheduled_for=task_cutoff - just_before,
    state=ScheduledTaskRun.State.COMPLETED,
  )
  expired_failed = ScheduledTaskRun.objects.create(
    task_name="expired-failed",
    scheduled_for=task_cutoff - just_before,
    state=ScheduledTaskRun.State.FAILED,
    attempts=5,
  )
  retryable_failed = ScheduledTaskRun.objects.create(
    task_name="expired-retryable-failed",
    scheduled_for=task_cutoff - just_before,
    state=ScheduledTaskRun.State.FAILED,
    attempts=4,
  )
  boundary_completed = ScheduledTaskRun.objects.create(
    task_name="boundary-completed",
    scheduled_for=task_cutoff,
    state=ScheduledTaskRun.State.COMPLETED,
  )
  fresh_completed = ScheduledTaskRun.objects.create(
    task_name="fresh-completed",
    scheduled_for=task_cutoff + datetime.timedelta(seconds=1),
    state=ScheduledTaskRun.State.COMPLETED,
  )
  nonterminal_runs = [
    ScheduledTaskRun.objects.create(
      task_name=f"expired-{state}",
      scheduled_for=task_cutoff - just_before,
      state=state,
    )
    for state in (
      ScheduledTaskRun.State.PENDING,
      ScheduledTaskRun.State.PUBLISHED,
      ScheduledTaskRun.State.RUNNING,
    )
  ]
  expired_dlq = OutboxEvent.objects.create(
    topic="retention-test",
    payload={},
    attempts=5,
    dlq_at=dlq_cutoff - just_before,
  )
  recent_dlq_from_old_event = OutboxEvent.objects.create(
    topic="retention-test",
    payload={},
    attempts=5,
    dlq_at=dlq_cutoff + datetime.timedelta(seconds=1),
  )
  OutboxEvent.objects.filter(id__in=[expired_dlq.id, recent_dlq_from_old_event.id]).update(
    created_at=now - datetime.timedelta(days=60)
  )

  expired_search = SearchQuery.objects.create(
    user=None,
    is_platform=True,
    query_text="expired sensitive query",
  )
  SearchQuery.objects.filter(id=expired_search.id).update(
    timestamp=now - datetime.timedelta(days=SEARCH_QUERY_RETENTION_DAYS, microseconds=1)
  )
  honeypot = HoneypotEndpoint.objects.create(
    user=None,
    is_platform=True,
    path="/.retention-test",
  )
  expired_honeypot = HoneypotInteraction.objects.create(
    honeypot=honeypot,
    source_ip="203.0.113.9",
  )
  HoneypotInteraction.objects.filter(id=expired_honeypot.id).update(
    timestamp=now - datetime.timedelta(days=HONEYPOT_INTERACTION_RETENTION_DAYS, microseconds=1)
  )
  expired_benchmark = BenchmarkRun.objects.create(
    user=None,
    is_platform=True,
    model_type="sla",
    mae=0.1,
    rmse=0.2,
    training_duration_seconds=1.0,
    dataset_size=10,
    benchmark_score=0.9,
  )
  BenchmarkRun.objects.filter(id=expired_benchmark.id).update(
    created_at=now - datetime.timedelta(days=BENCHMARK_RUN_RETENTION_DAYS, microseconds=1)
  )
  lighthouse_scans = [
    LighthouseScan.objects.create(
      status_page=page,
      user=None,
      account_id=page.id,
      is_platform=True,
      url=service.url,
      scanned_at=scanned_at,
      performance=95.0,
      accessibility=96.0,
      best_practices=97.0,
      seo=98.0,
    )
    for scanned_at in (
      lighthouse_cutoff - just_before,
      lighthouse_cutoff,
      lighthouse_cutoff + datetime.timedelta(seconds=1),
    )
  ]

  with (
    patch("monitor.management.commands.db_cleanup.timezone.now", return_value=now),
    patch("monitor.management.commands.db_cleanup.call_command") as archive_reports,
  ):
    CleanupCommand()._run_cleanup()

  archive_reports.assert_called_once_with(
    "archive_reports", backfill_days=RAW_TELEMETRY_RETENTION_DAYS - 1
  )

  assert not HealthProbeObservation.objects.filter(id=expired_probe.id).exists()
  assert HealthProbeObservation.objects.filter(id=boundary_probe.id).exists()
  assert HealthProbeObservation.objects.filter(id=fresh_probe.id).exists()

  assert not TelemetryIngestReceipt.objects.filter(id=receipts[0].id).exists()
  assert TelemetryIngestReceipt.objects.filter(id=receipts[1].id).exists()
  assert TelemetryIngestReceipt.objects.filter(id=receipts[2].id).exists()

  assert not ReportArchive.objects.filter(id=expired_report.id).exists()
  assert ReportArchive.objects.filter(id=boundary_report.id).exists()
  assert ReportArchive.objects.filter(id=fresh_report.id).exists()

  assert not StatusPageUptimeDaily.objects.filter(id=expired_uptime.id).exists()
  assert StatusPageUptimeDaily.objects.filter(id=boundary_uptime.id).exists()
  assert StatusPageUptimeDaily.objects.filter(id=fresh_uptime.id).exists()

  assert not ScheduledTaskRun.objects.filter(id=expired_completed.id).exists()
  assert not ScheduledTaskRun.objects.filter(id=expired_failed.id).exists()
  assert ScheduledTaskRun.objects.filter(id=boundary_completed.id).exists()
  assert ScheduledTaskRun.objects.filter(id=fresh_completed.id).exists()
  assert ScheduledTaskRun.objects.filter(id=retryable_failed.id).exists()
  assert ScheduledTaskRun.objects.filter(
    id__in=[run.id for run in nonterminal_runs]
  ).count() == len(nonterminal_runs)
  assert not SearchQuery.objects.filter(id=expired_search.id).exists()
  assert not HoneypotInteraction.objects.filter(id=expired_honeypot.id).exists()
  assert not BenchmarkRun.objects.filter(id=expired_benchmark.id).exists()
  assert not LighthouseScan.objects.filter(id=lighthouse_scans[0].id).exists()
  assert LighthouseScan.objects.filter(id=lighthouse_scans[1].id).exists()
  assert LighthouseScan.objects.filter(id=lighthouse_scans[2].id).exists()
  assert not OutboxEvent.objects.filter(id=expired_dlq.id).exists()
  assert OutboxEvent.objects.filter(id=recent_dlq_from_old_event.id).exists()


@pytest.mark.django_db
def test_db_cleanup_refuses_to_delete_unarchived_audit_logs() -> None:
  now = datetime.datetime(2026, 7, 15, 12, 0, tzinfo=datetime.timezone.utc)
  log = AuditLog.objects.create(action="retention-evidence", details={"preserve": True})
  AuditLog.objects.filter(id=log.id).update(
    timestamp=now - datetime.timedelta(days=RAW_TELEMETRY_RETENTION_DAYS, seconds=1)
  )

  with (
    patch("monitor.management.commands.db_cleanup.timezone.now", return_value=now),
    patch("monitor.management.commands.db_cleanup.call_command"),
    patch(
      "telemetry.services.security_events.archive_audit_logs",
      return_value=False,
    ),
    pytest.raises(CommandError, match="Refusing to delete audit logs"),
  ):
    CleanupCommand()._run_cleanup()

  assert AuditLog.objects.filter(id=log.id).exists()
