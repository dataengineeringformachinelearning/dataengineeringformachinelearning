import datetime
from typing import Any

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from monitor.management.commands.archive_reports import Command as ArchiveReportsCommand
from monitor.models import (
  AggregatedAnalytics,
  Endpoints,
  HealthProbeObservation,
  MonitoredService,
  StatusPage,
  StatusPageUptimeDaily,
  UserProfile,
)
from monitor.services.metrics import MetricsService

User = get_user_model()


def _user_status_page(
  username: str,
  *,
  slug: str,
  url: str = "https://status.example.com/health",
) -> tuple[Any, StatusPage, MonitoredService]:
  user = User.objects.create_user(username=username, password="pass")
  UserProfile.objects.get_or_create(user=user)
  page = StatusPage.objects.create(
    user=user,
    is_platform=False,
    title=f"{username} status",
    slug=slug,
    is_published=True,
  )
  service = MonitoredService.objects.create(status_page=page, name="API", url=url)
  return user, page, service


def _observed_at(day: datetime.date, *, hour: int = 12) -> datetime.datetime:
  return timezone.make_aware(datetime.datetime.combine(day, datetime.time(hour=hour)))


def _probe(
  *,
  service: MonitoredService,
  observed_at: datetime.datetime,
  status_code: int,
  is_active: bool,
  key: str,
) -> HealthProbeObservation:
  page = service.status_page
  return HealthProbeObservation.objects.create(
    observation_key=key,
    monitored_service=service,
    user=page.user,
    account_id=(page.user.profile.account_id if page.user_id else None),
    is_platform=page.is_platform,
    url=service.url,
    status_code=status_code,
    response_time_ms=25,
    is_active=is_active,
    observed_at=observed_at,
  )


@pytest.mark.django_db
def test_metrics_prefers_aggregated_rollups() -> None:
  user = User.objects.create_user(username="metrics_user", password="pass")
  UserProfile.objects.get_or_create(user=user)

  url = "https://example.com/api"
  now = timezone.now()
  hour_ago = now - datetime.timedelta(hours=2)

  AggregatedAnalytics.objects.create(
    user=user,
    is_platform=False,
    timestamp=hour_ago,
    bucket_size="1h",
    total_requests=100,
    p99_latency_ms=120.0,
    avg_latency_ms=50.0,
    error_rate_percent=1.0,
    threats_detected=7,
  )

  Endpoints.objects.create(
    user=user,
    is_platform=False,
    url=url,
    status_code=200,
    response_time=datetime.timedelta(milliseconds=80),
    is_active=True,
    last_tested=now - datetime.timedelta(minutes=5),
  )
  Endpoints.objects.create(
    user=user,
    is_platform=False,
    url=url,
    status_code=503,
    response_time=datetime.timedelta(milliseconds=200),
    is_active=False,
    last_tested=now - datetime.timedelta(minutes=3),
  )

  metrics = MetricsService.for_urls([url], user=user, is_platform=False)

  assert metrics.total_requests == 102
  assert metrics.p99_latency == 200.0  # max(agg p99, raw p99)
  assert metrics.threats_detected_24h == 7
  assert metrics.cumulative_sla == 50.0


@pytest.mark.django_db
def test_metrics_platform_scope() -> None:
  url = "https://deml.app/"
  AggregatedAnalytics.objects.create(
    user=None,
    is_platform=True,
    timestamp=timezone.now() - datetime.timedelta(hours=1),
    bucket_size="1h",
    total_requests=50,
    p99_latency_ms=45.0,
    avg_latency_ms=30.0,
    error_rate_percent=0.0,
    threats_detected=3,
  )

  metrics = MetricsService.for_urls([url], user=None, is_platform=True)
  assert metrics.total_requests == 50
  assert metrics.p99_latency == 45.0
  assert metrics.threats_detected_24h == 3


@pytest.mark.django_db
def test_status_page_history_merges_29_rollups_with_today_probes_in_order() -> None:
  user, page, service = _user_status_page("history_user", slug="history-status")
  today = timezone.localdate()

  # Oldest-to-newest uptime is deliberately distinct so this also verifies
  # chronological placement of every completed daily rollup.
  for offset in range(29, 0, -1):
    successful_checks = 100 - offset
    report_date = today - datetime.timedelta(days=offset)
    StatusPageUptimeDaily.objects.create(
      status_page=page,
      user=user,
      is_platform=False,
      report_date=report_date,
      total_checks=100,
      successful_checks=successful_checks,
      uptime_percent=float(successful_checks),
    )

  _probe(
    service=service,
    observed_at=_observed_at(today, hour=10),
    status_code=404,
    is_active=True,
    key="history-today-up",
  )
  _probe(
    service=service,
    observed_at=_observed_at(today, hour=11),
    status_code=503,
    is_active=False,
    key="history-today-down",
  )

  metrics = MetricsService.for_status_page(page)

  assert len(metrics.uptime_history) == 30
  assert [day.uptime for day in metrics.uptime_history[:-1]] == [
    float(value) for value in range(71, 100)
  ]
  assert metrics.uptime_history[-1].uptime == 50.0
  assert metrics.uptime_history[-1].status == "major_outage"
  assert metrics.overall_uptime == 84.98
  assert metrics.cumulative_sla == 84.98


