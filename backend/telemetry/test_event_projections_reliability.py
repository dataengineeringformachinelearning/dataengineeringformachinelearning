from __future__ import annotations

import json
from types import SimpleNamespace
from typing import NamedTuple
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from telemetry.event_contract import (
  IdempotencyConflictError,
  projection_payload_hash,
  validate_idempotency_key,
)
from telemetry.management.commands.replay_projection_dlq import Command as ReplayCommand
from telemetry.worker.projectors import _project_frontend_event, consume_kafka_batch


class Topic(NamedTuple):
  topic: str


def _style() -> MagicMock:
  style = MagicMock()
  style.ERROR.side_effect = lambda value: value
  style.SUCCESS.side_effect = lambda value: value
  style.WARNING.side_effect = lambda value: value
  return style


def test_idempotency_key_contract_and_payload_hash() -> None:
  key = "verify-1234567890abcdef"
  assert validate_idempotency_key(key) == key
  assert projection_payload_hash("get_stats", {"value": 1}) == projection_payload_hash(
    "get_stats", {"value": 1}
  )
  assert projection_payload_hash("get_stats", {"value": 1}) != projection_payload_hash(
    "get_stats", {"value": 2}
  )
  with pytest.raises(ValueError, match="16-128"):
    validate_idempotency_key("short")
  with pytest.raises(ValueError, match="unsupported"):
    validate_idempotency_key("verify/1234567890abcdef")


def test_projector_rejects_idempotency_key_reuse_with_changed_payload() -> None:
  dedup_snapshot = MagicMock(exists=True)
  dedup_snapshot.to_dict.return_value = {"payload_hash": "different-hash"}
  dedup_ref = MagicMock()
  dedup_ref.get.return_value = dedup_snapshot
  user_document = MagicMock()
  user_document.collection.return_value.document.return_value = dedup_ref
  database = MagicMock()
  database.collection.return_value.document.return_value = user_document

  with (
    patch("firebase_admin.firestore.client", return_value=database),
    pytest.raises(IdempotencyConflictError, match="different payload"),
  ):
    _project_frontend_event(
      MagicMock(),
      MagicMock(),
      "firebase-user",
      "noop",
      {"action": "noop"},
      "verify-1234567890abcdef",
    )


def test_projector_propagates_firestore_failure() -> None:
  dedup_snapshot = MagicMock(exists=False)
  dedup_ref = MagicMock()
  dedup_ref.get.return_value = dedup_snapshot
  stats_ref = MagicMock()
  stats_ref.set.side_effect = RuntimeError("firestore unavailable")
  processed_collection = MagicMock()
  processed_collection.document.return_value = dedup_ref
  data_collection = MagicMock()
  data_collection.document.return_value = stats_ref
  user_document = MagicMock()
  user_document.collection.side_effect = lambda name: (
    processed_collection if name == "processed_events" else data_collection
  )
  users_collection = MagicMock()
  users_collection.document.return_value = user_document
  database = MagicMock()
  database.collection.return_value = users_collection

  with (
    patch("firebase_admin.firestore.client", return_value=database),
    pytest.raises(RuntimeError, match="firestore unavailable"),
  ):
    _project_frontend_event(
      MagicMock(),
      MagicMock(),
      "firebase-user",
      "noop",
      {"action": "noop"},
      "verify-1234567890abcdef",
    )


