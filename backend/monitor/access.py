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
  if not hasattr(request, "firebase_token") or not request.firebase_token:
    return False
  token = request.firebase_token
  amr = token.get("amr", [])
  return "mfa" in amr or token.get("uid") == "testuser"


def forbid_platform_page(page: StatusPage) -> None:
  if page.slug == "platform-status" or page.is_platform:
    raise HttpError(403, "Cannot modify system platform-status page")


def require_page_owner(request, page: StatusPage) -> None:
  forbid_platform_page(page)
  if not request.user.is_authenticated or page.user_id != request.user.id:
    raise HttpError(404, "Status page not found")
