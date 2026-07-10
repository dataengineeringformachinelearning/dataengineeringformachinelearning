import uuid
from datetime import timedelta
from typing import Any

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone

from monitor.models import (
  HealthProbeObservation,
  MonitoredService,
  OutboxEvent,
  ScheduledTaskRun,
  StatusPage,
  TelemetryIngestReceipt,
  UserProfile,
)

User = get_user_model()


@pytest.mark.django_db
def test_outbox_idempotency_key_is_unique() -> None:
  OutboxEvent.objects.create(
    topic="app-events",
    payload={"value": 1},
    idempotency_key="ingest:account:batch-1",
  )
  with pytest.raises(IntegrityError), transaction.atomic():
    OutboxEvent.objects.create(
      topic="app-events",
      payload={"value": 2},
      idempotency_key="ingest:account:batch-1",
    )


@pytest.mark.django_db
def test_scheduler_bucket_and_kafka_receipt_are_idempotent() -> None:
  scheduled_for = timezone.now().replace(second=0, microsecond=0)
  ScheduledTaskRun.objects.create(task_name="db_cleanup", scheduled_for=scheduled_for)
  with pytest.raises(IntegrityError), transaction.atomic():
    ScheduledTaskRun.objects.create(task_name="db_cleanup", scheduled_for=scheduled_for)

  account_id = uuid.uuid4()
  TelemetryIngestReceipt.objects.create(
    topic="telemetry-raw",
    partition=0,
    offset=42,
    account_id=account_id,
  )
  with pytest.raises(IntegrityError), transaction.atomic():
    TelemetryIngestReceipt.objects.create(
      topic="telemetry-raw",
      partition=0,
      offset=42,
      account_id=account_id,
    )


@pytest.mark.django_db
def test_probe_observation_preserves_native_account_scope(db: Any) -> None:
  user = User.objects.create_user(username="rust-probe-user")
  profile = UserProfile.objects.create(user=user)
  page = StatusPage.objects.create(user=user, title="Probe", slug="rust-probe")
  service = MonitoredService.objects.create(
    status_page=page,
    name="Public target",
    url="https://example.com/health",
  )
  observation = HealthProbeObservation.objects.create(
    observation_key=f"{service.id}:1",
    monitored_service=service,
    user=user,
    account_id=profile.account_id,
    is_platform=False,
    url=service.url,
    status_code=200,
    response_time_ms=25,
    is_active=True,
    observed_at=timezone.now() - timedelta(seconds=1),
  )
  assert observation.account_id == profile.account_id
  assert observation.is_platform is False
