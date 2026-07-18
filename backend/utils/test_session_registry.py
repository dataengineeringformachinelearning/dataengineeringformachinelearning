from __future__ import annotations

import pytest

from utils import session_registry


@pytest.mark.django_db
def test_register_and_validate_session() -> None:
  assert session_registry.register_session("sess-1", "uid-1", 42)
  assert session_registry.is_session_valid("sess-1", "uid-1")
  assert not session_registry.is_session_valid("sess-1", "uid-2")


@pytest.mark.django_db
def test_revoke_session() -> None:
  session_registry.register_session("sess-1", "uid-1", 42)
  assert session_registry.revoke_session("sess-1", "uid-1")
  assert not session_registry.is_session_valid("sess-1", "uid-1")


@pytest.mark.django_db
def test_handoff_store_and_consume() -> None:
  assert session_registry.store_handoff(
    "tok-abc",
    user_id=7,
    code_challenge="challenge",
    client_name="desktop",
  )
  payload = session_registry.consume_handoff("tok-abc")
  assert payload == {
    "user_id": 7,
    "code_challenge": "challenge",
    "client_name": "desktop",
  }
  assert session_registry.consume_handoff("tok-abc") is None
