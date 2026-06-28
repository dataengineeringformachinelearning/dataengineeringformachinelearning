"""Signed OAuth state tokens (integrity: bind callback to authenticated user)."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core import signing

User = get_user_model()
_OAUTH_SALT = "deml.google-oauth"
_MAX_AGE_SECONDS = 600


def sign_oauth_user_id(user_id: int) -> str:
  return signing.dumps({"uid": user_id}, salt=_OAUTH_SALT)


def unsign_oauth_state(state: str) -> int:
  payload = signing.loads(state, salt=_OAUTH_SALT, max_age=_MAX_AGE_SECONDS)
  return int(payload["uid"])