@pytest.mark.django_db
def test_status_page_probe_history_isolated_by_page_even_for_same_url() -> None:
  user, first_page, first_service = _user_status_page(
    "page_isolation_user",
    slug="first-isolated-status",
    url="https://shared.example.com/health",
  )
  second_page = StatusPage.objects.create(
    user=user,
    is_platform=False,
    title="Second isolated status",
    slug="second-isolated-status",
    is_published=True,
  )
  second_service = MonitoredService.objects.create(
    status_page=second_page,
    name="API",
    url=first_service.url,
  )
  observed_at = _observed_at(timezone.localdate())

  _probe(
    service=first_service,
    observed_at=observed_at,
    status_code=204,
    is_active=True,
    key="first-page-up",
  )
  _probe(
    service=second_service,
    observed_at=observed_at,
    status_code=503,
    is_active=False,
    key="second-page-down",
  )

  first_metrics = MetricsService.for_status_page(first_page)
  second_metrics = MetricsService.for_status_page(second_page)

  assert first_metrics.overall_uptime == 100.0
  assert first_metrics.uptime_history[-1].status == "operational"
  assert second_metrics.overall_uptime == 0.0
  assert second_metrics.uptime_history[-1].status == "major_outage"


@pytest.mark.django_db
def test_status_page_treats_active_4xx_as_up_and_5xx_as_down() -> None:
  _user, page, service = _user_status_page("status_semantics_user", slug="status-semantics")
  observed_at = _observed_at(timezone.localdate())

  _probe(
    service=service,
    observed_at=observed_at,
    status_code=429,
    is_active=True,
    key="status-semantics-4xx",
  )
  _probe(
    service=service,
    observed_at=observed_at + datetime.timedelta(minutes=1),
    status_code=500,
    is_active=False,
    key="status-semantics-5xx",
  )

  metrics = MetricsService.for_status_page(page)

  assert metrics.overall_uptime == 50.0
  assert metrics.uptime_history[-1].uptime == 50.0


@pytest.mark.django_db
def test_orphan_status_page_fails_closed_without_cross_tenant_metrics() -> None:
  tenant_user, _tenant_page, _tenant_service = _user_status_page(
    "orphan_tenant_user",
    slug="tenant-owned-status",
    url="https://shared-orphan.example.com/health",
  )
  orphan_page = StatusPage.objects.create(
    user=None,
    is_platform=False,
    title="Orphan status",
    slug="orphan-status",
    is_published=True,
  )
  MonitoredService.objects.create(
    status_page=orphan_page,
    name="Orphan API",
    url="https://shared-orphan.example.com/health",
  )
  Endpoints.objects.create(
    user=tenant_user,
    is_platform=False,
    url="https://shared-orphan.example.com/health",
    status_code=503,
    response_time=datetime.timedelta(milliseconds=250),
    is_active=False,
  )
  AggregatedAnalytics.objects.create(
    user=tenant_user,
    is_platform=False,
    timestamp=timezone.now() - datetime.timedelta(hours=2),
    bucket_size="1h",
    total_requests=123,
    p99_latency_ms=250.0,
    threats_detected=7,
  )

  metrics = MetricsService.for_status_page(orphan_page)

  assert all(day.status == "no_data" for day in metrics.uptime_history)
  assert all(day.uptime is None for day in metrics.uptime_history)
  assert metrics.total_requests == 0
  assert metrics.p99_latency == 0.0
  assert metrics.threats_detected_24h == 0


@pytest.mark.django_db
def test_status_page_uses_legacy_endpoints_for_missing_probe_day() -> None:
  user, page, service = _user_status_page("legacy_history_user", slug="legacy-history")
  today = timezone.localdate()
  yesterday = today - datetime.timedelta(days=1)
  StatusPage.objects.filter(id=page.id).update(
    created_at=_observed_at(today - datetime.timedelta(days=2))
  )
  page.refresh_from_db()
  StatusPageUptimeDaily.objects.create(
    status_page=page,
    user=user,
    is_platform=False,
    report_date=yesterday,
    total_checks=0,
    successful_checks=0,
    uptime_percent=100.0,
  )

  for index, (status_code, is_active) in enumerate(((404, True), (503, False))):
    endpoint = Endpoints.objects.create(
      user=user,
      is_platform=False,
      url=service.url,
      status_code=status_code,
      response_time=datetime.timedelta(milliseconds=20),
      is_active=is_active,
    )
    Endpoints.objects.filter(id=endpoint.id).update(
      last_tested=_observed_at(yesterday, hour=10 + index)
    )

  metrics = MetricsService.for_status_page(page)

  assert metrics.uptime_history[-2].uptime == 50.0
  assert metrics.uptime_history[-2].status == "major_outage"
  assert metrics.uptime_history[-1].status == "no_data"
  assert metrics.overall_uptime == 50.0


