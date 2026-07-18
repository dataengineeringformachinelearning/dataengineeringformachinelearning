"""Explicit Django BFF adapters for FORJD's currently shipped native routes.

Angular paths stay stable. Django injects the mapped tenant + ``fjsvc_`` token,
calls real FORJD routes, and reshapes responses to the established DEML UX
contracts where needed. No Firebase credentials are forwarded.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Final, Literal
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
SUPPORTED_METHODS: Final[frozenset[str]] = frozenset({"GET", "POST", "DELETE", "PUT"})


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


def _client_for_credential(credential: ForjdTenantCredential) -> ForjdClient:
  return ForjdClient(
    tenant_id=credential.tenant_id,
    service_token=credential.service_token,
  )


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
async def native_forjd_proxy(
  request: HttpRequest,
  *,
  target_path: str,
  allowed_methods: tuple[str, ...],
  tenant_binding: TenantBinding = "none",
  public: bool = False,
  **path_params: str,
) -> HttpResponse:
  """Call one allowlisted FORJD path with a service token, never Firebase auth."""
  if request.method not in allowed_methods or request.method not in SUPPORTED_METHODS:
    return JsonResponse({"detail": "Method not allowed"}, status=405)

  resolved_path = target_path
  if path_params:
    try:
      resolved_path = target_path.format(
        **{key: quote(str(value), safe="") for key, value in path_params.items()}
      )
    except (KeyError, ValueError):
      return JsonResponse({"detail": "Invalid FORJD adapter path"}, status=500)

  try:
    if public:
      client = ForjdClient(use_service_auth=False)
      body = request.body or None
      query_string = request.META.get("QUERY_STRING", "")
    else:
      credential = await _credential_for_request(request)
      client = _client_for_credential(credential)
      body, query_string = _bound_request(request, credential.tenant_id, tenant_binding)

    response = await client.proxy(
      request.method,
      resolved_path,
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


def _map_status_page(page: dict[str, Any]) -> dict[str, Any]:
  """Map FORJD status page → established Angular StatusPageData fields."""
  return {
    "id": page.get("id"),
    "title": page.get("title", ""),
    "slug": page.get("slug", ""),
    "description": page.get("description", ""),
    "is_published": bool(page.get("is_published", False)),
    "created_at": page.get("created_at") or "",
    "user_id": None,
  }


def _map_analytics_overview(upstream: dict[str, Any]) -> dict[str, Any]:
  """Map FORJD analytics overview → dashboard/analytics UX contract."""
  ces = upstream.get("ces") if isinstance(upstream.get("ces"), dict) else {}
  return {
    "status": "success",
    "data": {
      "ces": {
        "level": ces.get("ces_level", 0),
        "threat": ces.get("ces_threat", 0),
        "sla": ces.get("ces_sla", 0),
        "stability": ces.get("ces_stability", 0),
        "spiking_temporal_forecast": 0,
      },
      "user_metrics": {
        "p99_latency_ms": upstream.get("p99_latency_ms", 0),
        "uptime_percent": upstream.get("uptime_pct", 0),
        "total_requests_24h": upstream.get("total_requests", 0),
        "active_incidents": upstream.get("active_incidents", 0),
        "threats_detected": upstream.get("threats_detected", 0),
        "unique_visitors": 0,
        "available_sites": [],
        "time_series": [],
        "uptime_series": [],
      },
      "benchmarking": {"current_scope": None, "platform_reference": None},
      "forjd_status": upstream.get("status"),
      "window_hours": upstream.get("window_hours", 24),
    },
  }


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
async def analytics_overview_proxy(request: HttpRequest) -> HttpResponse:
  """GET /api/v1/analytics/overview → FORJD overview, reshaped for Angular."""
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    credential = await _credential_for_request(request)
    # Ignore DEML-local tenant_id / site_url filters; FORJD is bound by service token.
    upstream = await _client_for_credential(credential).analytics_overview(
      request_id=request_id_from(request),
    )
    return JsonResponse(_map_analytics_overview(upstream))
  except AdapterError as exc:
    return JsonResponse({"detail": exc.detail}, status=exc.status)
  except ForjdError as exc:
    return JsonResponse({"detail": str(exc), "source": "forjd"}, status=exc.status)


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
async def analytics_tenants_proxy(request: HttpRequest) -> HttpResponse:
  """Synthesize tenant picker options from the DEML→FORJD mapping (control plane)."""
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    credential = await _credential_for_request(request)
  except AdapterError as exc:
    return JsonResponse({"detail": exc.detail}, status=exc.status)
  return JsonResponse(
    {
      "status": "success",
      "data": [
        {
          "id": str(credential.tenant_id),
          "name": "FORJD tenant",
          "is_platform": False,
        }
      ],
    }
  )


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
async def status_pages_collection_proxy(request: HttpRequest) -> HttpResponse:
  """List/create status pages via FORJD; reshape to Angular array/object contracts."""
  if request.method not in {"GET", "POST"}:
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    credential = await _credential_for_request(request)
    client = _client_for_credential(credential)
    if request.method == "GET":
      upstream = await client.list_status_pages(request_id=request_id_from(request))
      pages = upstream.get("pages")
      if not isinstance(pages, list):
        raise AdapterError(502, "FORJD returned an invalid status-pages response")
      return JsonResponse([_map_status_page(p) for p in pages if isinstance(p, dict)], safe=False)

    payload = _json_object(request)
    forjd_payload = {
      "slug": str(payload.get("slug") or "").strip(),
      "title": str(payload.get("title") or "").strip(),
      "description": str(payload.get("description") or ""),
      "is_published": bool(payload.get("is_published", False)),
    }
    if not forjd_payload["slug"] or not forjd_payload["title"]:
      raise AdapterError(400, "title and slug are required")
    upstream = await client.create_status_page(
      forjd_payload,
      request_id=request_id_from(request),
    )
    page = upstream.get("page")
    if not isinstance(page, dict):
      raise AdapterError(502, "FORJD returned an invalid status-page response")
    return JsonResponse(_map_status_page(page), status=201)
  except AdapterError as exc:
    return JsonResponse({"detail": exc.detail}, status=exc.status)
  except ForjdError as exc:
    return JsonResponse({"detail": str(exc), "source": "forjd"}, status=exc.status)


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
async def status_page_services_proxy(request: HttpRequest, page_id: str) -> HttpResponse:
  """POST create service on FORJD; GET returns [] (FORJD has no per-page list yet)."""
  if request.method == "GET":
    if not request.user.is_authenticated or not getattr(request, "firebase_token", None):
      return JsonResponse({"detail": "Authentication required"}, status=401)
    return JsonResponse([], safe=False)
  if request.method != "POST":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    credential = await _credential_for_request(request)
    payload = _json_object(request)
    name = str(payload.get("name") or "").strip()
    if not name:
      raise AdapterError(400, "name is required")
    description = str(payload.get("url") or payload.get("description") or "")
    response = await _client_for_credential(credential).proxy(
      "POST",
      f"/api/v1/status/pages/{quote(page_id, safe='')}/services",
      body=json.dumps(
        {
          "tenant_id": str(credential.tenant_id),
          "name": name,
          "description": description,
          "status": "operational",
        },
        separators=(",", ":"),
      ).encode(),
      request_id=request_id_from(request),
    )
    if response.status >= 400:
      return HttpResponse(
        response.body, status=response.status, content_type=response.content_type
      )
    upstream = json.loads(response.body or b"{}")
    service = upstream.get("service") if isinstance(upstream, dict) else None
    if not isinstance(service, dict):
      raise AdapterError(502, "FORJD returned an invalid status-service response")
    return JsonResponse(
      {
        "id": service.get("id"),
        "name": service.get("name", name),
        "url": description,
        "status_page_id": page_id,
        "created_at": service.get("updated_at") or "",
        "status": service.get("status", "operational"),
      },
      status=201,
    )
  except AdapterError as exc:
    return JsonResponse({"detail": exc.detail}, status=exc.status)
  except (UnicodeDecodeError, json.JSONDecodeError):
    return JsonResponse(
      {"detail": "FORJD returned invalid JSON", "source": "forjd"},
      status=502,
    )
  except ForjdError as exc:
    return JsonResponse({"detail": str(exc), "source": "forjd"}, status=exc.status)


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
async def status_page_incidents_proxy(request: HttpRequest, page_id: str) -> HttpResponse:
  """POST create incident on FORJD; GET returns [] (FORJD has no per-page list yet)."""
  if request.method == "GET":
    if not request.user.is_authenticated or not getattr(request, "firebase_token", None):
      return JsonResponse({"detail": "Authentication required"}, status=401)
    return JsonResponse([], safe=False)
  if request.method != "POST":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    credential = await _credential_for_request(request)
    payload = _json_object(request)
    title = str(payload.get("title") or "").strip()
    if not title:
      raise AdapterError(400, "title is required")
    body = str(payload.get("message") or payload.get("body") or "")
    status_value = str(payload.get("status") or "investigating")
    response = await _client_for_credential(credential).proxy(
      "POST",
      f"/api/v1/status/pages/{quote(page_id, safe='')}/incidents",
      body=json.dumps(
        {
          "tenant_id": str(credential.tenant_id),
          "title": title,
          "status": status_value,
          "body": body,
        },
        separators=(",", ":"),
      ).encode(),
      request_id=request_id_from(request),
    )
    if response.status >= 400:
      return HttpResponse(
        response.body, status=response.status, content_type=response.content_type
      )
    upstream = json.loads(response.body or b"{}")
    incident = upstream.get("incident") if isinstance(upstream, dict) else None
    if not isinstance(incident, dict):
      raise AdapterError(502, "FORJD returned an invalid status-incident response")
    return JsonResponse(
      {
        "id": incident.get("id"),
        "title": incident.get("title", title),
        "message": incident.get("body", body),
        "status": incident.get("status", status_value),
        "status_page_id": page_id,
        "created_at": incident.get("started_at") or "",
        "updated_at": incident.get("started_at") or "",
      },
      status=201,
    )
  except AdapterError as exc:
    return JsonResponse({"detail": exc.detail}, status=exc.status)
  except (UnicodeDecodeError, json.JSONDecodeError):
    return JsonResponse(
      {"detail": "FORJD returned invalid JSON", "source": "forjd"},
      status=502,
    )
  except ForjdError as exc:
    return JsonResponse({"detail": str(exc), "source": "forjd"}, status=exc.status)


async def empty_collection_proxy(request: HttpRequest, **_path_parameters: str) -> HttpResponse:
  """Auth-gated empty list for Angular surfaces FORJD cannot list yet."""
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  if not request.user.is_authenticated or not getattr(request, "firebase_token", None):
    return JsonResponse({"detail": "Authentication required"}, status=401)
  return JsonResponse([], safe=False)


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
