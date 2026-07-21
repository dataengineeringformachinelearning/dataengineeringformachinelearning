"""Explicit Django BFF adapters for FORJD's currently shipped native routes."""

from __future__ import annotations

import asyncio
import json
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Final, Literal
from urllib.parse import quote, urlsplit
from uuid import UUID, uuid4

from asgiref.sync import sync_to_async
from config.csrf_header_auth import (
  authorization_header_required,
  csrf_exempt_require_header_auth,
)
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from pydantic import ValidationError

from forjd.angular_compat import (
  deml_analytics_overview,
  deml_export_job,
  deml_export_jobs,
  deml_incident_case,
  deml_incident_cases,
  deml_playbook,
  deml_playbook_execution,
  deml_playbook_runs,
  deml_playbooks,
  deml_siem_signals,
  deml_sla_latest,
  deml_status_incident,
  deml_status_incidents,
  deml_status_page,
  deml_status_pages,
  deml_status_service,
  deml_status_services,
  deml_temporal_forecast,
  deml_threat_report,
  deml_vulnerabilities,
  deml_vulnerability,
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
from forjd.body_limit import IngestBodyError, read_limited_ingest_body
from forjd.client import ForjdClient, ForjdError, ForjdResponse
from forjd.cutover import (
  contract_version_is_compatible,
  empty_read_envelope,
  empty_read_fallback_enabled,
  is_read_fallback_path,
  log_forjd_mode_event,
  reads_from_forjd,
  required_contract_version,
  shadow_writes_enabled,
  writes_enabled,
)
from forjd.limits import MAX_INGEST_BODY_BYTES
from forjd.policy import (
  ForjdActorContext,
  ForjdPolicyError,
  action_for_native_request,
  authorize_forjd_action,
  is_privileged_action,
  policy_error_response,
  record_forjd_audit,
  require_forjd_action,
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
SUPPORTED_METHODS: Final[frozenset[str]] = frozenset({"GET", "POST", "PUT", "PATCH", "DELETE"})


@dataclass(frozen=True, slots=True)
class AdapterError(RuntimeError):
  status: int
  detail: str


async def _credential_for_request(request: HttpRequest) -> ForjdTenantCredential:
  try:
    actor = await authorize_forjd_action(request, "read")
  except ForjdPolicyError as exc:
    raise AdapterError(exc.status, exc.detail) from exc

  try:
    return await sync_to_async(resolve_forjd_tenant_credential)(actor.account_id)
  except ForjdTenantConfigurationError:
    # Auto-provision a FORJD tenant for this DEML account (users never see FORJD).
    try:
      from forjd.client import ForjdError
      from forjd.provision import ForjdProvisionError, ensure_forjd_tenant_credential

      return await ensure_forjd_tenant_credential(actor.account_id)
    except (ForjdTenantConfigurationError, ForjdProvisionError, ForjdError) as exc:
      raise AdapterError(503, "FORJD tenant service credential is unavailable") from exc


async def _read_credential_or_none(request: HttpRequest) -> ForjdTenantCredential | None:
  """Resolve a read credential; only cutover modes may mask mapping outages."""
  try:
    return await _credential_for_request(request)
  except AdapterError as exc:
    if exc.status == 503 and empty_read_fallback_enabled():
      return None
    raise


def _client_for_credential(credential: ForjdTenantCredential) -> ForjdClient:
  return ForjdClient(
    tenant_id=credential.tenant_id,
    service_token=credential.service_token,
  )


def _request_has_end_user_auth(request: HttpRequest) -> bool:
  """True when Firebase/API-key identity terminated on this request."""
  has_token = bool(
    getattr(request, "firebase_token", None) or getattr(request, "deml_api_key", None)
  )
  return bool(
    has_token
    and getattr(request.user, "is_authenticated", False)
    and getattr(request.user, "is_active", False)
  )


async def _status_directory_read_client(
  request: HttpRequest,
) -> tuple[ForjdClient | None, int | None, bool]:
  """Resolve a FORJD client for status directory GETs.

  Authenticated product users use their mapped tenant credential (all pages).
  Anonymous explore uses the platform ``FORJD_*`` service credential and must
  filter to published pages only.
  """
  if _request_has_end_user_auth(request):
    deml_user_id = await sync_to_async(lambda: getattr(request.user, "id", None))()
    credential = await _read_credential_or_none(request)
    if credential is None or not reads_from_forjd():
      return None, deml_user_id, False
    return _client_for_credential(credential), deml_user_id, False

  if not reads_from_forjd():
    return None, None, True
  try:
    return ForjdClient(), None, True
  except ForjdError:
    return None, None, True


def _published_directory_pages(pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
  return [
    page for page in pages if page.get("is_published") or page.get("slug") == "platform-status"
  ]


async def _ensure_published_status_page(
  client: ForjdClient,
  page_id: str,
  *,
  request_id: str | None,
) -> HttpResponse | None:
  """For anonymous directory reads, refuse unpublished page detail proxies."""
  response = await client.proxy(
    "GET",
    "/api/v1/status/pages",
    body=None,
    query_string=f"tenant_id={client.tenant_id}",
    content_type="application/json",
    request_id=request_id,
  )
  if response.status >= 400:
    if empty_read_fallback_enabled() and response.status >= 500:
      return JsonResponse({"detail": "Not found"}, status=404)
    return _upstream_error_response(response)
  try:
    upstream = json.loads(response.body)
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
    return JsonResponse({"detail": "Not found"}, status=404)
  if not isinstance(upstream, dict):
    return JsonResponse({"detail": "Not found"}, status=404)
  pages = _published_directory_pages(deml_status_pages(upstream, deml_user_id=None))
  if not any(str(page.get("id") or "") == str(page_id) for page in pages):
    return JsonResponse({"detail": "Not found"}, status=404)
  return None


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


# Shared gate for CSRF-exempt SOAR controls (see config.csrf_header_auth).
_authorization_header_required = authorization_header_required


def _uuid_path(value: str, field_name: str) -> str:
  try:
    return str(UUID(value))
  except (AttributeError, TypeError, ValueError) as exc:
    raise AdapterError(400, f"{field_name} must be a valid UUID") from exc


def _playbook_ack_payload(request: HttpRequest) -> dict[str, object]:
  inbound = _json_object(request)
  allowed = {"succeeded", "external_reference", "metadata"}
  unsupported = sorted(set(inbound) - allowed)
  if unsupported:
    raise AdapterError(422, f"Unsupported acknowledgement fields: {', '.join(unsupported)}")

  succeeded = inbound.get("succeeded")
  if "succeeded" not in inbound or not isinstance(succeeded, bool):
    raise AdapterError(422, "succeeded must be a boolean")

  external_reference = inbound.get("external_reference")
  if external_reference is not None and not isinstance(external_reference, str):
    raise AdapterError(422, "external_reference must be a string or null")
  if isinstance(external_reference, str):
    external_reference = external_reference.strip()
    if len(external_reference) > 255:
      raise AdapterError(422, "external_reference must contain at most 255 characters")

  metadata = inbound.get("metadata", {})
  if not isinstance(metadata, dict):
    raise AdapterError(422, "metadata must be an object")
  try:
    encoded_metadata = json.dumps(metadata, separators=(",", ":"), allow_nan=False)
  except (TypeError, ValueError) as exc:
    raise AdapterError(422, "metadata must contain finite JSON values") from exc
  if len(metadata) > 32 or len(encoded_metadata) > 16_384:
    raise AdapterError(422, "metadata exceeds the acknowledgement limits")

  return {
    "succeeded": succeeded,
    "external_reference": external_reference,
    "metadata": metadata,
  }


def _empty_control_payload(request: HttpRequest) -> dict[str, object]:
  inbound = _json_object(request)
  if inbound:
    raise AdapterError(422, "Retry request body must be an empty JSON object")
  return {}


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
    payload = SealedEvent.model_validate_json(_read_limited_ingest_body(request))
  except ValidationError as exc:
    raise AdapterError(422, "Invalid sealed FORJD telemetry event") from exc
  _require_payload_tenant(payload.tenant_id, tenant_id)
  return json.dumps(sealed_event_for_forjd(payload), separators=(",", ":")).encode()


def _validate_sealed_batch_body(request: HttpRequest, tenant_id: UUID) -> bytes:
  try:
    payload = SealedEventBatch.model_validate_json(_read_limited_ingest_body(request))
  except ValidationError as exc:
    raise AdapterError(422, "Invalid sealed FORJD telemetry batch") from exc
  for event in payload.events:
    _require_payload_tenant(event.tenant_id, tenant_id)
  return json.dumps(sealed_batch_for_forjd(payload), separators=(",", ":")).encode()


def _read_limited_ingest_body(request: HttpRequest) -> bytes:
  """Read canonical ingest JSON with FORJD's 8 MiB cap.

  Django's lower global body limit remains unchanged for every other route.
  Canonical sealed-ingest adapters use this bounded stream reader so the BFF
  accepts the complete FORJD contract without globally relaxing upload safety.
  """
  try:
    return read_limited_ingest_body(request)
  except IngestBodyError as exc:
    raise AdapterError(exc.status, exc.detail) from exc


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
  del target_path
  return method.upper() in {"POST", "PUT", "PATCH", "DELETE"}


def _adapter_error_response(exc: AdapterError) -> JsonResponse:
  if exc.status >= 500:
    return JsonResponse(
      {
        "detail": exc.detail,
        "code": "forjd_degraded",
        "source": "forjd",
      },
      status=503,
    )
  if exc.status == 413:
    response = JsonResponse(
      {
        "detail": exc.detail,
        "code": "ingest_body_too_large",
        "limit_bytes": MAX_INGEST_BODY_BYTES,
      },
      status=413,
    )
    response["X-Max-Body-Bytes"] = str(MAX_INGEST_BODY_BYTES)
    return response
  return JsonResponse({"detail": exc.detail}, status=exc.status)


def _forjd_error_response(exc: ForjdError) -> JsonResponse:
  if exc.status >= 500:
    result = JsonResponse(
      {
        "detail": "FORJD is temporarily unavailable",
        "code": "forjd_degraded",
        "source": "forjd",
      },
      status=503,
    )
  else:
    result = JsonResponse(
      {"detail": str(exc), "code": "forjd_request_rejected", "source": "forjd"},
      status=exc.status,
    )
  if exc.upstream_request_id:
    result["X-FORJD-Request-ID"] = exc.upstream_request_id
  return result


def _upstream_error_response(response: ForjdResponse) -> JsonResponse:
  if response.status >= 500:
    result = JsonResponse(
      {
        "detail": "FORJD is temporarily unavailable",
        "code": "forjd_degraded",
        "source": "forjd",
      },
      status=503,
    )
  else:
    try:
      payload = json.loads(response.body or b"{}")
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
      payload = {}
    detail = payload.get("detail") if isinstance(payload, dict) else None
    result = JsonResponse(
      {
        "detail": str(detail or "FORJD rejected the request"),
        "code": "forjd_request_rejected",
        "source": "forjd",
      },
      status=response.status,
    )
  _copy_safe_upstream_headers(response, result)
  return result


def _copy_safe_upstream_headers(response: ForjdResponse, target: HttpResponse) -> None:
  for name, value in response.headers.items():
    target["X-FORJD-Request-ID" if name.lower() == "x-request-id" else name] = value


def _provider_enum(value: object, default: str) -> str:
  return str(value or default).strip().lower().replace(" ", "_").replace("-", "_")


async def _typed_json_call(
  request: HttpRequest,
  target_path: str,
  *,
  payload: dict[str, object] | None = None,
  tenant_binding: TenantBinding = "method",
) -> dict[str, object] | JsonResponse | None:
  """Execute one typed adapter call.

  ``None`` is reserved for explicit off/dual read fallback.  In steady FORJD
  mode, mapping failures and upstream failures always produce a typed error.
  """
  is_get = request.method == "GET"
  if not is_get and not writes_enabled():
    return JsonResponse(
      {"detail": "FORJD writes are disabled", "code": "forjd_writes_disabled"},
      status=503,
    )
  try:
    credential = (
      await _read_credential_or_none(request) if is_get else await _credential_for_request(request)
    )
    if is_get and (credential is None or not reads_from_forjd()):
      return None
    if credential is None:
      raise AdapterError(503, "FORJD tenant service credential is unavailable")

    if payload is None:
      body, query_string = _bound_request(request, credential.tenant_id, tenant_binding)
    else:
      supplied_tenant = payload.get("tenant_id")
      if supplied_tenant is not None and str(supplied_tenant) != str(credential.tenant_id):
        raise AdapterError(403, "Request tenant does not match the account's FORJD tenant")
      outbound = {**payload, "tenant_id": str(credential.tenant_id)}
      rewrite_forjd_workflow_body(outbound)
      body = json.dumps(outbound, separators=(",", ":")).encode()
      query_string = rewrite_forjd_workflow_query(request.META.get("QUERY_STRING", ""))

    response = await _client_for_credential(credential).proxy(
      request.method,
      target_path,
      body=body,
      query_string=query_string,
      content_type="application/json",
      request_id=request_id_from(request),
    )
    request._forjd_upstream_request_id = response.headers.get("X-Request-ID", "")
    if response.status >= 400:
      if is_get and response.status >= 500 and empty_read_fallback_enabled():
        log_forjd_mode_event("read_fallback", path=target_path, status=response.status)
        return None
      return _upstream_error_response(response)
    try:
      upstream = json.loads(response.body or b"{}")
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
      raise AdapterError(502, "FORJD returned invalid JSON") from None
    if not isinstance(upstream, dict):
      raise AdapterError(502, "FORJD returned an invalid response")
    return upstream
  except AdapterError as exc:
    return _adapter_error_response(exc)
  except ForjdError as exc:
    if is_get and exc.status >= 500 and empty_read_fallback_enabled():
      log_forjd_mode_event("read_fallback", path=target_path, status=exc.status)
      return None
    return _forjd_error_response(exc)


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
  action = action_for_native_request(request.method, target_path)

  credential: ForjdTenantCredential | None = None
  actor: ForjdActorContext | None = None
  body: bytes | None = None
  query_string = ""
  privileged = False

  try:
    if public:
      client = ForjdClient(use_service_auth=False)
      body = request.body or None
      query_string = request.META.get("QUERY_STRING", "")
    else:
      actor = await authorize_forjd_action(request, action, resource_id=target_path)
      privileged = is_privileged_action(action)
      if privileged:
        await record_forjd_audit(
          actor=actor,
          request=request,
          action=action,
          outcome="attempted",
          resource_id=target_path,
        )
      if is_write and not writes_enabled():
        result = JsonResponse(
          {
            "detail": "FORJD writes are disabled",
            "code": "forjd_writes_disabled",
          },
          status=503,
        )
        if privileged:
          await record_forjd_audit(
            actor=actor,
            request=request,
            action=action,
            outcome="failed",
            status=503,
            resource_id=target_path,
          )
        return result
      # In explicit read=off cutover mode, authentication and RBAC still run,
      # but tenant mapping is not a dependency for declared fallback routes.
      if is_get and is_read_fallback_path(target_path) and not reads_from_forjd():
        log_forjd_mode_event("read_skipped", path=target_path, mode="off")
        return JsonResponse(empty_read_envelope(target_path), status=200)
      credential = await _credential_for_request(request)
      client = _client_for_credential(credential)
      body, query_string = _bound_request(request, credential.tenant_id, tenant_binding)

    response = await client.proxy(
      request.method,
      target_path,
      body=body,
      query_string=query_string,
      content_type=request.content_type or "application/json",
      request_id=request_id_from(request),
    )
    request._forjd_upstream_request_id = response.headers.get("X-Request-ID", "")
    if credential is not None:
      await _maybe_shadow_sealed(
        request=request,
        credential=credential,
        tenant_binding=tenant_binding,
        body=body,
        response=response,
        error_status=None,
      )
    result = HttpResponse(
      response.body,
      status=response.status,
      content_type=response.content_type,
    )
    _copy_safe_upstream_headers(response, result)
    if privileged and actor is not None:
      await record_forjd_audit(
        actor=actor,
        request=request,
        action=action,
        outcome="succeeded" if response.status < 400 else "failed",
        tenant_id=credential.tenant_id if credential is not None else None,
        status=response.status,
        resource_id=target_path,
        upstream_request_id=response.headers.get("X-Request-ID"),
      )
    if response.status >= 400:
      if (
        is_get
        and response.status >= 500
        and empty_read_fallback_enabled()
        and is_read_fallback_path(target_path)
      ):
        log_forjd_mode_event("read_fallback", path=target_path, status=response.status)
        return JsonResponse(empty_read_envelope(target_path), status=200)
      return _upstream_error_response(response)
    return result
  except ForjdPolicyError as exc:
    return policy_error_response(exc)
  except AdapterError as exc:
    if privileged and actor is not None:
      await record_forjd_audit(
        actor=actor,
        request=request,
        action=action,
        outcome="failed",
        tenant_id=credential.tenant_id if credential is not None else None,
        status=exc.status,
        resource_id=target_path,
      )
    return _adapter_error_response(exc)
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
      log_forjd_mode_event("read_fallback", path=target_path, status=exc.status)
      return JsonResponse(empty_read_envelope(target_path), status=200)
    if privileged and actor is not None:
      await record_forjd_audit(
        actor=actor,
        request=request,
        action=action,
        outcome="failed",
        tenant_id=credential.tenant_id if credential is not None else None,
        status=exc.status,
        resource_id=target_path,
        upstream_request_id=exc.upstream_request_id,
      )
    return _forjd_error_response(exc)


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
    return _adapter_error_response(
      AdapterError(502, "FORJD returned an invalid public status-page response")
    )
  if not isinstance(page, dict):
    return _adapter_error_response(
      AdapterError(502, "FORJD returned an invalid public status-page response")
    )
  # Anonymous visitors cannot hit the authed services/incidents adapters, so
  # reshape the embedded FORJD arrays into the Angular contracts inline.
  # Never echo FORJD tenant_id on the public slug surface (enumeration risk).
  page.pop("tenant_id", None)
  page_id = str(page.get("id") or "")
  services = deml_status_services(page)
  incidents = deml_status_incidents(page)
  for row in (*services, *incidents):
    row["status_page_id"] = row["status_page_id"] or page_id
  page["services"] = services
  page["incidents"] = incidents
  return JsonResponse(page, status=response.status_code)


async def forjd_capabilities_proxy(request: HttpRequest) -> HttpResponse:
  """Public compatibility *and runtime readiness* probe for the headless contract."""
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    client = ForjdClient(use_service_auth=False)
    request_id = request_id_from(request)
    response, readiness = await asyncio.gather(
      client.proxy("GET", "/api/v1/capabilities", request_id=request_id),
      client.proxy("GET", "/ready", request_id=request_id),
    )
  except ForjdError as exc:
    return _forjd_error_response(exc)
  if response.status >= 400:
    return _upstream_error_response(response)
  try:
    upstream = json.loads(response.body or b"{}")
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
    return _adapter_error_response(AdapterError(502, "FORJD returned invalid capabilities"))
  if not isinstance(upstream, dict):
    return _adapter_error_response(AdapterError(502, "FORJD returned invalid capabilities"))

  contract_version = str(upstream.get("contract_version") or "")
  compatible = contract_version_is_compatible(contract_version)
  try:
    ready_body = json.loads(readiness.body or b"{}")
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
    ready_body = {}
  runtime_ready = (
    readiness.status < 400
    and isinstance(ready_body, dict)
    and str(ready_body.get("status") or "").lower() == "ready"
  )
  probe_ready = compatible and runtime_ready
  result = JsonResponse(
    {
      "status": "ready" if probe_ready else ("incompatible" if not compatible else "degraded"),
      "source": "forjd",
      "contract_version": contract_version,
      "required_contract_version": required_contract_version(),
      "service": upstream.get("service"),
      "service_version": upstream.get("service_version"),
      "authentication": upstream.get("authentication", {}),
      "capabilities": upstream.get("capabilities", {}),
      "limits": upstream.get("limits", {}),
      "reliability": upstream.get("reliability", {}),
      "runtime": {
        "status": str(ready_body.get("status") or "unavailable")
        if isinstance(ready_body, dict)
        else "unavailable",
        "checks": ready_body.get("checks", {}) if isinstance(ready_body, dict) else {},
      },
    },
    status=200 if probe_ready else 503,
  )
  _copy_safe_upstream_headers(response, result)
  if "X-FORJD-Request-ID" not in result:
    _copy_safe_upstream_headers(readiness, result)
  return result


# --- Angular-shaped adapters (FORJD native → deml.app contracts) ---
@require_forjd_action("read")
async def analytics_overview_proxy(request: HttpRequest) -> HttpResponse:
  """Proxy FORJD analytics overview into the Angular CES envelope."""
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    credential = await _read_credential_or_none(request)
    if credential is None or not reads_from_forjd():
      return JsonResponse(empty_analytics_overview(), status=200)
    client = _client_for_credential(credential)
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
      return _upstream_error_response(response)
    upstream = json.loads(response.body)
    if not isinstance(upstream, dict):
      raise AdapterError(502, "FORJD returned an invalid analytics overview")
    return JsonResponse(deml_analytics_overview(upstream), status=200)
  except AdapterError as exc:
    return _adapter_error_response(exc)
  except ForjdError as exc:
    if empty_read_fallback_enabled() and exc.status >= 500:
      return JsonResponse(empty_analytics_overview(), status=200)
    return _forjd_error_response(exc)
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
    return _adapter_error_response(
      AdapterError(502, "FORJD returned an invalid analytics overview")
    )


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
@require_forjd_action({"GET": "public", "POST": "status.admin"})
async def status_pages_list_proxy(request: HttpRequest) -> HttpResponse:
  """GET list / POST create — Angular ``/api/v1/system-status/status_pages``.

  GET is public for the explore directory (platform credential, published-only).
  """
  if request.method == "GET":
    try:
      client, deml_user_id, published_only = await _status_directory_read_client(request)
      if client is None:
        return JsonResponse([], status=200, safe=False)
      query_string = f"tenant_id={client.tenant_id}"
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
        return _upstream_error_response(response)
      upstream = json.loads(response.body)
      if not isinstance(upstream, dict):
        raise AdapterError(502, "FORJD returned an invalid status pages list")
      pages = deml_status_pages(upstream, deml_user_id=deml_user_id)
      if published_only:
        pages = _published_directory_pages(pages)
      return JsonResponse(pages, status=200, safe=False)
    except AdapterError as exc:
      return _adapter_error_response(exc)
    except ForjdError as exc:
      if empty_read_fallback_enabled() and exc.status >= 500:
        return JsonResponse([], status=200, safe=False)
      return _forjd_error_response(exc)
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
      return _adapter_error_response(
        AdapterError(502, "FORJD returned an invalid status pages list")
      )

  if request.method != "POST":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    if not writes_enabled():
      return JsonResponse(
        {"detail": "FORJD writes are disabled", "code": "forjd_writes_disabled"},
        status=503,
      )
    credential = await _credential_for_request(request)
    deml_user_id = await sync_to_async(lambda: getattr(request.user, "id", None))()
    payload = _json_object(request)
    body = json.dumps(
      {
        "tenant_id": str(credential.tenant_id),
        "slug": str(payload.get("slug") or ""),
        "title": str(payload.get("title") or ""),
        "description": str(payload.get("description") or ""),
        "is_published": bool(payload.get("is_published")),
      }
    ).encode()
    client = _client_for_credential(credential)
    response = await client.proxy(
      "POST",
      "/api/v1/status/pages",
      body=body,
      content_type="application/json",
      request_id=request_id_from(request),
    )
    if response.status >= 400:
      return _upstream_error_response(response)
    upstream = json.loads(response.body)
    page = upstream.get("page") if isinstance(upstream, dict) else None
    if not isinstance(page, dict):
      raise AdapterError(502, "FORJD returned an invalid status page")
    return JsonResponse(deml_status_page(page, deml_user_id=deml_user_id), status=200)
  except AdapterError as exc:
    return _adapter_error_response(exc)
  except ForjdError as exc:
    return _forjd_error_response(exc)
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
    return _adapter_error_response(AdapterError(502, "FORJD returned an invalid status page"))


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
@require_forjd_action("status.admin")
async def status_page_detail_proxy(request: HttpRequest, page_id: str) -> HttpResponse:
  """PUT update / DELETE — Angular ``/status_pages/{id}``."""
  if request.method not in {"PUT", "PATCH", "DELETE"}:
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    if not writes_enabled():
      return JsonResponse(
        {"detail": "FORJD writes are disabled", "code": "forjd_writes_disabled"},
        status=503,
      )
    credential = await _credential_for_request(request)
    deml_user_id = await sync_to_async(lambda: getattr(request.user, "id", None))()
    client = _client_for_credential(credential)
    if request.method == "DELETE":
      response = await client.proxy(
        "DELETE",
        f"/api/v1/status/pages/{quote(page_id, safe='')}",
        query_string=f"tenant_id={credential.tenant_id}",
        request_id=request_id_from(request),
      )
      if response.status >= 400:
        return _upstream_error_response(response)
      return JsonResponse({"ok": True}, status=200)

    payload = _json_object(request)
    body = json.dumps(
      {
        "tenant_id": str(credential.tenant_id),
        "slug": payload.get("slug"),
        "title": payload.get("title"),
        "description": payload.get("description"),
        "is_published": payload.get("is_published"),
      }
    ).encode()
    response = await client.proxy(
      "PATCH",
      f"/api/v1/status/pages/{quote(page_id, safe='')}",
      body=body,
      content_type="application/json",
      request_id=request_id_from(request),
    )
    if response.status >= 400:
      return _upstream_error_response(response)
    upstream = json.loads(response.body)
    page = upstream.get("page") if isinstance(upstream, dict) else None
    if not isinstance(page, dict):
      raise AdapterError(502, "FORJD returned an invalid status page")
    return JsonResponse(deml_status_page(page, deml_user_id=deml_user_id), status=200)
  except AdapterError as exc:
    return _adapter_error_response(exc)
  except ForjdError as exc:
    return _forjd_error_response(exc)
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
    return _adapter_error_response(AdapterError(502, "FORJD returned an invalid status page"))


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
@require_forjd_action({"GET": "public", "POST": "status.admin"})
async def status_page_services_proxy(request: HttpRequest, page_id: str) -> HttpResponse:
  """GET list / POST create — ``/status_pages/{id}/services``."""
  try:
    if request.method == "GET":
      client, _deml_user_id, published_only = await _status_directory_read_client(request)
      if client is None:
        return JsonResponse([], status=200, safe=False)
      if published_only:
        denied = await _ensure_published_status_page(
          client, page_id, request_id=request_id_from(request)
        )
        if denied is not None:
          return denied
      response = await client.proxy(
        "GET",
        f"/api/v1/status/pages/{quote(page_id, safe='')}/services",
        query_string=f"tenant_id={client.tenant_id}",
        request_id=request_id_from(request),
      )
      if response.status >= 400:
        if empty_read_fallback_enabled() and response.status >= 500:
          return JsonResponse([], status=200, safe=False)
        return _upstream_error_response(response)
      upstream = json.loads(response.body)
      if not isinstance(upstream, dict):
        raise AdapterError(502, "FORJD returned invalid services")
      return JsonResponse(deml_status_services(upstream), status=200, safe=False)

    if request.method != "POST":
      return JsonResponse({"detail": "Method not allowed"}, status=405)
    if not writes_enabled():
      return JsonResponse(
        {"detail": "FORJD writes are disabled", "code": "forjd_writes_disabled"},
        status=503,
      )
    credential = await _credential_for_request(request)
    client = _client_for_credential(credential)
    payload = _json_object(request)
    # Angular sends {name, url}; map url → description. FORJD requires
    # lowercase status enums, so normalize legacy Title Case inputs.
    service_status = str(payload.get("status") or "operational").strip().lower().replace(" ", "_")
    if service_status not in {
      "operational",
      "degraded",
      "partial_outage",
      "major_outage",
      "maintenance",
    }:
      service_status = "operational"
    body = json.dumps(
      {
        "tenant_id": str(credential.tenant_id),
        "name": str(payload.get("name") or ""),
        "description": str(payload.get("url") or payload.get("description") or ""),
        "status": service_status,
      }
    ).encode()
    response = await client.proxy(
      "POST",
      f"/api/v1/status/pages/{quote(page_id, safe='')}/services",
      body=body,
      content_type="application/json",
      request_id=request_id_from(request),
    )
    if response.status >= 400:
      return _upstream_error_response(response)
    upstream = json.loads(response.body)
    if not isinstance(upstream, dict):
      raise AdapterError(502, "FORJD returned invalid service")
    return JsonResponse(deml_status_service(upstream), status=200)
  except AdapterError as exc:
    return _adapter_error_response(exc)
  except ForjdError as exc:
    return _forjd_error_response(exc)
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
    return _adapter_error_response(AdapterError(502, "FORJD returned invalid service"))


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
@require_forjd_action("status.admin")
async def status_service_delete_proxy(request: HttpRequest, service_id: str) -> HttpResponse:
  if request.method != "DELETE":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    if not writes_enabled():
      return JsonResponse(
        {"detail": "FORJD writes are disabled", "code": "forjd_writes_disabled"},
        status=503,
      )
    credential = await _credential_for_request(request)
    client = _client_for_credential(credential)
    response = await client.proxy(
      "DELETE",
      f"/api/v1/status/services/{quote(service_id, safe='')}",
      query_string=f"tenant_id={credential.tenant_id}",
      request_id=request_id_from(request),
    )
    if response.status >= 400:
      return _upstream_error_response(response)
    return JsonResponse({"ok": True}, status=200)
  except AdapterError as exc:
    return _adapter_error_response(exc)
  except ForjdError as exc:
    return _forjd_error_response(exc)


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
@require_forjd_action({"GET": "public", "POST": "status.admin"})
async def status_page_incidents_proxy(request: HttpRequest, page_id: str) -> HttpResponse:
  """GET list / POST create — ``/status_pages/{id}/incidents``."""
  try:
    if request.method == "GET":
      client, _deml_user_id, published_only = await _status_directory_read_client(request)
      if client is None:
        return JsonResponse([], status=200, safe=False)
      if published_only:
        denied = await _ensure_published_status_page(
          client, page_id, request_id=request_id_from(request)
        )
        if denied is not None:
          return denied
      response = await client.proxy(
        "GET",
        f"/api/v1/status/pages/{quote(page_id, safe='')}/incidents",
        query_string=f"tenant_id={client.tenant_id}",
        request_id=request_id_from(request),
      )
      if response.status >= 400:
        if empty_read_fallback_enabled() and response.status >= 500:
          return JsonResponse([], status=200, safe=False)
        return _upstream_error_response(response)
      upstream = json.loads(response.body)
      if not isinstance(upstream, dict):
        raise AdapterError(502, "FORJD returned invalid incidents")
      return JsonResponse(deml_status_incidents(upstream), status=200, safe=False)

    if request.method != "POST":
      return JsonResponse({"detail": "Method not allowed"}, status=405)
    if not writes_enabled():
      return JsonResponse(
        {"detail": "FORJD writes are disabled", "code": "forjd_writes_disabled"},
        status=503,
      )
    credential = await _credential_for_request(request)
    client = _client_for_credential(credential)
    payload = _json_object(request)
    # Angular sends {title, message, status} with legacy Title Case statuses.
    status_val = str(payload.get("status") or "investigating").strip().lower()
    if status_val not in {"investigating", "identified", "monitoring", "resolved"}:
      status_val = "investigating"
    body = json.dumps(
      {
        "tenant_id": str(credential.tenant_id),
        "title": str(payload.get("title") or ""),
        "body": str(payload.get("message") or payload.get("body") or ""),
        "status": status_val,
        "severity": str(payload.get("severity") or "minor"),
      }
    ).encode()
    response = await client.proxy(
      "POST",
      f"/api/v1/status/pages/{quote(page_id, safe='')}/incidents",
      body=body,
      content_type="application/json",
      request_id=request_id_from(request),
    )
    if response.status >= 400:
      return _upstream_error_response(response)
    upstream = json.loads(response.body)
    if not isinstance(upstream, dict):
      raise AdapterError(502, "FORJD returned invalid incident")
    return JsonResponse(deml_status_incident(upstream), status=200)
  except AdapterError as exc:
    return _adapter_error_response(exc)
  except ForjdError as exc:
    return _forjd_error_response(exc)
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
    return _adapter_error_response(AdapterError(502, "FORJD returned invalid incident"))


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
@require_forjd_action("status.admin")
async def status_incident_delete_proxy(request: HttpRequest, incident_id: str) -> HttpResponse:
  if request.method != "DELETE":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    if not writes_enabled():
      return JsonResponse(
        {"detail": "FORJD writes are disabled", "code": "forjd_writes_disabled"},
        status=503,
      )
    credential = await _credential_for_request(request)
    client = _client_for_credential(credential)
    response = await client.proxy(
      "DELETE",
      f"/api/v1/status/incidents/{quote(incident_id, safe='')}",
      query_string=f"tenant_id={credential.tenant_id}",
      request_id=request_id_from(request),
    )
    if response.status >= 400:
      return _upstream_error_response(response)
    return JsonResponse({"ok": True}, status=200)
  except AdapterError as exc:
    return _adapter_error_response(exc)
  except ForjdError as exc:
    return _forjd_error_response(exc)


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
async def ingest_processing_status_proxy(request: HttpRequest, batch_id: str) -> HttpResponse:
  """Expose FORJD's durable ingest receipt through the tenant-bound BFF."""
  try:
    normalized_batch_id = _uuid_path(batch_id, "batch_id")
  except AdapterError as exc:
    return _adapter_error_response(exc)
  return await native_forjd_proxy(
    request,
    target_path=f"/api/v1/ingest/processing/{quote(normalized_batch_id, safe='')}",
    allowed_methods=("GET",),
    tenant_binding="query",
  )


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
async def session_revoke_proxy(request: HttpRequest, session_id: str) -> HttpResponse:
  """DELETE /api/v1/sessions/{session_id} with tenant-bound query."""
  return await native_forjd_proxy(
    request,
    target_path=f"/api/v1/sessions/{quote(session_id, safe='')}",
    allowed_methods=("DELETE",),
    tenant_binding="query",
  )


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
async def dlq_retry_proxy(request: HttpRequest, dlq_id: str) -> HttpResponse:
  """POST /api/v1/replay/dlq/{dlq_id}/retry with tenant-bound query."""
  return await native_forjd_proxy(
    request,
    target_path=f"/api/v1/replay/dlq/{quote(dlq_id, safe='')}/retry",
    allowed_methods=("POST",),
    tenant_binding="query",
  )


# --- Headless SIEM/SOAR and Angular compatibility adapters ---
@require_forjd_action("read")
async def analytics_tenants_proxy(request: HttpRequest) -> HttpResponse:
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    credential = await _read_credential_or_none(request)
    if credential is None or not reads_from_forjd():
      return JsonResponse(
        {
          "status": "success",
          "data": [],
          "source": "deml_forjd_fallback",
          "degraded": True,
          "code": "forjd_read_fallback",
        },
        status=200,
      )
    return JsonResponse(
      {
        "status": "success",
        "data": [
          {
            "id": str(credential.tenant_id),
            "name": "DEML account",
            "is_platform": False,
          }
        ],
        "source": "forjd",
      },
      status=200,
    )
  except AdapterError as exc:
    return _adapter_error_response(exc)


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
@require_forjd_action({"GET": "read", "POST": "case.write"})
async def incident_cases_proxy(request: HttpRequest) -> HttpResponse:
  if request.method not in {"GET", "POST"}:
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  payload: dict[str, object] | None = None
  if request.method == "POST":
    inbound = _json_object(request)
    payload = {
      "title": str(inbound.get("title") or ""),
      "description": str(inbound.get("description") or ""),
      "severity": _provider_enum(inbound.get("severity"), "medium"),
      "metadata": inbound.get("metadata") if isinstance(inbound.get("metadata"), dict) else {},
    }
  result = await _typed_json_call(
    request,
    "/api/v1/soc/cases",
    payload=payload,
    tenant_binding="query" if request.method == "GET" else "body",
  )
  if isinstance(result, HttpResponse):
    return result
  if result is None:
    return JsonResponse([], status=200, safe=False)
  if request.method == "GET":
    return JsonResponse(deml_incident_cases(result), status=200, safe=False)
  return JsonResponse(deml_incident_case(result), status=200)


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
@require_forjd_action({"GET": "read", "PATCH": "case.write"})
async def incident_case_detail_proxy(request: HttpRequest, case_id: str) -> HttpResponse:
  if request.method not in {"GET", "PATCH"}:
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  if request.method == "GET":
    result = await _typed_json_call(request, "/api/v1/soc/cases", tenant_binding="query")
    if isinstance(result, HttpResponse):
      return result
    if result is None:
      return JsonResponse(
        {"detail": "Case unavailable during FORJD read fallback", "code": "forjd_read_fallback"},
        status=503,
      )
    row = next((item for item in deml_incident_cases(result) if item["id"] == case_id), None)
    if row is None:
      return JsonResponse({"detail": "Case not found"}, status=404)
    return JsonResponse(row, status=200)

  inbound = _json_object(request)
  payload = {
    key: (
      _provider_enum(value, "open")
      if key == "status"
      else _provider_enum(value, "medium")
      if key == "severity"
      else value
    )
    for key, value in inbound.items()
    if key in {"title", "description", "status", "severity", "assigned_actor_id", "metadata"}
  }
  result = await _typed_json_call(
    request,
    f"/api/v1/soc/cases/{quote(case_id, safe='')}",
    payload=payload,
    tenant_binding="body",
  )
  if isinstance(result, HttpResponse):
    return result
  if result is None:
    return _adapter_error_response(AdapterError(503, "FORJD case update is unavailable"))
  return JsonResponse(deml_incident_case(result), status=200)


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
@require_forjd_action({"GET": "read", "POST": "playbook.admin"})
async def playbooks_proxy(request: HttpRequest) -> HttpResponse:
  if request.method not in {"GET", "POST"}:
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  payload: dict[str, object] | None = None
  if request.method == "POST":
    inbound = _json_object(request)
    payload = {
      "name": str(inbound.get("name") or ""),
      "description": str(inbound.get("description") or ""),
      "trigger_conditions": inbound.get("trigger_conditions")
      if isinstance(inbound.get("trigger_conditions"), dict)
      else {},
      "actions": inbound.get("actions") if isinstance(inbound.get("actions"), list) else [],
    }
  result = await _typed_json_call(request, "/api/v1/playbooks", payload=payload)
  if isinstance(result, HttpResponse):
    return result
  if result is None:
    return JsonResponse([], status=200, safe=False)
  if request.method == "GET":
    return JsonResponse(deml_playbooks(result), status=200, safe=False)
  return JsonResponse(deml_playbook(result), status=200)


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
@require_forjd_action({"GET": "read", "PATCH": "playbook.admin", "DELETE": "domain.destructive"})
async def playbook_detail_proxy(request: HttpRequest, playbook_id: str) -> HttpResponse:
  if request.method not in {"GET", "PATCH", "DELETE"}:
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  payload: dict[str, object] | None = None
  if request.method == "GET":
    result = await _typed_json_call(request, "/api/v1/playbooks", tenant_binding="query")
    if isinstance(result, HttpResponse):
      return result
    if result is None:
      return JsonResponse(
        {
          "detail": "Playbook unavailable during FORJD read fallback",
          "code": "forjd_read_fallback",
        },
        status=503,
      )
    row = next((item for item in deml_playbooks(result) if item["id"] == playbook_id), None)
    if row is None:
      return JsonResponse({"detail": "Playbook not found"}, status=404)
    return JsonResponse(row, status=200)
  if request.method == "DELETE":
    return JsonResponse(
      {
        "detail": "FORJD does not expose playbook deletion in contract 1.0",
        "code": "forjd_capability_unavailable",
      },
      status=501,
    )
  if request.method == "PATCH":
    inbound = _json_object(request)
    payload = {
      key: value
      for key, value in inbound.items()
      if key in {"name", "description", "is_active", "trigger_conditions", "actions"}
    }
  result = await _typed_json_call(
    request,
    f"/api/v1/playbooks/{quote(playbook_id, safe='')}",
    payload=payload,
    tenant_binding="query" if request.method in {"GET", "DELETE"} else "body",
  )
  if isinstance(result, HttpResponse):
    return result
  if result is None:
    return _adapter_error_response(AdapterError(503, "FORJD playbook is unavailable"))
  if request.method == "DELETE":
    return JsonResponse({"ok": True}, status=200)
  return JsonResponse(deml_playbook(result), status=200)


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
@require_forjd_action("playbook.execute")
async def playbook_execute_proxy(request: HttpRequest, playbook_id: str) -> HttpResponse:
  if request.method != "POST":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  inbound = _json_object(request)
  payload = {
    "idempotency_key": str(inbound.get("idempotency_key") or request_id_from(request) or uuid4()),
    "context": inbound.get("context") if isinstance(inbound.get("context"), dict) else {},
  }
  result = await _typed_json_call(
    request,
    f"/api/v1/playbooks/{quote(playbook_id, safe='')}/execute",
    payload=payload,
    tenant_binding="body",
  )
  if isinstance(result, HttpResponse):
    return result
  if result is None:
    return _adapter_error_response(AdapterError(503, "FORJD playbook execution is unavailable"))
  return JsonResponse(deml_playbook_execution(result), status=200)


@require_forjd_action("read")
async def playbook_runs_proxy(request: HttpRequest) -> HttpResponse:
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  result = await _typed_json_call(request, "/api/v1/playbooks/runs", tenant_binding="query")
  if isinstance(result, HttpResponse):
    return result
  if result is None:
    return JsonResponse([], status=200, safe=False)
  return JsonResponse(deml_playbook_runs(result), status=200, safe=False)


@csrf_exempt_require_header_auth
@require_forjd_action("playbook.execute")
async def playbook_action_ack_proxy(
  request: HttpRequest,
  run_id: str,
  action_result_id: str,
) -> HttpResponse:
  if request.method != "POST":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  if request.META.get("QUERY_STRING"):
    return JsonResponse({"detail": "Query parameters are not supported"}, status=400)
  try:
    normalized_run_id = _uuid_path(run_id, "run_id")
    normalized_action_id = _uuid_path(action_result_id, "action_result_id")
    payload = _playbook_ack_payload(request)
  except AdapterError as exc:
    return _adapter_error_response(exc)

  result = await _typed_json_call(
    request,
    (
      f"/api/v1/playbooks/runs/{quote(normalized_run_id, safe='')}"
      f"/actions/{quote(normalized_action_id, safe='')}/ack"
    ),
    payload=payload,
    tenant_binding="body",
  )
  if isinstance(result, HttpResponse):
    return result
  if result is None:
    return _adapter_error_response(AdapterError(503, "FORJD action acknowledgement is unavailable"))
  return JsonResponse(deml_playbook_execution(result), status=200)


@csrf_exempt_require_header_auth
@require_forjd_action("playbook.execute")
async def playbook_action_retry_proxy(
  request: HttpRequest,
  run_id: str,
  action_result_id: str,
) -> HttpResponse:
  if request.method != "POST":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  if request.META.get("QUERY_STRING"):
    return JsonResponse({"detail": "Query parameters are not supported"}, status=400)
  try:
    normalized_run_id = _uuid_path(run_id, "run_id")
    normalized_action_id = _uuid_path(action_result_id, "action_result_id")
    payload = _empty_control_payload(request)
  except AdapterError as exc:
    return _adapter_error_response(exc)

  result = await _typed_json_call(
    request,
    (
      f"/api/v1/playbooks/runs/{quote(normalized_run_id, safe='')}"
      f"/actions/{quote(normalized_action_id, safe='')}/retry"
    ),
    payload=payload,
    tenant_binding="body",
  )
  if isinstance(result, HttpResponse):
    return result
  if result is None:
    return _adapter_error_response(AdapterError(503, "FORJD action retry is unavailable"))
  response = deml_playbook_execution(result)
  response["queued"] = bool(result.get("queued", True))
  return JsonResponse(response, status=202)


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
@require_forjd_action({"GET": "read", "POST": "siem.signal.write"})
async def siem_signals_proxy(request: HttpRequest) -> HttpResponse:
  if request.method not in {"GET", "POST"}:
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  payload = _json_object(request) if request.method == "POST" else None
  result = await _typed_json_call(request, "/api/v1/siem/signals", payload=payload)
  if isinstance(result, HttpResponse):
    return result
  if result is None:
    return JsonResponse([], status=200, safe=False)
  if request.method == "GET":
    return JsonResponse(deml_siem_signals(result), status=200, safe=False)
  signal = result.get("signal") if isinstance(result.get("signal"), dict) else result
  return JsonResponse(signal, status=200)


async def compliance_soc_proxy(request: HttpRequest) -> HttpResponse:
  return await native_forjd_proxy(
    request,
    target_path="/api/v1/compliance/soc",
    allowed_methods=("GET",),
    tenant_binding="none",
  )


# --- Product-domain Angular adapters (ML / exports / vulns / integrations) ---
@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
@require_forjd_action({"GET": "read", "POST": "vulnerability.write"})
async def vulnerabilities_list_proxy(request: HttpRequest) -> HttpResponse:
  if request.method not in {"GET", "POST"}:
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  payload: dict[str, object] | None = None
  if request.method == "POST":
    inbound = _json_object(request)
    payload = {
      "title": str(inbound.get("title") or ""),
      "description": str(inbound.get("description") or ""),
      "severity": _provider_enum(inbound.get("severity"), "medium"),
      "status": _provider_enum(inbound.get("status"), "triage"),
      "cve_id": inbound.get("cve_id") or None,
      "asset_id": inbound.get("asset_id") or None,
    }
  result = await _typed_json_call(request, "/api/v1/vulnerabilities", payload=payload)
  if isinstance(result, HttpResponse):
    return result
  if result is None:
    return JsonResponse([], status=200, safe=False)
  if request.method == "GET":
    return JsonResponse(deml_vulnerabilities(result), status=200, safe=False)
  return JsonResponse(deml_vulnerability(result), status=200)


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
@require_forjd_action({"GET": "read", "PATCH": "vulnerability.write"})
async def vulnerability_detail_proxy(request: HttpRequest, vulnerability_id: str) -> HttpResponse:
  if request.method not in {"GET", "PATCH"}:
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  if request.method == "GET":
    result = await _typed_json_call(request, "/api/v1/vulnerabilities", tenant_binding="query")
    if isinstance(result, HttpResponse):
      return result
    if result is None:
      return JsonResponse(
        {
          "detail": "Vulnerability unavailable during FORJD read fallback",
          "code": "forjd_read_fallback",
        },
        status=503,
      )
    row = next(
      (item for item in deml_vulnerabilities(result) if item["id"] == vulnerability_id),
      None,
    )
    if row is None:
      return JsonResponse({"detail": "Vulnerability not found"}, status=404)
    return JsonResponse(row, status=200)

  inbound = _json_object(request)
  payload = {
    key: (
      _provider_enum(value, "triage")
      if key == "status"
      else _provider_enum(value, "medium")
      if key == "severity"
      else value
    )
    for key, value in inbound.items()
    if key
    in {
      "asset_id",
      "title",
      "description",
      "status",
      "severity",
      "impact",
      "likelihood",
      "cve_id",
      "telemetry_context",
    }
  }
  result = await _typed_json_call(
    request,
    f"/api/v1/vulnerabilities/{quote(vulnerability_id, safe='')}",
    payload=payload,
    tenant_binding="body",
  )
  if isinstance(result, HttpResponse):
    return result
  if result is None:
    return _adapter_error_response(AdapterError(503, "FORJD vulnerability is unavailable"))
  return JsonResponse(deml_vulnerability(result), status=200)


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
@require_forjd_action({"GET": "read", "POST": "export.write"})
async def exports_collection_proxy(request: HttpRequest) -> HttpResponse:
  """GET list / POST create — Angular ``/api/v1/exports/``."""
  if request.method == "GET":
    try:
      credential = await _read_credential_or_none(request)
      if credential is None or not reads_from_forjd():
        return JsonResponse([], status=200, safe=False)
      client = _client_for_credential(credential)
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
        return _upstream_error_response(response)
      upstream = json.loads(response.body)
      if not isinstance(upstream, dict):
        raise AdapterError(502, "FORJD returned invalid exports")
      return JsonResponse(deml_export_jobs(upstream), status=200, safe=False)
    except AdapterError as exc:
      return _adapter_error_response(exc)
    except ForjdError as exc:
      if empty_read_fallback_enabled() and exc.status >= 500:
        return JsonResponse([], status=200, safe=False)
      return _forjd_error_response(exc)
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
      return _adapter_error_response(AdapterError(502, "FORJD returned invalid exports"))

  if request.method != "POST":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    if not writes_enabled():
      return JsonResponse(
        {"detail": "FORJD writes are disabled", "code": "forjd_writes_disabled"},
        status=503,
      )
    credential = await _credential_for_request(request)
    payload = _json_object(request)
    # Angular sends kind/format/days — map to FORJD CreateExportRequest.
    kind = str(payload.get("kind") or payload.get("source_kind") or "stream_results")
    fmt = str(payload.get("format") or "csv")
    idempotency_key = str(
      payload.get("idempotency_key")
      or request.META.get("HTTP_IDEMPOTENCY_KEY")
      or request_id_from(request)
    )
    try:
      days = max(1, min(int(payload.get("days") or 7), 90))
    except (TypeError, ValueError) as exc:
      raise AdapterError(400, "Export days must be an integer from 1 to 90") from exc
    body = json.dumps(
      {
        "tenant_id": str(credential.tenant_id),
        "idempotency_key": idempotency_key,
        "format": fmt,
        "source_kind": kind,
        "limit": 1_000 if fmt == "pdf" else 10_000,
        "days": days,
        "site_url": str(payload.get("site_url") or "")[:2048] or None,
      }
    ).encode()
    client = _client_for_credential(credential)
    response = await client.proxy(
      "POST",
      "/api/v1/exports",
      body=body,
      content_type="application/json",
      request_id=request_id_from(request),
    )
    if response.status >= 400:
      return _upstream_error_response(response)
    upstream = json.loads(response.body)
    if not isinstance(upstream, dict):
      raise AdapterError(502, "FORJD returned invalid export job")
    return JsonResponse(deml_export_job(upstream), status=response.status)
  except AdapterError as exc:
    return _adapter_error_response(exc)
  except ForjdError as exc:
    return _forjd_error_response(exc)
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
    return _adapter_error_response(AdapterError(502, "FORJD returned invalid export job"))


@require_forjd_action("read")
async def export_detail_proxy(
  request: HttpRequest,
  export_id: str,
) -> HttpResponse:
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  result = await _typed_json_call(
    request,
    f"/api/v1/exports/{quote(export_id, safe='')}",
    tenant_binding="query",
  )
  if isinstance(result, HttpResponse):
    return result
  if result is None:
    return _adapter_error_response(AdapterError(503, "FORJD export status is unavailable"))
  return JsonResponse(deml_export_job(result), status=200)


@require_forjd_action("read")
async def export_download_proxy(request: HttpRequest, export_id: str) -> HttpResponse:
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  result = await _typed_json_call(
    request,
    f"/api/v1/exports/{quote(export_id, safe='')}/download",
    tenant_binding="query",
  )
  if isinstance(result, HttpResponse):
    return result
  if result is None:
    return _adapter_error_response(AdapterError(503, "FORJD export download is unavailable"))
  raw_url = str(result.get("url") or "")
  parsed = urlsplit(raw_url)
  if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
    return _adapter_error_response(AdapterError(502, "FORJD returned an invalid download URL"))
  return JsonResponse(
    {
      "url": raw_url,
      "filename_hint": str(result.get("filename_hint") or "")[:255],
      "expires_in": int(result.get("expires_in") or 0),
      "checksum_sha256": str(result.get("checksum_sha256") or ""),
      "byte_size": int(result.get("byte_size") or 0),
    },
    status=200,
  )


async def _overview_shaped_read(
  request: HttpRequest,
  shape: Callable[[dict[str, Any]], dict[str, Any]],
  *,
  invalid_detail: str,
) -> HttpResponse:
  """Fetch FORJD analytics overview and shape it for an Angular ML endpoint."""
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    credential = await _read_credential_or_none(request)
    if credential is None or not reads_from_forjd():
      return JsonResponse(shape({}), status=200)
    client = _client_for_credential(credential)
    # Angular passes status_page_id; the overview is tenant-wide, so bind the
    # tenant and drop page-local params FORJD does not accept.
    response = await client.proxy(
      "GET",
      "/api/v1/analytics/overview",
      query_string=f"tenant_id={credential.tenant_id}",
      request_id=request_id_from(request),
    )
    if response.status >= 400:
      if empty_read_fallback_enabled() and response.status >= 500:
        return JsonResponse(shape({}), status=200)
      return _upstream_error_response(response)
    upstream = json.loads(response.body)
    if not isinstance(upstream, dict):
      raise AdapterError(502, invalid_detail)
    return JsonResponse(shape(upstream), status=200)
  except AdapterError as exc:
    return _adapter_error_response(exc)
  except ForjdError as exc:
    if empty_read_fallback_enabled() and exc.status >= 500:
      return JsonResponse(shape({}), status=200)
    return _forjd_error_response(exc)
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
    return _adapter_error_response(AdapterError(502, invalid_detail))


@require_forjd_action("read")
async def ml_latest_proxy(request: HttpRequest) -> HttpResponse:
  """GET /api/v1/ml/latest — SLA stat (Angular ``TrainingResponse``)."""
  return await _overview_shaped_read(
    request,
    deml_sla_latest,
    invalid_detail="FORJD returned an invalid analytics overview",
  )


@require_forjd_action("read")
async def ml_temporal_forecast_proxy(request: HttpRequest) -> HttpResponse:
  """GET /api/v1/ml/temporal-forecast — spike gauge (``TemporalForecastResponse``)."""
  return await _overview_shaped_read(
    request,
    deml_temporal_forecast,
    invalid_detail="FORJD returned an invalid analytics overview",
  )


@require_forjd_action("read")
async def ml_threat_report_proxy(request: HttpRequest) -> HttpResponse:
  """GET /api/v1/ml/threat-intel/report — anomaly stats (``ThreatReportResponse``)."""
  if request.method != "GET":
    return JsonResponse({"detail": "Method not allowed"}, status=405)
  try:
    credential = await _read_credential_or_none(request)
    if credential is None or not reads_from_forjd():
      return JsonResponse(deml_threat_report({}), status=200)
    client = _client_for_credential(credential)
    response = await client.proxy(
      "GET",
      "/api/v1/ml/scores",
      query_string=f"tenant_id={credential.tenant_id}&limit=50",
      request_id=request_id_from(request),
    )
    if response.status >= 400:
      if empty_read_fallback_enabled() and response.status >= 500:
        return JsonResponse(deml_threat_report({}), status=200)
      return _upstream_error_response(response)
    upstream = json.loads(response.body)
    if not isinstance(upstream, dict):
      raise AdapterError(502, "FORJD returned invalid ml scores")
    return JsonResponse(deml_threat_report(upstream), status=200)
  except AdapterError as exc:
    return _adapter_error_response(exc)
  except ForjdError as exc:
    if empty_read_fallback_enabled() and exc.status >= 500:
      return JsonResponse(deml_threat_report({}), status=200)
    return _forjd_error_response(exc)
  except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
    return _adapter_error_response(AdapterError(502, "FORJD returned invalid ml scores"))


@csrf_exempt  # nosemgrep: python.django.security.audit.csrf-exempt.no-csrf-exempt
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
  """Fail closed; empty GETs exist only in explicit migration fallback modes."""
  actor: ForjdActorContext | None = None
  action = action_for_native_request(request.method, request.path)
  if capability != "system-status":
    try:
      actor = await authorize_forjd_action(request, action, resource_id=request.path)
    except ForjdPolicyError as exc:
      return policy_error_response(exc)
  if actor is not None and is_privileged_action(action):
    await record_forjd_audit(
      actor=actor,
      request=request,
      action=action,
      outcome="attempted",
      resource_id=request.path,
    )
  if _is_write_path(request.method, request.path) and not writes_enabled():
    if actor is not None and is_privileged_action(action):
      await record_forjd_audit(
        actor=actor,
        request=request,
        action=action,
        outcome="failed",
        status=503,
        resource_id=request.path,
      )
    return JsonResponse(
      {"detail": "FORJD writes are disabled", "code": "forjd_writes_disabled"},
      status=503,
    )
  if request.method == "GET" and empty_read_fallback_enabled():
    envelope = empty_capability_envelope(capability, request.path)
    if isinstance(envelope, list):
      return JsonResponse(envelope, status=200, safe=False)
    return JsonResponse(envelope, status=200)
  response = JsonResponse(
    {
      "detail": (
        f"The {capability} capability is blocked until FORJD ships a supported "
        "service-principal contract"
      ),
      "code": "forjd_capability_unavailable",
    },
    status=501,
  )
  if actor is not None and is_privileged_action(action):
    await record_forjd_audit(
      actor=actor,
      request=request,
      action=action,
      outcome="failed",
      status=501,
      resource_id=request.path,
    )
  return response
