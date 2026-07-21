"""CSRF-exempt + header-auth gate unit tests."""

from __future__ import annotations

import json
from unittest.mock import MagicMock

import pytest
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.test import RequestFactory

from config.csrf_header_auth import (
  authorization_header_required,
  csrf_exempt_require_header_auth,
)


def _request(
  *,
  authorization: str = "",
  x_api_key: str = "",
  authentication_type: str = "",
  deml_api_key: object | None = None,
) -> HttpRequest:
  factory = RequestFactory()
  request = factory.post("/api/v1/test", data=b"{}", content_type="application/json")
  if authorization:
    request.META["HTTP_AUTHORIZATION"] = authorization
  if x_api_key:
    request.META["HTTP_X_API_KEY"] = x_api_key
  request.authentication_type = authentication_type  # type: ignore[attr-defined]
  request.deml_api_key = deml_api_key  # type: ignore[attr-defined]
  return request


def test_authorization_header_required_accepts_firebase_bearer() -> None:
  request = _request(
    authorization="Bearer firebase-id-token",
    authentication_type="firebase",
  )
  assert authorization_header_required(request) is None


def test_authorization_header_required_accepts_deml_api_key_bearer() -> None:
  api_key = MagicMock()
  api_key.verify_key.return_value = True
  request = _request(
    authorization="Bearer deml_feed1234_testkey",  # pragma: allowlist secret
    authentication_type="api_key",
    deml_api_key=api_key,
  )
  assert authorization_header_required(request) is None
  api_key.verify_key.assert_called_once_with("deml_feed1234_testkey")


def test_authorization_header_required_accepts_x_api_key() -> None:
  api_key = MagicMock()
  api_key.verify_key.return_value = True
  request = _request(
    x_api_key="deml_feed1234_testkey",  # pragma: allowlist secret
    authentication_type="api_key",
    deml_api_key=api_key,
  )
  assert authorization_header_required(request) is None


def test_authorization_header_required_rejects_cookie_only_session() -> None:
  request = _request(authentication_type="")
  response = authorization_header_required(request)
  assert isinstance(response, JsonResponse)
  assert response.status_code == 401
  assert json.loads(response.content)["code"] == "authorization_header_required"


@pytest.mark.asyncio
async def test_csrf_exempt_require_header_auth_blocks_before_view() -> None:
  called = False

  @csrf_exempt_require_header_auth
  async def view(request: HttpRequest) -> HttpResponse:
    nonlocal called
    called = True
    return HttpResponse("ok")

  response = await view(_request(authentication_type=""))
  assert response.status_code == 401
  assert called is False


@pytest.mark.asyncio
async def test_csrf_exempt_require_header_auth_runs_view_with_header() -> None:
  @csrf_exempt_require_header_auth
  async def view(request: HttpRequest) -> HttpResponse:
    return HttpResponse("ok")

  response = await view(_request(authorization="Bearer token", authentication_type="firebase"))
  assert response.status_code == 200
  assert response.content == b"ok"
  # Decorator composes csrf_exempt so Django CSRF middleware skips this view.
  assert getattr(view, "csrf_exempt", False) is True


def test_sync_csrf_exempt_require_header_auth() -> None:
  @csrf_exempt_require_header_auth
  def view(request: HttpRequest) -> HttpResponse:
    return HttpResponse("sync-ok")

  denied = view(_request())
  assert denied.status_code == 401

  allowed = view(_request(authorization="Bearer t", authentication_type="firebase"))
  assert allowed.content == b"sync-ok"
