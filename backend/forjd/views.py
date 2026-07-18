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

from forjd.angular_compat import (
  deml_analytics_overview,
  deml_export_job,
  deml_export_jobs,
  deml_ml_latest,
  deml_status_pages,
  deml_vulnerabilities,
  empty_analytics_overview,
  empty_capability_envelope,
)
from forjd.api import (
  SealedEvent,
  SealedEventBatch,
  request_id_from,
  rewrite_forjd_workflow_body,
  rewrite_forjd_workflow_query,
  sealed_batch_for_forjd,
  sealed_event_for_forjd,
)
from forjd.client import ForjdClient, ForjdError, ForjdResponse
from forjd.cutover import (
  empty_read_envelope,
  empty_read_fallback_enabled,
  is_read_fallback_path,
  log_cutover_event,
  reads_from_forjd,
  shadow_writes_enabled,
  writes_enabled,
)
from forjd.shadow import record_shadow_batch, record_shadow_receipt_async
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
  return rewrite_forjd_workflow_query(query.urlencode())


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
  rewrite_forjd_workflow_body(payload)
  return json.dumps(payload, separators=(",", ":")).encode()


def _validate_sealed_body(request: HttpRequest, tenant_id: UUID) -> bytes:
  try:
    payload = SealedEvent.model_validate_json(request.body)
  except ValidationError as exc:
    raise AdapterError(422, "Invalid sealed FORJD telemetry event") from exc
  _require_payload_tenant(payload.tenant_id, tenant_id)
  return json.dumps(sealed_event_for_forjd(payload), separators=(",", ":")).encode()


def _validate_sealed_batch_body(request: HttpRequest, tenant_id: UUID) -> bytes:
  try:
    payload = SealedEventBatch.model_validate_json(request.body)
  except ValidationError as exc:
    raise AdapterError(422, "Invalid sealed FORJD telemetry batch") from exc
  for event in payload.events:
    _require_payload_tenant(event.tenant_id, tenant_id)
  return json.dumps(sealed_batch_for_forjd(payload), separators=(",", ":")).encode()


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
    # Rewrite any workflow_id on the query string as well as the JSON body.
    query = rewrite_forjd_workflow_query(request.META.get("QUERY_STRING", ""))
    return _bind_body(request, tenant_id), query
  if resolved_binding == "sealed":
    return _validate_sealed_body(request, tenant_id), ""
  if resolved_binding == "sealed_batch":
    return _validate_sealed_batch_body(request, tenant_id), ""
  return request.body or None, rewrite_forjd_workflow_query(request.META.get("QUERY_STRING", ""))


def _is_write_path(method: str, target_path: str) -> bool:
  if method in {"POST", "DELETE"}:
    return True
  return False


async def _maybe_shadow_sealed(
  *,
  request: HttpRequest,
  credential: ForjdTenantCredential,
  tenant_binding: TenantBinding,
  body: bytes | None,
  response: ForjdResponse | None,
  error_status: int | None,
) -> None:
  if not shadow_writes_enabled() or tenant_binding not in {"sealed", "sealed_batch"}:
    return
  if not body:
    return
  try:
    payload = json.loads(body)
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
    return
  account_id = await sync_to_async(
    lambda: getattr(getattr(request.user, "profile", None), "account_id", None)
  )()
  status = response.status if response is not None else error_status
  ok = bool(response is not None and response.status < 400)
  if tenant_binding == "sealed_batch" and isinstance(payload.get("events"), list):
    await sync_to_async(record_shadow_batch)(
      forjd_tenant_id=credential.tenant_id,
      events=payload["events"],
      forjd_status=status,
      forjd_ok=ok,
      request_id=request_id_from(request),
      deml_account_id=account_id,
    )
    return
  if isinstance(payload, dict):
    await record_shadow_receipt_async(
      forjd_tenant_id=credential.tenant_id,
      payload=payload,
      forjd_status=status,
      forjd_ok=ok,
      request_id=request_id_from(request),
      deml_account_id=account_id,
    )


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

  is_get = request.method == "GET"
  is_write = _is_write_path(request.method, target_path)

  credential: ForjdTenantCredential | None = None
  body: bytes | None = None
  query_string = ""

  try:
    if public:
      client = ForjdClient(use_service_auth=False)
      body = request.body or None
      query_string = request.META.get("QUERY_STRING", "")
    else:
      credential = await _credential_for_request(request)
      # --- Cutover write gate (after Firebase + tenant credential) ---
      if is_write and not writes_enabled():
        return JsonResponse(
          {
            "detail": "FORJD writes are disabled for the current cutover phase",
            "code": "forjd_writes_disabled",
          },
          status=503,
        )
      # Phase 0 read=off: authenticated empty envelopes (Angular stays up).
      if is_get and is_read_fallback_path(target_path) and not reads_from_forjd():
        log_cutover_event("read_skipped", path=target_path, mode="off")
        return JsonResponse(empty_read_envelope(target_path), status=200)
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
    if credential is not None:
      await _maybe_shadow_sealed(
        request=request,
        credential=credential,
        tenant_binding=tenant_binding,
        body=body,
        response=response,
        error_status=None,
      )
    return HttpResponse(
      response.body,
      status=response.status,
      content_type=response.content_type,
    )
  except AdapterError as exc:
    return JsonResponse({"detail": exc.detail}, status=exc.status)
  except ForjdError as exc:
    if credential is not None:
      await _maybe_shadow_sealed(
        request=request,
        credential=credential,
        tenant_binding=tenant_binding,
        body=body,
        response=None,
        error_status=exc.status,
      )
    # Dual-read: keep Angular list pages alive when FORJD is down.
    if (
      is_get
      and empty_read_fallback_enabled()
      and is_read_fallback_path(target_path)
      and exc.status >= 500
    ):
      log_cutover_event("read_fallback", path=target_path, status=exc.status)
      return JsonResponse(empty_read_envelope(target_path), status=200)
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


