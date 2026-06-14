from collections.abc import Callable
from functools import wraps
from typing import Any

from ninja.errors import HttpError


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
