from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from utils import session_registry


@pytest.fixture
def mock_redis() -> MagicMock:
  client = MagicMock()
  store: dict[str, Any] = {}
  sets: dict[str, set[str]] = {}

  def hset(key: str, mapping: dict[str, str] | None = None, **kwargs: Any) -> None:
    target = store.setdefault(key, {})
    if mapping:
      target.update(mapping)
    target.update(kwargs)

  def hgetall(key: str) -> dict[str, str]:
    return store.get(key, {})

  def sadd(key: str, value: str) -> None:
    sets.setdefault(key, set()).add(value)

  def srem(key: str, value: str) -> None:
    sets.get(key, set()).discard(value)

  def smembers(key: str) -> set[str]:
    return sets.get(key, set())

  def delete(key: str) -> None:
    store.pop(key, None)
    sets.pop(key, None)

  pipe = MagicMock()
  pipe.execute.return_value = None
  pipe.hset.side_effect = lambda key, mapping=None, **kwargs: hset(key, mapping=mapping, **kwargs)
  pipe.expire.side_effect = lambda key, ttl: None
  pipe.sadd.side_effect = sadd
  pipe.delete.side_effect = delete
  pipe.srem.side_effect = srem

  client.hset.side_effect = hset
  client.hgetall.side_effect = hgetall
  client.sadd.side_effect = sadd
  client.srem.side_effect = srem
  client.smembers.side_effect = smembers
  client.delete.side_effect = delete
  client.expire.side_effect = lambda key, ttl: None
  client.exists.side_effect = lambda key: 1 if key in store else 0
  client.publish.side_effect = lambda channel, message: None
  client.pipeline.return_value = pipe
  return client


def test_register_and_validate_session(mock_redis: MagicMock) -> None:
  with patch.object(session_registry, "redis_client", mock_redis):
    assert session_registry.register_session("sess-1", "uid-1", 42)
    assert session_registry.is_session_valid("sess-1", "uid-1")
    assert not session_registry.is_session_valid("sess-1", "uid-2")


def test_revoke_session(mock_redis: MagicMock) -> None:
  with patch.object(session_registry, "redis_client", mock_redis):
    session_registry.register_session("sess-1", "uid-1", 42)
    assert session_registry.revoke_session("sess-1", "uid-1")
    assert not session_registry.is_session_valid("sess-1", "uid-1")
