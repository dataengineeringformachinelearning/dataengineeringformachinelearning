"""Subscription helpers for public status page surfaces."""

from __future__ import annotations

from monitor.models import StatusPage, UserProfile


def owner_has_pro_subscription(page: StatusPage) -> bool:
  """True when the page owner has an active Pro tier subscription."""
  if page.is_platform or page.slug == "platform-status" or not page.user_id:
    return False

  user = getattr(page, "user", None)
  if user is None:
    return False

  profile: UserProfile | None = getattr(user, "profile", None)
  if profile is None:
    try:
      profile = UserProfile.objects.filter(user_id=page.user_id).first()
    except Exception:
      return False

  if profile is None:
    return False

  return profile.tier == "Pro" and profile.subscription_active
