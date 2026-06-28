from collections.abc import Callable
from functools import wraps
from typing import Any

from account.context import require_auth as _require_auth
from monitor.access import require_page_owner
from monitor.models import StatusPage
from ninja.errors import HttpError

require_auth = _require_auth


def role_required(allowed_roles: list[str]) -> Callable:
  """Decorator for Django Ninja endpoints to validate user role access levels."""

  def decorator(func: Callable) -> Callable:
    @wraps(func)
    def wrapper(request: Any, *args: Any, **kwargs: Any) -> Any:
      if not request.user.is_authenticated:
        raise HttpError(401, "Not authenticated")

      role = "Viewer"
      if hasattr(request.user, "profile"):
        role = request.user.profile.role

      if role not in allowed_roles:
        raise HttpError(
          403, f"Access denied: {role} role does not have permission for this action."
        )

      return func(request, *args, **kwargs)

    return wrapper

  return decorator


def require_owner_page(page_id: str, request) -> StatusPage:
  """Load a status page owned by the caller; blocks platform mutations."""
  from django.shortcuts import get_object_or_404

  page = get_object_or_404(StatusPage, id=page_id)
  require_page_owner(request, page)
  return page
