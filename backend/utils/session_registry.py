"""Postgres session registry — server-side session tracking (no Dragonfly)."""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

SESSION_TTL_SECONDS = 3600


def register_session(
  session_id: str,
  firebase_uid: str,
  user_id: int,
  *,
  user_agent: str = "",
  ip: str = "",
) -> bool:
  """Register or refresh a browser session (TTL aligned with Firebase ID token)."""
  if not session_id or not firebase_uid:
    return False
  try:
    from monitor.models import BrowserSession

    now = timezone.now()
    expires = now + timedelta(seconds=SESSION_TTL_SECONDS)
    BrowserSession.objects.update_or_create(
      session_id=session_id,
      defaults={
        "firebase_uid": firebase_uid,
        "user_id": user_id,
        "user_agent": (user_agent or "")[:512],
        "ip": (ip or "")[:64],
        "expires_at": expires,
      },
    )
    return True
  except Exception as exc:
    logger.error("register_session failed: %s", exc)
    return False


def touch_session(session_id: str) -> bool:
  if not session_id:
    return False
  try:
    from monitor.models import BrowserSession

    now = timezone.now()
    updated = BrowserSession.objects.filter(
      session_id=session_id,
      expires_at__gt=now,
    ).update(
      last_seen=now,
      expires_at=now + timedelta(seconds=SESSION_TTL_SECONDS),
    )
    return bool(updated)
  except Exception as exc:
    logger.error("touch_session failed: %s", exc)
    return False


def is_session_valid(session_id: str, firebase_uid: str) -> bool:
  """Fail-open when session_id empty; fail-closed on uid mismatch."""
  if not session_id or not firebase_uid:
    return True
  try:
    from monitor.models import BrowserSession

    return BrowserSession.objects.filter(
      session_id=session_id,
      firebase_uid=firebase_uid,
      expires_at__gt=timezone.now(),
    ).exists()
  except Exception:
    # DB blip: fail-open so Firebase JWT alone can keep the UI up.
    return True


def list_sessions(firebase_uid: str) -> list[dict[str, Any]]:
  if not firebase_uid:
    return []
  try:
    from monitor.models import BrowserSession

    rows = (
      BrowserSession.objects.filter(
        firebase_uid=firebase_uid,
        expires_at__gt=timezone.now(),
      )
      .order_by("-last_seen")
      .values("session_id", "user_agent", "ip", "created_at", "last_seen")
    )
    return [
      {
        "session_id": row["session_id"],
        "user_agent": row["user_agent"] or "",
        "ip": row["ip"] or "",
        "created_at": int(row["created_at"].timestamp()) if row["created_at"] else 0,
        "last_seen": int(row["last_seen"].timestamp()) if row["last_seen"] else 0,
      }
      for row in rows
    ]
  except Exception as exc:
    logger.error("list_sessions failed: %s", exc)
    return []


def revoke_session(session_id: str, firebase_uid: str) -> bool:
  if not session_id or not firebase_uid:
    return False
  try:
    from monitor.models import BrowserSession

    deleted, _ = BrowserSession.objects.filter(
      session_id=session_id,
      firebase_uid=firebase_uid,
    ).delete()
    return deleted > 0
  except Exception as exc:
    logger.error("revoke_session failed: %s", exc)
    return False


def revoke_all_sessions(firebase_uid: str) -> int:
  if not firebase_uid:
    return 0
  try:
    from monitor.models import BrowserSession

    deleted, _ = BrowserSession.objects.filter(firebase_uid=firebase_uid).delete()
    return int(deleted)
  except Exception as exc:
    logger.error("revoke_all_sessions failed: %s", exc)
    return 0


def notify_force_logout(
  firebase_uid: str,
  *,
  session_id: str | None = None,
  reason: str = "revoked",
) -> None:
  """Best-effort Channels notify (InMemoryChannelLayer; WS route optional)."""
  del session_id  # reserved for future consumer payload
  if not firebase_uid:
    return
  try:
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer

    layer = get_channel_layer()
    if layer:
      async_to_sync(layer.group_send)(
        f"session_user_{firebase_uid}",
        {"type": "session.force_logout", "reason": reason},
      )
  except Exception as exc:
    logger.debug("notify_force_logout skipped: %s", exc)


def purge_expired_sessions() -> int:
  """Optional cleanup (call from cron / management command)."""
  try:
    from monitor.models import BrowserSession

    deleted, _ = BrowserSession.objects.filter(expires_at__lte=timezone.now()).delete()
    return int(deleted)
  except Exception as exc:
    logger.error("purge_expired_sessions failed: %s", exc)
    return 0


# --- Auth handoff (one-time tokens) ---
def store_handoff(
  token: str,
  *,
  user_id: int,
  code_challenge: str = "",
  client_name: str = "",
  ttl_seconds: int = 120,
) -> bool:
  import hashlib

  if not token:
    return False
  try:
    from monitor.models import AuthHandoffToken

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    AuthHandoffToken.objects.update_or_create(
      token_hash=token_hash,
      defaults={
        "user_id": user_id,
        "code_challenge": (code_challenge or "")[:128],
        "client_name": (client_name or "")[:64],
        "expires_at": timezone.now() + timedelta(seconds=ttl_seconds),
        "consumed_at": None,
      },
    )
    return True
  except Exception as exc:
    logger.error("store_handoff failed: %s", exc)
    return False


@transaction.atomic
def consume_handoff(token: str) -> dict[str, Any] | None:
  """Atomically read+consume a handoff; returns payload or None."""
  import hashlib

  if not token:
    return None
  try:
    from monitor.models import AuthHandoffToken

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    row = (
      AuthHandoffToken.objects.select_for_update()
      .filter(
        token_hash=token_hash,
        consumed_at__isnull=True,
        expires_at__gt=timezone.now(),
      )
      .first()
    )
    if row is None:
      return None
    row.consumed_at = timezone.now()
    row.save(update_fields=["consumed_at"])
    return {
      "user_id": row.user_id,
      "code_challenge": row.code_challenge or "",
      "client_name": row.client_name or "",
    }
  except Exception as exc:
    logger.error("consume_handoff failed: %s", exc)
    return None