# --- Angular-shaped adapters (FORJD native → deml.app contracts) ---
async def analytics_overview_proxy(request: HttpRequest) -> HttpResponse:
  """Proxy FORJD analytics overview into the Angular CES envelope."""
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    credential = await _credential_for_request(request)
    if not reads_from_forjd():
      return JsonResponse(empty_analytics_overview(), status=200)
    client = ForjdClient(
      tenant_id=credential.tenant_id,
      service_token=credential.service_token,
    )
    _body, query_string = _bound_request(request, credential.tenant_id, "query")
    response = await client.proxy(
      "GET",
      "/api/v1/analytics/overview",
      body=None,
      query_string=query_string,
      content_type="application/json",
      request_id=request_id_from(request),
    )
    if response.status >= 400:
      if empty_read_fallback_enabled() and response.status >= 500:
        return JsonResponse(empty_analytics_overview(), status=200)
      return JsonResponse(
        {"detail": response.body.decode("utf-8", errors="replace"), "source": "forjd"},
        status=response.status,
      )
    upstream = json.loads(response.body)
    if not isinstance(upstream, dict):
      raise AdapterError(502, "FORJD returned an invalid analytics overview")
    return JsonResponse(deml_analytics_overview(upstream), status=200)
  except AdapterError as exc:
    return JsonResponse({"detail": exc.detail}, status=exc.status)
  except ForjdError as exc:
    if empty_read_fallback_enabled() and exc.status >= 500:
      return JsonResponse(empty_analytics_overview(), status=200)
    return JsonResponse({"detail": str(exc), "source": "forjd"}, status=exc.status)
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
    return JsonResponse(
      {"detail": "FORJD returned an invalid analytics overview", "source": "forjd"},
      status=502,
    )


async def status_pages_list_proxy(request: HttpRequest) -> HttpResponse:
  """Proxy FORJD status pages list into MonitorService's JSON array contract."""
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    credential = await _credential_for_request(request)
    deml_user_id = await sync_to_async(lambda: getattr(request.user, "id", None))()
    if not reads_from_forjd():
      return JsonResponse([], status=200, safe=False)
    client = ForjdClient(
      tenant_id=credential.tenant_id,
      service_token=credential.service_token,
    )
    _body, query_string = _bound_request(request, credential.tenant_id, "query")
    response = await client.proxy(
      "GET",
      "/api/v1/status/pages",
      body=None,
      query_string=query_string,
      content_type="application/json",
      request_id=request_id_from(request),
    )
    if response.status >= 400:
      if empty_read_fallback_enabled() and response.status >= 500:
        return JsonResponse([], status=200, safe=False)
      return JsonResponse(
        {"detail": response.body.decode("utf-8", errors="replace"), "source": "forjd"},
        status=response.status,
      )
    upstream = json.loads(response.body)
    if not isinstance(upstream, dict):
      raise AdapterError(502, "FORJD returned an invalid status pages list")
    pages = deml_status_pages(upstream, deml_user_id=deml_user_id)
    return JsonResponse(pages, status=200, safe=False)
  except AdapterError as exc:
    return JsonResponse({"detail": exc.detail}, status=exc.status)
  except ForjdError as exc:
    if empty_read_fallback_enabled() and exc.status >= 500:
      return JsonResponse([], status=200, safe=False)
    return JsonResponse({"detail": str(exc), "source": "forjd"}, status=exc.status)
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
    return JsonResponse(
      {"detail": "FORJD returned an invalid status pages list", "source": "forjd"},
      status=502,
    )


