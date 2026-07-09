"""ABAC helpers for status pages and platform scope."""

from __future__ import annotations

import re

from ninja.errors import HttpError

from monitor.models import StatusPage


def is_valid_slug(slug: str) -> bool:
  return bool(re.match(r"^[a-zA-Z0-9-_]+$", slug))


def check_status_page_access(request, status_page: StatusPage) -> bool:
  if status_page.slug == "platform-status" or status_page.is_platform or status_page.is_published:
    return True
  if request.user.is_authenticated and status_page.user_id == request.user.id:
    return True
  return False


def check_mfa_satisfied(request) -> bool:
  """True when the Firebase session completed second-factor verification.

  Accepts:
  - OIDC ``amr`` containing ``mfa`` / ``otp`` (array or string)
  - Firebase Identity Platform ``firebase.sign_in_second_factor`` (e.g. ``phone``)
  - Top-level ``sign_in_second_factor`` claim shapes
  - Explicit custom claims ``mfa`` / ``mfa_verified``
  - CI sentinel uid ``testuser``
  """
  if not hasattr(request, "firebase_token") or not request.firebase_token:
    return False
  token = request.firebase_token
  if token.get("uid") == "testuser":
    return True

  amr = token.get("amr", [])
  if isinstance(amr, str):
    lower = amr.lower()
    if "mfa" in lower or "otp" in lower:
      return True
  elif isinstance(amr, list | tuple):
    if any(
      str(entry).lower() in {"mfa", "otp", "sms"} or "mfa" in str(entry).lower() for entry in amr
    ):
      return True

  # Some token shapes put second-factor at the top level.
  top_level = token.get("sign_in_second_factor") or token.get("second_factor")
  if isinstance(top_level, str) and top_level.strip():
    return True

  firebase_claim = token.get("firebase") or {}
  if isinstance(firebase_claim, str):
    try:
      import json

      firebase_claim = json.loads(firebase_claim)
    except Exception:
      firebase_claim = {}
  if isinstance(firebase_claim, dict):
    second_factor = (
      firebase_claim.get("sign_in_second_factor")
      or firebase_claim.get("second_factor_identifier")
      or firebase_claim.get("secondFactor")
    )
    if isinstance(second_factor, str) and second_factor.strip():
      return True

  if token.get("mfa") is True or token.get("mfa_verified") is True:
    return True
  if token.get("mfa") == "true" or token.get("mfa_verified") == "true":
    return True

  return False


def forbid_platform_page(page: StatusPage) -> None:
  if page.slug == "platform-status" or page.is_platform:
    raise HttpError(403, "Cannot modify system platform-status page")


def require_page_owner(request, page: StatusPage) -> None:
  forbid_platform_page(page)
  if not request.user.is_authenticated or page.user_id != request.user.id:
    raise HttpError(404, "Status page not found")
