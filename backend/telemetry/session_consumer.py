"""WebSocket consumer for server-initiated session revoke (Dragonfly + Channels)."""

from __future__ import annotations

import json
import logging
import urllib.parse

from channels.generic.websocket import AsyncWebsocketConsumer
from firebase_admin import auth

logger = logging.getLogger(__name__)


class SessionConsumer(AsyncWebsocketConsumer):
  async def connect(self) -> None:
    query = urllib.parse.parse_qs(self.scope.get("query_string", b"").decode())
    token_list = query.get("token", [])
    session_list = query.get("session_id", [])
    if not token_list:
      await self.close()
      return

    token = token_list[0]
    self.session_id = session_list[0] if session_list else ""

    try:
      from django.conf import settings

      if settings.DEBUG and token.startswith("mock-token-"):
        parts = token.split("-")
        uid = parts[2] if len(parts) > 2 else "mock_user"
      else:
        decoded = auth.verify_id_token(token)
        uid = decoded.get("uid")
      if not uid:
        await self.close()
        return
      self.firebase_uid = uid
    except Exception:
      logger.exception("Session WS auth failed")
      await self.close()
      return

    self.group_name = f"session_user_{self.firebase_uid}"
    await self.channel_layer.group_add(self.group_name, self.channel_name)
    await self.accept()

  async def disconnect(self, close_code: int) -> None:
    if hasattr(self, "group_name"):
      await self.channel_layer.group_discard(self.group_name, self.channel_name)

  async def session_force_logout(self, event: dict) -> None:
    target = event.get("session_id")
    if target and self.session_id and target != self.session_id:
      return
    await self.send(
      text_data=json.dumps(
        {
          "type": "force_logout",
          "reason": event.get("reason", "revoked"),
          "session_id": target,
        }
      )
    )