async def session_revoke_proxy(request: HttpRequest, session_id: str) -> HttpResponse:
  """DELETE /api/v1/sessions/{session_id} with tenant-bound query."""
  return await native_forjd_proxy(
    request,
    target_path=f"/api/v1/sessions/{quote(session_id, safe='')}",
    allowed_methods=("DELETE",),
    tenant_binding="query",
  )


async def dlq_retry_proxy(request: HttpRequest, dlq_id: str) -> HttpResponse:
  """POST /api/v1/replay/dlq/{dlq_id}/retry with tenant-bound query."""
  return await native_forjd_proxy(
    request,
    target_path=f"/api/v1/replay/dlq/{quote(dlq_id, safe='')}/retry",
    allowed_methods=("POST",),
    tenant_binding="query",
  )


# --- Product-domain Angular adapters (ML / exports / vulns / integrations) ---
async def vulnerabilities_list_proxy(request: HttpRequest) -> HttpResponse:
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    credential = await _credential_for_request(request)
    if not reads_from_forjd():
      return JsonResponse([], status=200, safe=False)
    client = ForjdClient(
      tenant_id=credential.tenant_id,
      service_token=credential.service_token,
    )
    _body, query_string = _bound_request(request, credential.tenant_id, "query")
    response = await client.proxy(
      "GET",
      "/api/v1/vulnerabilities",
      query_string=query_string,
      request_id=request_id_from(request),
    )
    if response.status >= 400:
      if empty_read_fallback_enabled() and response.status >= 500:
        return JsonResponse([], status=200, safe=False)
      return JsonResponse(
        {"detail": response.body.decode("utf-8", errors="replace"), "source": "forjd"},
        status=response.status,
      )
    upstream = json.loads(response.body)
    if not isinstance(upstream, dict):
      raise AdapterError(502, "FORJD returned invalid vulnerabilities")
    return JsonResponse(deml_vulnerabilities(upstream), status=200, safe=False)
  except AdapterError as exc:
    return JsonResponse({"detail": exc.detail}, status=exc.status)
  except ForjdError as exc:
    if empty_read_fallback_enabled() and exc.status >= 500:
      return JsonResponse([], status=200, safe=False)
    return JsonResponse({"detail": str(exc), "source": "forjd"}, status=exc.status)
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
    return JsonResponse(
      {"detail": "FORJD returned invalid vulnerabilities", "source": "forjd"},
      status=502,
    )


