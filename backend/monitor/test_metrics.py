import datetime

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from monitor.models import AggregatedAnalytics, Endpoints, UserProfile
from monitor.services.metrics import MetricsService

User = get_user_model()


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
  )

  metrics = MetricsService.for_urls([url], user=None, is_platform=True)
  assert metrics.total_requests == 50
  assert metrics.p99_latency == 45.0
