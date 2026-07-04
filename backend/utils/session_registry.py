"""Dragonfly session registry — server-side session tracking + revoke fan-out."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from utils.rate_limit import redis_client

logger = logging.getLogger(__name__)

SESSION_PREFIX = "session:"
SESSIONS_USER_PREFIX = "sessions:user:"
SESSION_TTL_SECONDS = 3600
SESSION_EVENTS_PREFIX = "session:events:"


def _session_key(session_id: str) -> str:
  return f"{SESSION_PREFIX}{session_id}"


def _user_sessions_key(firebase_uid: str) -> str:
  return f"{SESSIONS_USER_PREFIX}{firebase_uid}"


def register_session(
  session_id: str,
  firebase_uid: str,
  user_id: int,
  *,
  user_agent: str = "",
  ip: str = "",
) -> bool:
  """Register or refresh a browser session (TTL aligned with Firebase ID token)."""
  if not redis_client or not session_id or not firebase_uid:
    return False
  try:
    now = int(time.time())
    key = _session_key(session_id)
    pipe = redis_client.pipeline()
    pipe.hset(
      key,
      mapping={
        "firebase_uid": firebase_uid,
        "user_id": str(user_id),
        "user_agent": user_agent[:512],
        "ip": ip[:64],
        "created_at": str(now),
        "last_seen": str(now),
      },
    )
    pipe.expire(key, SESSION_TTL_SECONDS)
    user_key = _user_sessions_key(firebase_uid)
    pipe.sadd(user_key, session_id)
    pipe.expire(user_key, SESSION_TTL_SECONDS)
    pipe.execute()
    return True
  except Exception as exc:
    logger.error("register_session failed: %s", exc)
    return False


def touch_session(session_id: str) -> bool:
  if not redis_client or not session_id:
    return False
  try:
    key = _session_key(session_id)
    if not redis_client.exists(key):
      return False
    pipe = redis_client.pipeline()
    pipe.hset(key, "last_seen", str(int(time.time())))
    pipe.expire(key, SESSION_TTL_SECONDS)
    pipe.execute()
    return True
  except Exception as exc:
    logger.error("touch_session failed: %s", exc)
    return False


def is_session_valid(session_id: str, firebase_uid: str) -> bool:
  if not redis_client or not session_id or not firebase_uid:
    return True
  try:
    data = redis_client.hgetall(_session_key(session_id))
    return bool(data) and data.get("firebase_uid") == firebase_uid
  except Exception:
    return True


def list_sessions(firebase_uid: str) -> list[dict[str, Any]]:
  if not redis_client or not firebase_uid:
    return []
  try:
    session_ids = redis_client.smembers(_user_sessions_key(firebase_uid))
    sessions: list[dict[str, Any]] = []
    for session_id in session_ids:
      data = redis_client.hgetall(_session_key(session_id))
      if not data:
        continue
      sessions.append(
        {
          "session_id": session_id,
          "user_agent": data.get("user_agent", ""),
          "ip": data.get("ip", ""),
          "created_at": int(data.get("created_at", 0)),
          "last_seen": int(data.get("last_seen", 0)),
        }
      )
    return sorted(sessions, key=lambda item: item["last_seen"], reverse=True)
  except Exception as exc:
    logger.error("list_sessions failed: %s", exc)
    return []


def revoke_session(session_id: str, firebase_uid: str) -> bool:
  if not redis_client or not session_id:
    return False
  try:
    key = _session_key(session_id)
    data = redis_client.hgetall(key)
    if data and data.get("firebase_uid") != firebase_uid:
      return False
    pipe = redis_client.pipeline()
    pipe.delete(key)
    pipe.srem(_user_sessions_key(firebase_uid), session_id)
    pipe.execute()
    return True
  except Exception as exc:
    logger.error("revoke_session failed: %s", exc)
    return False


def revoke_all_sessions(firebase_uid: str) -> int:
  if not redis_client or not firebase_uid:
    return 0
  try:
    session_ids = list(redis_client.smembers(_user_sessions_key(firebase_uid)))
    if not session_ids:
      return 0
    pipe = redis_client.pipeline()
    for session_id in session_ids:
      pipe.delete(_session_key(session_id))
    pipe.delete(_user_sessions_key(firebase_uid))
    pipe.execute()
    return len(session_ids)
  except Exception as exc:
    logger.error("revoke_all_sessions failed: %s", exc)
    return 0


def publish_session_event(firebase_uid: str, event: dict[str, Any]) -> None:
  """Redis pub-sub fan-out (complements Channels group_send for workers)."""
  if not redis_client or not firebase_uid:
    return
  try:
    redis_client.publish(f"{SESSION_EVENTS_PREFIX}{firebase_uid}", json.dumps(event))
  except Exception as exc:
    logger.error("publish_session_event failed: %s", exc)


def notify_force_logout(
  firebase_uid: str,
  *,
  session_id: str | None = None,
  reason: str = "revoked",
) -> None:
  """Push forced logout to WebSocket group + Redis pub-sub."""
  event = {"type": "force_logout", "session_id": session_id, "reason": reason}
  publish_session_event(firebase_uid, event)
  try:
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer

    layer = get_channel_layer()
    if layer:
      async_to_sync(layer.group_send)(
        f"session_user_{firebase_uid}",
        {"type": "session.force_logout", **event},
      )
  except Exception as exc:
    logger.error("notify_force_logout channels failed: %s", exc)