async def exports_collection_proxy(request: HttpRequest) -> HttpResponse:
  """GET list / POST create — Angular ``/api/v1/exports/``."""
  if request.method == "GET":
    try:
      credential = await _credential_for_request(request)
      if not reads_from_forjd():
        return JsonResponse([], status=200, safe=False)
      client = ForjdClient(
        tenant_id=credential.tenant_id,
        service_token=credential.service_token,
      )
      _body, query_string = _bound_request(request, credential.tenant_id, "query")
      response = await client.proxy(
        "GET",
        "/api/v1/exports",
        query_string=query_string,
        request_id=request_id_from(request),
      )
      if response.status >= 400:
        if empty_read_fallback_enabled() and response.status >= 500:
          return JsonResponse([], status=200, safe=False)
        return JsonResponse(
          {"detail": response.body.decode("utf-8", errors="replace"), "source": "forjd"},
          status=response.status,
        )
      upstream = json.loads(response.body)
      if not isinstance(upstream, dict):
        raise AdapterError(502, "FORJD returned invalid exports")
      return JsonResponse(deml_export_jobs(upstream), status=200, safe=False)
    except AdapterError as exc:
      return JsonResponse({"detail": exc.detail}, status=exc.status)
    except ForjdError as exc:
      if empty_read_fallback_enabled() and exc.status >= 500:
        return JsonResponse([], status=200, safe=False)
      return JsonResponse({"detail": str(exc), "source": "forjd"}, status=exc.status)
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
      return JsonResponse(
        {"detail": "FORJD returned invalid exports", "source": "forjd"},
        status=502,
      )

  if request.method != "POST":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    if not writes_enabled():
      return JsonResponse(
        {"detail": "FORJD writes are disabled for the current cutover phase"},
        status=503,
      )
    credential = await _credential_for_request(request)
    payload = _json_object(request)
    # Angular sends kind/format/days — map to FORJD CreateExportRequest.
    kind = str(payload.get("kind") or payload.get("source_kind") or "stream_results")
    fmt = str(payload.get("format") or "csv")
    body = json.dumps(
      {
        "tenant_id": str(credential.tenant_id),
        "format": fmt,
        "source_kind": kind,
        "limit": 10_000,
      }
    ).encode()
    client = ForjdClient(
      tenant_id=credential.tenant_id,
      service_token=credential.service_token,
    )
    response = await client.proxy(
      "POST",
      "/api/v1/exports",
      body=body,
      content_type="application/json",
      request_id=request_id_from(request),
    )
    if response.status >= 400:
      return JsonResponse(
        {"detail": response.body.decode("utf-8", errors="replace"), "source": "forjd"},
        status=response.status,
      )
    upstream = json.loads(response.body)
    if not isinstance(upstream, dict):
      raise AdapterError(502, "FORJD returned invalid export job")
    return JsonResponse(deml_export_job(upstream), status=200)
  except AdapterError as exc:
    return JsonResponse({"detail": exc.detail}, status=exc.status)
  except ForjdError as exc:
    return JsonResponse({"detail": str(exc), "source": "forjd"}, status=exc.status)
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
    return JsonResponse(
      {"detail": "FORJD returned invalid export job", "source": "forjd"},
      status=502,
    )


async def ml_latest_proxy(request: HttpRequest) -> HttpResponse:
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    credential = await _credential_for_request(request)
    if not reads_from_forjd():
      return JsonResponse([], status=200, safe=False)
    client = ForjdClient(
      tenant_id=credential.tenant_id,
      service_token=credential.service_token,
    )
    _body, query_string = _bound_request(request, credential.tenant_id, "query")
    response = await client.proxy(
      "GET",
      "/api/v1/ml/scores",
      query_string=query_string,
      request_id=request_id_from(request),
    )
    if response.status >= 400:
      # Fall back to catalog if scores empty/unavailable.
      catalog = await client.proxy(
        "GET",
        "/api/v1/ml/models",
        request_id=request_id_from(request),
      )
      if catalog.status < 400:
        upstream = json.loads(catalog.body)
        if isinstance(upstream, dict):
          return JsonResponse(deml_ml_latest(upstream), status=200, safe=False)
      if empty_read_fallback_enabled() and response.status >= 500:
        return JsonResponse([], status=200, safe=False)
      return JsonResponse(
        {"detail": response.body.decode("utf-8", errors="replace"), "source": "forjd"},
        status=response.status,
      )
    upstream = json.loads(response.body)
    if not isinstance(upstream, dict):
      raise AdapterError(502, "FORJD returned invalid ml scores")
    return JsonResponse(deml_ml_latest(upstream), status=200, safe=False)
  except AdapterError as exc:
    return JsonResponse({"detail": exc.detail}, status=exc.status)
  except ForjdError as exc:
    if empty_read_fallback_enabled() and exc.status >= 500:
      return JsonResponse([], status=200, safe=False)
    return JsonResponse({"detail": str(exc), "source": "forjd"}, status=exc.status)
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
    return JsonResponse(
      {"detail": "FORJD returned invalid ml scores", "source": "forjd"},
      status=502,
    )


async def integrations_security_alert_proxy(request: HttpRequest) -> HttpResponse:
  """POST /api/v1/integrations/security-alert → FORJD native."""
  return await native_forjd_proxy(
    request,
    target_path="/api/v1/integrations/security-alert",
    allowed_methods=("POST",),
    tenant_binding="body",
  )


async def unsupported_forjd_proxy(
  request: HttpRequest,
  capability: str,
  **_path_parameters: str,
) -> HttpResponse:
  """Fail closed on writes; empty-stable GETs so Angular dashboards stay up."""
  if not request.user.is_authenticated and capability != "system-status":
    return JsonResponse({"detail": "Authentication required"}, status=401)
  if request.method == "GET":
    envelope = empty_capability_envelope(capability, request.path)
    if isinstance(envelope, list):
      return JsonResponse(envelope, status=200, safe=False)
    return JsonResponse(envelope, status=200)
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
