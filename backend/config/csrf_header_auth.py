"""CSRF-exempt views that must never trust cookie/session authority alone.

Classic Django CSRF protects cookie-authenticated browser forms. DEML headless
and SOAR control routes are CSRF-exempt because callers authenticate with a
non-cookie credential (Firebase Bearer, deml_ API key via Authorization or
X-API-Key). This module centralizes that invariant so new @csrf_exempt write
paths cannot forget the header gate.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from functools import wraps
from typing import Any, ParamSpec, TypeVar

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

P = ParamSpec("P")
R = TypeVar("R", bound=HttpResponse)


def authorization_header_required(request: HttpRequest) -> JsonResponse | None:
  """Return 401 when the request lacks a verified non-cookie credential header.

  Relies on FirebaseAuthenticationMiddleware having classified the request as
  ``firebase`` or ``api_key`` and, for API keys, verified the secret.
  """
  authorization = str(request.META.get("HTTP_AUTHORIZATION") or "").strip()
  scheme, separator, credential = authorization.partition(" ")
  credential = credential.strip()
  authentication_type = str(getattr(request, "authentication_type", "") or "")
  if authentication_type == "firebase" and separator and scheme.lower() == "bearer" and credential:
    return None
  if authentication_type == "api_key" and separator and credential:
    valid_scheme = scheme.lower() == "apikey" or (
      scheme.lower() == "bearer" and credential.startswith("deml_")
    )
    api_key = getattr(request, "deml_api_key", None)
    if valid_scheme and api_key is not None and api_key.verify_key(credential):
      return None
  if authentication_type == "api_key":
    explicit_api_key = str(request.META.get("HTTP_X_API_KEY") or "").strip()
    api_key = getattr(request, "deml_api_key", None)
    if explicit_api_key and api_key is not None and api_key.verify_key(explicit_api_key):
      return None
  return JsonResponse(
    {
      "detail": "Authorization header required",
      "code": "authorization_header_required",
    },
    status=401,
  )


def csrf_exempt_require_header_auth(
  view: Callable[P, Awaitable[R]] | Callable[P, R],
) -> Callable[P, Awaitable[HttpResponse]] | Callable[P, HttpResponse]:
  """Mark a view CSRF-exempt and require Authorization / X-API-Key on entry.

  Use for SOAR control and other high-impact writes that must remain callable
  from headless clients without a CSRF cookie while rejecting cookie-only
  browser sessions.
  """
  if _is_coroutine_function(view):

    @csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
    @wraps(view)
    async def async_wrapped(
      request: HttpRequest, *args: P.args, **kwargs: P.kwargs
    ) -> HttpResponse:
      if auth_error := authorization_header_required(request):
        return auth_error
      return await view(request, *args, **kwargs)  # type: ignore[misc]

    return async_wrapped

  @csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
  @wraps(view)
  def sync_wrapped(request: HttpRequest, *args: P.args, **kwargs: P.kwargs) -> HttpResponse:
    if auth_error := authorization_header_required(request):
      return auth_error
    return view(request, *args, **kwargs)  # type: ignore[return-value]

  return sync_wrapped


def _is_coroutine_function(func: Callable[..., Any]) -> bool:
  import inspect

  return inspect.iscoroutinefunction(func)
