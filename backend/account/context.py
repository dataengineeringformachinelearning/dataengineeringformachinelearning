"""Resolve the authenticated user's account scope for API handlers."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from django.contrib.auth import get_user_model
from ninja.errors import HttpError

from account.platform import PLATFORM_ACCOUNT_ID

User = get_user_model()


@dataclass(frozen=True)
class AccountContext:
  user: User
  account_id: uuid.UUID
  is_platform: bool = False


def require_auth(request) -> User:
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")
  return request.user


def account_context(request) -> AccountContext:
  """Caller must be authenticated; returns profile account_id for event correlation."""
  user = require_auth(request)
  profile = getattr(user, "profile", None)
  if profile is None or not profile.account_id:
    raise HttpError(403, "Account profile not provisioned")
  return AccountContext(user=user, account_id=profile.account_id)


def resolve_account_id(raw: str | None) -> str | None:
  """Normalize external account key from ingest payloads."""
  if not raw or raw == PLATFORM_ACCOUNT_ID:
    return PLATFORM_ACCOUNT_ID
  return raw


def resolve_scope_from_account_id(raw: str | None) -> tuple[User | None, bool]:
  """Return (user, is_platform) for telemetry and analytics scopes."""
  normalized = resolve_account_id(raw)
  if normalized == PLATFORM_ACCOUNT_ID:
    return None, True
  if not normalized:
    return None, False
  from monitor.models import UserProfile

  try:
    profile = UserProfile.objects.select_related("user").get(account_id=normalized)
    return profile.user, False
  except (UserProfile.DoesNotExist, ValueError, TypeError):
    return None, False


def account_id_for_user(user: User) -> str:
  """External account key for a login user."""
  profile = getattr(user, "profile", None)
  if profile is None or not profile.account_id:
    raise HttpError(403, "Account profile not provisioned")
  return str(profile.account_id)