@pytest.mark.asyncio
async def test_frontend_projection_failure_is_acknowledged_to_dlq() -> None:
  event = {
    "uid": "firebase-user",
    "version": "1.0",
    "idempotency_key": "verify-1234567890abcdef",
    "payload": {"action": "get_stats"},
  }
  message = SimpleNamespace(
    value=json.dumps(event).encode("utf-8"),
    key=b"firebase-user",
    partition=0,
    offset=42,
  )
  consumer = MagicMock()
  consumer.getmany = AsyncMock(return_value={Topic("frontend-events"): [message]})
  consumer.commit = AsyncMock()
  producer = MagicMock()
  producer.send_and_wait = AsyncMock()

  with (
    patch(
      "telemetry.worker.projectors.process_frontend_event",
      new=AsyncMock(side_effect=RuntimeError("projection failed")),
    ),
    patch(
      "telemetry.worker.projectors.get_kafka_producer",
      new=AsyncMock(return_value=producer),
    ),
  ):
    result = await consume_kafka_batch(
      consumer,
      MagicMock(),
      MagicMock(),
      _style(),
    )

  assert result is True
  producer.send_and_wait.assert_awaited_once()
  consumer.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_frontend_batch_is_not_committed_when_dlq_publish_fails() -> None:
  event = {
    "uid": "firebase-user",
    "version": "1.0",
    "idempotency_key": "verify-1234567890abcdef",
    "payload": {"action": "get_stats"},
  }
  message = SimpleNamespace(
    value=json.dumps(event).encode("utf-8"),
    key=b"firebase-user",
    partition=0,
    offset=43,
  )
  consumer = MagicMock()
  consumer.getmany = AsyncMock(return_value={Topic("frontend-events"): [message]})
  consumer.commit = AsyncMock()
  producer = MagicMock()
  producer.send_and_wait = AsyncMock(side_effect=RuntimeError("broker unavailable"))

  with (
    patch(
      "telemetry.worker.projectors.process_frontend_event",
      new=AsyncMock(side_effect=RuntimeError("projection failed")),
    ),
    patch(
      "telemetry.worker.projectors.get_kafka_producer",
      new=AsyncMock(return_value=producer),
    ),
  ):
    result = await consume_kafka_batch(
      consumer,
      MagicMock(),
      MagicMock(),
      _style(),
    )

  assert result is False
  consumer.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_projection_dlq_replay_commits_only_after_acknowledged_publish() -> None:
  message = SimpleNamespace(
    value=b'{"version":"1.0"}',
    key=b"firebase-user",
    partition=0,
    offset=7,
  )
  consumer = MagicMock()
  consumer.start = AsyncMock()
  consumer.stop = AsyncMock()
  consumer.getmany = AsyncMock(return_value={Topic("frontend-events-dlq"): [message]})
  consumer.commit = AsyncMock()
  producer = MagicMock()
  producer.send_and_wait = AsyncMock()

  with (
    patch(
      "telemetry.management.commands.replay_projection_dlq.AIOKafkaConsumer",
      return_value=consumer,
    ),
    patch(
      "telemetry.management.commands.replay_projection_dlq.get_kafka_producer",
      new=AsyncMock(return_value=producer),
    ),
  ):
    await ReplayCommand()._replay(max_records=10, timeout_ms=100, dry_run=False)

  producer.send_and_wait.assert_awaited_once()
  consumer.commit.assert_awaited_once()
  consumer.stop.assert_awaited_once()


@pytest.mark.asyncio
async def test_projection_dlq_replay_does_not_commit_failed_publish() -> None:
  message = SimpleNamespace(
    value=b'{"version":"1.0"}',
    key=b"firebase-user",
    partition=0,
    offset=8,
  )
  consumer = MagicMock()
  consumer.start = AsyncMock()
  consumer.stop = AsyncMock()
  consumer.getmany = AsyncMock(return_value={Topic("frontend-events-dlq"): [message]})
  consumer.commit = AsyncMock()
  producer = MagicMock()
  producer.send_and_wait = AsyncMock(side_effect=RuntimeError("publish failed"))

  with (
    patch(
      "telemetry.management.commands.replay_projection_dlq.AIOKafkaConsumer",
      return_value=consumer,
    ),
    patch(
      "telemetry.management.commands.replay_projection_dlq.get_kafka_producer",
      new=AsyncMock(return_value=producer),
    ),
    pytest.raises(RuntimeError, match="publish failed"),
  ):
    await ReplayCommand()._replay(max_records=10, timeout_ms=100, dry_run=False)

  consumer.commit.assert_not_awaited()
  consumer.stop.assert_awaited_once()
