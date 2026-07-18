"""Explicit Django BFF adapters for FORJD's currently shipped native routes."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Final, Literal
from urllib.parse import quote
from uuid import UUID

from asgiref.sync import sync_to_async
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from pydantic import ValidationError

from forjd.api import SealedEvent, SealedEventBatch, request_id_from
from forjd.client import ForjdClient, ForjdError
from forjd.tenancy import (
  ForjdTenantConfigurationError,
  ForjdTenantCredential,
  resolve_forjd_tenant_credential,
)

TenantBinding = Literal[
  "none",
  "query",
  "body",
  "sealed",
  "sealed_batch",
  "method",
  "sealed_method",
]
SUPPORTED_METHODS: Final[frozenset[str]] = frozenset({"GET", "POST", "DELETE"})


@dataclass(frozen=True, slots=True)
class AdapterError(RuntimeError):
  status: int
  detail: str


async def _credential_for_request(request: HttpRequest) -> ForjdTenantCredential:
  if not request.user.is_authenticated or not getattr(request, "firebase_token", None):
    raise AdapterError(401, "Authentication required")

  account_id = await sync_to_async(
    lambda: getattr(getattr(request.user, "profile", None), "account_id", None)
  )()
  if account_id is None:
    raise AdapterError(403, "The authenticated user has no DEML account")

  try:
    return await sync_to_async(resolve_forjd_tenant_credential)(account_id)
  except ForjdTenantConfigurationError as exc:
    raise AdapterError(503, "FORJD tenant service credential is unavailable") from exc


def _require_payload_tenant(payload_tenant_id: UUID, tenant_id: UUID) -> None:
  if payload_tenant_id != tenant_id:
    raise AdapterError(403, "Request tenant does not match the account's FORJD tenant")


def _bind_query(request: HttpRequest, tenant_id: UUID) -> str:
  query = request.GET.copy()
  supplied_tenants = query.getlist("tenant_id")
  if supplied_tenants and any(value != str(tenant_id) for value in supplied_tenants):
    raise AdapterError(403, "Request tenant does not match the account's FORJD tenant")
  query.setlist("tenant_id", [str(tenant_id)])
  return query.urlencode()


def _json_object(request: HttpRequest) -> dict[str, object]:
  try:
    payload = json.loads(request.body or b"{}")
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError) as exc:
    raise AdapterError(400, "Request body must be a JSON object") from exc
  if not isinstance(payload, dict):
    raise AdapterError(400, "Request body must be a JSON object")
  return payload


def _bind_body(request: HttpRequest, tenant_id: UUID) -> bytes:
  payload = _json_object(request)
  supplied_tenant = payload.get("tenant_id")
  if supplied_tenant is not None and str(supplied_tenant) != str(tenant_id):
    raise AdapterError(403, "Request tenant does not match the account's FORJD tenant")
  payload["tenant_id"] = str(tenant_id)
  return json.dumps(payload, separators=(",", ":")).encode()


def _validate_sealed_body(request: HttpRequest, tenant_id: UUID) -> bytes:
  try:
    payload = SealedEvent.model_validate_json(request.body)
  except ValidationError as exc:
    raise AdapterError(422, "Invalid sealed FORJD telemetry event") from exc
  _require_payload_tenant(payload.tenant_id, tenant_id)
  return payload.model_dump_json().encode()


def _validate_sealed_batch_body(request: HttpRequest, tenant_id: UUID) -> bytes:
  try:
    payload = SealedEventBatch.model_validate_json(request.body)
  except ValidationError as exc:
    raise AdapterError(422, "Invalid sealed FORJD telemetry batch") from exc
  for event in payload.events:
    _require_payload_tenant(event.tenant_id, tenant_id)
  return payload.model_dump_json().encode()


def _bound_request(
  request: HttpRequest,
  tenant_id: UUID,
  binding: TenantBinding,
) -> tuple[bytes | None, str]:
  resolved_binding = binding
  if binding == "method":
    resolved_binding = "query" if request.method == "GET" else "body"
  elif binding == "sealed_method":
    resolved_binding = "query" if request.method == "GET" else "sealed"

  if resolved_binding == "query":
    return request.body or None, _bind_query(request, tenant_id)
  if resolved_binding == "body":
    return _bind_body(request, tenant_id), request.META.get("QUERY_STRING", "")
  if resolved_binding == "sealed":
    return _validate_sealed_body(request, tenant_id), ""
  if resolved_binding == "sealed_batch":
    return _validate_sealed_batch_body(request, tenant_id), ""
  return request.body or None, request.META.get("QUERY_STRING", "")


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
async def native_forjd_proxy(
  request: HttpRequest,
  *,
  target_path: str,
  allowed_methods: tuple[str, ...],
  tenant_binding: TenantBinding = "none",
  public: bool = False,
) -> HttpResponse:
  """Call one allowlisted FORJD path with a service token, never Firebase auth."""
  if request.method not in allowed_methods or request.method not in SUPPORTED_METHODS:
    return JsonResponse({"detail": "Method not allowed"}, status=405)

  try:
    if public:
      client = ForjdClient(use_service_auth=False)
      body = request.body or None
      query_string = request.META.get("QUERY_STRING", "")
    else:
      credential = await _credential_for_request(request)
      client = ForjdClient(
        tenant_id=credential.tenant_id,
        service_token=credential.service_token,
      )
      body, query_string = _bound_request(request, credential.tenant_id, tenant_binding)

    response = await client.proxy(
      request.method,
      target_path,
      body=body,
      query_string=query_string,
      content_type=request.content_type or "application/json",
      request_id=request_id_from(request),
    )
    return HttpResponse(
      response.body,
      status=response.status,
      content_type=response.content_type,
    )
  except AdapterError as exc:
    return JsonResponse({"detail": exc.detail}, status=exc.status)
  except ForjdError as exc:
    return JsonResponse({"detail": str(exc), "source": "forjd"}, status=exc.status)


async def native_status_page_proxy(request: HttpRequest, slug: str) -> HttpResponse:
  response = await native_forjd_proxy(
    request,
    target_path=f"/api/v1/status/pages/slug/{quote(slug, safe='')}",
    allowed_methods=("GET",),
    public=True,
  )
  if response.status_code >= 400:
    return response
  try:
    upstream = json.loads(response.content)
    page = upstream["page"]
  except (KeyError, TypeError, UnicodeDecodeError, json.JSONDecodeError):
    return JsonResponse(
      {"detail": "FORJD returned an invalid public status-page response", "source": "forjd"},
      status=502,
    )
  if not isinstance(page, dict):
    return JsonResponse(
      {"detail": "FORJD returned an invalid public status-page response", "source": "forjd"},
      status=502,
    )
  return JsonResponse(page, status=response.status_code)


async def unsupported_forjd_proxy(
  request: HttpRequest,
  capability: str,
  **_path_parameters: str,
) -> HttpResponse:
  """Fail closed where FORJD has no service-principal-compatible contract."""
  if not request.user.is_authenticated and capability != "system-status":
    return JsonResponse({"detail": "Authentication required"}, status=401)
  return JsonResponse(
    {
      "detail": (
        f"The {capability} capability is blocked until FORJD ships a supported "
        "service-principal contract"
      ),
      "code": "forjd_capability_unavailable",
    },
    status=501,
  )
