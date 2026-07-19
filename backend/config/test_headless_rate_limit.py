from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import pytest
from django.test import RequestFactory, override_settings
from django.utils import timezone
from monitor.models import HeadlessRateLimitBucket

from config.headless_rate_limit import RateLimitDecision, consume, consume_many, hashed_scope
from config.middleware import HeadlessRateLimitMiddleware, _headless_limit_bucket


@pytest.mark.django_db
def test_token_bucket_is_durable_and_refills() -> None:
  scope = hashed_scope("api_key", uuid4(), "ingest")
  now = timezone.now()

  first = consume(scope_key=scope, capacity=2, now=now)
  second = consume(scope_key=scope, capacity=2, now=now)
  blocked = consume(scope_key=scope, capacity=2, now=now)
  refilled = consume(scope_key=scope, capacity=2, now=now + timedelta(seconds=30))

  assert first.allowed and first.remaining == 1
  assert second.allowed and second.remaining == 0
  assert not blocked.allowed and blocked.retry_after == 30
  assert refilled.allowed


@pytest.mark.django_db
def test_multi_scope_denial_does_not_partially_consume_other_scope() -> None:
  principal = hashed_scope("api_key", uuid4(), "write")
  account = hashed_scope("account", uuid4(), "write")
  now = timezone.now()
  HeadlessRateLimitBucket.objects.create(scope_key=principal, tokens=2, updated_at=now)
  HeadlessRateLimitBucket.objects.create(scope_key=account, tokens=0, updated_at=now)

  decisions = consume_many(scope_keys=(principal, account), capacity=2, now=now)

  assert any(not decision.allowed for decision in decisions)
  assert HeadlessRateLimitBucket.objects.get(scope_key=principal).tokens == 2


@pytest.mark.django_db
def test_waiter_never_moves_bucket_clock_backwards() -> None:
  scope = hashed_scope("api_key", uuid4(), "read")
  newer_commit = timezone.now()
  stale_observation = newer_commit - timedelta(seconds=10)
  HeadlessRateLimitBucket.objects.create(
    scope_key=scope,
    tokens=0,
    updated_at=newer_commit,
  )

  decision = consume(scope_key=scope, capacity=60, now=stale_observation)

  bucket = HeadlessRateLimitBucket.objects.get(scope_key=scope)
  assert decision.allowed is False
  assert bucket.updated_at == newer_commit


@override_settings(
  DEML_HEADLESS_RATE_LIMIT_ENABLED=True,
  DEML_HEADLESS_INGEST_RPM=2,
)
@patch("config.middleware.consume_many")
def test_middleware_limits_credential_and_account(mock_consume_many) -> None:
  mock_consume_many.return_value = (
    RateLimitDecision(True, 2, 1, 0),
    RateLimitDecision(False, 2, 0, 30),
  )
  request = RequestFactory().post("/api/v1/siem/signals")
  request.user = SimpleNamespace(
    is_authenticated=True,
    pk=7,
    profile=SimpleNamespace(account_id=uuid4()),
  )
  request.deml_api_key = SimpleNamespace(id=uuid4())

  response = HeadlessRateLimitMiddleware(lambda _request: None).process_request(request)

  assert response is not None
  assert response.status_code == 429
  assert response["Retry-After"] == "30"
  mock_consume_many.assert_called_once()
  assert len(mock_consume_many.call_args.kwargs["scope_keys"]) == 2


@override_settings(DEML_HEADLESS_INGEST_RPM=7, DEML_HEADLESS_WRITE_RPM=3)
def test_native_and_adapter_ingest_routes_share_the_ingest_quota() -> None:
  factory = RequestFactory()

  adapter = _headless_limit_bucket(factory.post("/api/v1/ingest/events:batch"))
  native = _headless_limit_bucket(factory.post("/api/v1/forjd/ingest/events:batch"))

  assert adapter == ("ingest", 7)
  assert native == adapter