@pytest.mark.django_db
def test_archive_status_uptime_persists_legacy_endpoint_history() -> None:
  user, page, service = _user_status_page("legacy_archive_user", slug="legacy-archive")
  report_date = timezone.localdate() - datetime.timedelta(days=1)
  StatusPage.objects.filter(id=page.id).update(
    created_at=_observed_at(report_date - datetime.timedelta(days=1))
  )
  page.refresh_from_db()

  for index, (status_code, is_active) in enumerate(((200, True), (503, False))):
    endpoint = Endpoints.objects.create(
      user=user,
      is_platform=False,
      url=service.url,
      status_code=status_code,
      response_time=datetime.timedelta(milliseconds=20),
      is_active=is_active,
    )
    Endpoints.objects.filter(id=endpoint.id).update(
      last_tested=_observed_at(report_date, hour=10 + index)
    )

  assert ArchiveReportsCommand()._archive_status_uptime([report_date]) == 1

  rollup = StatusPageUptimeDaily.objects.get(status_page=page, report_date=report_date)
  assert rollup.total_checks == 2
  assert rollup.successful_checks == 1
  assert rollup.uptime_percent == 50.0


@pytest.mark.django_db
def test_service_snapshots_batch_and_merge_probe_with_legacy_days(
  django_assert_num_queries: Any,
) -> None:
  user, page, service = _user_status_page("service_batch_user", slug="service-batch")
  today = timezone.localdate()
  endpoint = Endpoints.objects.create(
    user=user,
    is_platform=False,
    url=service.url,
    status_code=503,
    response_time=datetime.timedelta(milliseconds=40),
    is_active=False,
  )
  Endpoints.objects.filter(id=endpoint.id).update(
    last_tested=_observed_at(today - datetime.timedelta(days=1))
  )
  _probe(
    service=service,
    observed_at=_observed_at(today),
    status_code=200,
    is_active=True,
    key="service-batch-current",
  )

  with django_assert_num_queries(4):
    snapshots = MetricsService.for_services([service], page=page)

  assert snapshots[service.id].status == "Operational"
  assert snapshots[service.id].sla == 50.0


@pytest.mark.django_db
def test_archive_status_uptime_is_idempotent_and_reconciles_counts() -> None:
  _user, page, service = _user_status_page("archive_uptime_user", slug="archive-uptime")
  report_date = timezone.localdate() - datetime.timedelta(days=1)
  observed_at = _observed_at(report_date)
  command = ArchiveReportsCommand()
  StatusPage.objects.filter(id=page.id).update(
    created_at=_observed_at(report_date - datetime.timedelta(days=1))
  )
  page.refresh_from_db()

  _probe(
    service=service,
    observed_at=observed_at,
    status_code=404,
    is_active=True,
    key="archive-up",
  )
  _probe(
    service=service,
    observed_at=observed_at + datetime.timedelta(minutes=1),
    status_code=503,
    is_active=False,
    key="archive-down",
  )

  assert command._archive_status_uptime([report_date]) == 1
  assert command._archive_status_uptime([report_date]) == 1
  assert (
    StatusPageUptimeDaily.objects.filter(status_page=page, report_date=report_date).count() == 1
  )
  rollup = StatusPageUptimeDaily.objects.get(status_page=page, report_date=report_date)
  assert rollup.total_checks == 2
  assert rollup.successful_checks == 1
  assert rollup.uptime_percent == 50.0

  _probe(
    service=service,
    observed_at=observed_at + datetime.timedelta(minutes=2),
    status_code=200,
    is_active=True,
    key="archive-late-up",
  )
  assert command._archive_status_uptime([report_date]) == 1

  rollup.refresh_from_db()
  assert (
    StatusPageUptimeDaily.objects.filter(status_page=page, report_date=report_date).count() == 1
  )
  assert rollup.total_checks == 3
  assert rollup.successful_checks == 2
  assert rollup.uptime_percent == 66.67


@pytest.mark.django_db
def test_archive_status_uptime_materializes_completed_no_probe_day() -> None:
  _user, page, _service = _user_status_page("no_probe_user", slug="no-probe-status")
  report_date = timezone.localdate() - datetime.timedelta(days=1)
  StatusPage.objects.filter(id=page.id).update(
    created_at=_observed_at(report_date - datetime.timedelta(days=1))
  )
  page.refresh_from_db()

  processed = ArchiveReportsCommand()._archive_status_uptime([report_date])

  assert processed == 1
  rollup = StatusPageUptimeDaily.objects.get(status_page=page, report_date=report_date)
  assert rollup.total_checks == 0
  assert rollup.successful_checks == 0
  metrics = MetricsService.for_status_page(page)
  assert metrics.uptime_history[-2].status == "no_data"
  assert metrics.uptime_history[-2].uptime is None
