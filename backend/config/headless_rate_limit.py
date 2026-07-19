"""Distributed token buckets for authenticated DEML → FORJD requests."""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass
from datetime import datetime

from django.db import transaction
from django.utils import timezone
from monitor.models import HeadlessRateLimitBucket


@dataclass(frozen=True, slots=True)
class RateLimitDecision:
  allowed: bool
  limit: int
  remaining: int
  retry_after: int


def hashed_scope(kind: str, identifier: object, bucket: str) -> str:
  """Keep account, user, and API-key identifiers out of rate-limit rows."""
  return hashlib.sha256(f"{kind}:{identifier}:{bucket}".encode()).hexdigest()


def consume(
  *,
  scope_key: str,
  capacity: int,
  now: datetime | None = None,
) -> RateLimitDecision:
  """Consume one token under a row lock; safe across Django replicas."""
  return consume_many(scope_keys=(scope_key,), capacity=capacity, now=now)[0]


def consume_many(
  *,
  scope_keys: tuple[str, ...],
  capacity: int,
  now: datetime | None = None,
) -> tuple[RateLimitDecision, ...]:
  """Atomically consume one request across every applicable quota scope."""
  bounded_capacity = max(1, int(capacity))
  insertion_time = now or timezone.now()
  ordered_keys = tuple(sorted(set(scope_keys)))
  if not ordered_keys:
    return ()

  with transaction.atomic():
    # Inserting before locking avoids the get_or_create missing-row race when
    # two replicas see a new credential at the same time.
    HeadlessRateLimitBucket.objects.bulk_create(
      [
        HeadlessRateLimitBucket(
          scope_key=scope_key,
          tokens=float(bounded_capacity),
          updated_at=insertion_time,
        )
        for scope_key in ordered_keys
      ],
      ignore_conflicts=True,
    )
    buckets = list(
      HeadlessRateLimitBucket.objects.select_for_update()
      .filter(scope_key__in=ordered_keys)
      .order_by("scope_key")
    )
    if len(buckets) != len(ordered_keys):
      raise RuntimeError("Unable to initialize every rate-limit scope")

    # Capture the real clock only after every row lock has been acquired. A
    # waiter must never write its older pre-lock timestamp over a newer commit.
    observed_at = now or timezone.now()
    available_by_scope: dict[str, float] = {}
    effective_time_by_scope: dict[str, datetime] = {}
    for bucket in buckets:
      effective_time = max(observed_at, bucket.updated_at)
      effective_time_by_scope[bucket.scope_key] = effective_time
      elapsed = (effective_time - bucket.updated_at).total_seconds()
      available_by_scope[bucket.scope_key] = min(
        float(bounded_capacity),
        float(bucket.tokens) + elapsed * (float(bounded_capacity) / 60.0),
      )
    request_allowed = all(value >= 1.0 for value in available_by_scope.values())
    for bucket in buckets:
      available = available_by_scope[bucket.scope_key]
      bucket.tokens = available - 1.0 if request_allowed else available
      bucket.updated_at = effective_time_by_scope[bucket.scope_key]
    HeadlessRateLimitBucket.objects.bulk_update(buckets, ("tokens", "updated_at"))

  decisions = []
  for bucket in buckets:
    available = available_by_scope[bucket.scope_key]
    scope_allowed = available >= 1.0
    retry_after = (
      0 if scope_allowed else max(1, math.ceil((1.0 - available) * 60 / bounded_capacity))
    )
    decisions.append(
      RateLimitDecision(
        allowed=scope_allowed,
        limit=bounded_capacity,
        remaining=max(0, math.floor(bucket.tokens)),
        retry_after=retry_after,
      )
    )
  return tuple(decisions)
