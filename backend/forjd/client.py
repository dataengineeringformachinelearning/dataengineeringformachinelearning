"""Tenant-bound HTTP client for the FORJD data plane."""

from __future__ import annotations

import asyncio
import json
import logging
import re
from dataclasses import dataclass
from typing import Any, Final
from urllib.parse import parse_qsl, urlencode, urlsplit
from uuid import UUID

import aiohttp
from django.conf import settings

logger = logging.getLogger("forjd.client")

DEFAULT_TIMEOUT_SECONDS: Final[float] = 20.0
CONNECT_TIMEOUT_SECONDS: Final[float] = 5.0
SERVICE_TOKEN_PREFIX: Final[str] = "fjsvc_"
SERVICE_TOKEN_PATTERN: Final[re.Pattern[str]] = re.compile(r"\Afjsvc_[^_\s]{8}_[^\s]+\Z")
# Nested JSON keys that must match the bound tenant (fail closed).
TENANT_ASSERTION_KEYS: Final[frozenset[str]] = frozenset({"tenant_id", "confirm_tenant_id"})
# Idempotent methods safe to retry once on transient upstream errors.
_RETRYABLE_METHODS: Final[frozenset[str]] = frozenset({"GET", "HEAD"})
_RETRYABLE_STATUSES: Final[frozenset[int]] = frozenset({502, 503, 504})
_MAX_GET_ATTEMPTS: Final[int] = 2

_connector: aiohttp.TCPConnector | None = None


def is_forjd_service_token(token: str) -> bool:
  """Match FORJD's opaque ``fjsvc_<8-char-prefix>_<secret>`` format."""
  return SERVICE_TOKEN_PATTERN.fullmatch(token) is not None


def redact_forjd_secrets(message: str) -> str:
  """Strip opaque tokens / Bearer credentials from error surfaces."""
  text = str(message or "")
  text = re.sub(r"fjsvc_[^\s'\"]+", "fjsvc_[REDACTED]", text)
  text = re.sub(r"(?i)Bearer\s+[^\s'\"]+", "Bearer [REDACTED]", text)
  return text


class ForjdError(RuntimeError):
  def __init__(self, status: int, message: str) -> None:
    super().__init__(redact_forjd_secrets(message))
    self.status = status


@dataclass(frozen=True, slots=True)
class ForjdResponse:
  status: int
  body: bytes
  content_type: str


def _shared_connector() -> aiohttp.TCPConnector:
  global _connector
  if _connector is None or _connector.closed:
    _connector = aiohttp.TCPConnector(limit=32, ttl_dns_cache=300)
  return _connector


class ForjdClient:
  """Call FORJD with one opaque service token bound to one FORJD tenant."""

  def __init__(
    self,
    *,
    tenant_id: str | UUID | None = None,
    service_token: str | None = None,
    use_service_auth: bool = True,
  ) -> None:
    self.base_url = str(getattr(settings, "FORJD_API_URL", "") or "").strip().rstrip("/")
    self.use_service_auth = use_service_auth
    if not use_service_auth:
      self.service_token = ""
      self.tenant_id = ""
      return
    configured_token = getattr(settings, "FORJD_SERVICE_TOKEN", "")
    self.service_token = str(configured_token if service_token is None else service_token)
    configured_tenant_id = getattr(settings, "FORJD_TENANT_ID", "")
    raw_tenant_id = configured_tenant_id if tenant_id is None else tenant_id
    self.tenant_id = self._normalize_configured_tenant_id(raw_tenant_id)

  @staticmethod
  def _normalize_configured_tenant_id(tenant_id: str | UUID | None) -> str:
    raw_tenant_id = str(tenant_id or "").strip()
    if not raw_tenant_id:
      return ""
    try:
      return str(UUID(raw_tenant_id))
    except ValueError as exc:
      raise ForjdError(503, "FORJD_TENANT_ID must be a valid UUID") from exc

  def _validate_configuration(self) -> None:
    parsed_url = urlsplit(self.base_url)
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
      raise ForjdError(503, "FORJD_API_URL is not configured with a valid HTTP URL")
    if not self.use_service_auth:
      return
    if not self.service_token:
      raise ForjdError(503, "FORJD_SERVICE_TOKEN is not configured")
    if not is_forjd_service_token(self.service_token):
      raise ForjdError(503, "FORJD_SERVICE_TOKEN is not a valid FORJD service token")
    if not self.tenant_id:
      raise ForjdError(503, "FORJD_TENANT_ID is not configured")

  def _require_bound_tenant(self, tenant_id: object, *, required: bool = False) -> None:
    raw_tenant_id = str(tenant_id or "").strip()
    if not raw_tenant_id:
      if required:
        raise ForjdError(400, "FORJD tenant-scoped request requires tenant_id")
      return
    try:
      normalized_tenant_id = str(UUID(raw_tenant_id))
    except ValueError as exc:
      raise ForjdError(400, "FORJD request tenant_id must be a valid UUID") from exc
    if normalized_tenant_id != self.tenant_id:
      raise ForjdError(403, "FORJD request tenant_id does not match the service token tenant")

  def _validate_tenant_assertions(self, value: Any) -> None:
    if isinstance(value, dict):
      for key in TENANT_ASSERTION_KEYS:
        if key in value:
          self._require_bound_tenant(value[key])
      for nested_value in value.values():
        self._validate_tenant_assertions(nested_value)
    elif isinstance(value, list):
      for nested_value in value:
        self._validate_tenant_assertions(nested_value)

  def _validate_request_tenants(
    self,
    *,
    body: bytes | None,
    query_string: str,
    content_type: str,
  ) -> None:
    for key, value in parse_qsl(query_string, keep_blank_values=True):
      if key in TENANT_ASSERTION_KEYS:
        self._require_bound_tenant(value)

    media_type = content_type.partition(";")[0].strip().lower()
    if body is None or not (media_type == "application/json" or media_type.endswith("+json")):
      return
    try:
      payload = json.loads(body)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
      # Fail closed — never skip tenant checks because the body claimed JSON.
      raise ForjdError(400, "FORJD request body must be valid JSON") from exc
    self._validate_tenant_assertions(payload)

  def _headers(
    self,
    *,
    content_type: str,
    has_body: bool,
    request_id: str | None,
  ) -> dict[str, str]:
    headers = {"Accept": "application/json"}
    if self.use_service_auth:
      headers["Authorization"] = f"Bearer {self.service_token}"
    if has_body:
      headers["Content-Type"] = content_type
    normalized_request_id = str(request_id or "").strip()
    if "\r" in normalized_request_id or "\n" in normalized_request_id:
      raise ForjdError(400, "X-Request-ID contains invalid characters")
    if normalized_request_id:
      headers["X-Request-ID"] = normalized_request_id
    return headers

  async def proxy(
    self,
    method: str,
    path: str,
    *,
    body: bytes | None = None,
    query_string: str = "",
    content_type: str = "application/json",
    request_id: str | None = None,
  ) -> ForjdResponse:
    self._validate_configuration()
    if not path.startswith("/") or path.startswith("//"):
      raise ForjdError(400, "FORJD request path must be an absolute API path")
    if query_string.startswith("?"):
      raise ForjdError(400, "FORJD query_string must not include a leading question mark")
    if self.use_service_auth:
      self._validate_request_tenants(
        body=body,
        query_string=query_string,
        content_type=content_type,
      )
    headers = self._headers(
      content_type=content_type,
      has_body=body is not None,
      request_id=request_id,
    )

    url = f"{self.base_url}{path}"
    if query_string:
      url = f"{url}?{query_string}"
    timeout = aiohttp.ClientTimeout(
      total=DEFAULT_TIMEOUT_SECONDS,
      connect=CONNECT_TIMEOUT_SECONDS,
      sock_read=DEFAULT_TIMEOUT_SECONDS,
    )
    verb = method.upper()
    attempts = _MAX_GET_ATTEMPTS if verb in _RETRYABLE_METHODS else 1
    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
      try:
        async with aiohttp.ClientSession(
          timeout=timeout,
          connector=_shared_connector(),
          connector_owner=False,
        ) as session:
          async with session.request(verb, url, data=body, headers=headers) as response:
            result = ForjdResponse(
              status=response.status,
              body=await response.read(),
              content_type=response.headers.get("Content-Type", "application/json"),
            )
        if (
          attempt < attempts and verb in _RETRYABLE_METHODS and result.status in _RETRYABLE_STATUSES
        ):
          await asyncio.sleep(0.05 * attempt)
          continue
        return result
      except ForjdError:
        raise
      except (aiohttp.ClientError, TimeoutError, asyncio.TimeoutError) as exc:
        last_error = exc
        if attempt < attempts and verb in _RETRYABLE_METHODS:
          logger.warning(
            "forjd_transient method=%s path=%s attempt=%s error=%s",
            verb,
            path,
            attempt,
            type(exc).__name__,
          )
          await asyncio.sleep(0.05 * attempt)
          continue
        raise ForjdError(502, "FORJD is unavailable") from exc

    raise ForjdError(502, "FORJD is unavailable") from last_error

  async def request_json(
    self,
    method: str,
    path: str,
    *,
    payload: dict[str, Any] | None = None,
    query_string: str = "",
    request_id: str | None = None,
  ) -> dict[str, Any]:
    response = await self.proxy(
      method,
      path,
      body=json.dumps(payload).encode() if payload is not None else None,
      query_string=query_string,
      request_id=request_id,
    )
    try:
      result = json.loads(response.body or b"{}")
    except json.JSONDecodeError as exc:
      raise ForjdError(502, "FORJD returned invalid JSON") from exc
    if response.status >= 400:
      detail = result.get("detail", "FORJD request failed") if isinstance(result, dict) else result
      raise ForjdError(response.status, str(detail))
    if not isinstance(result, dict):
      raise ForjdError(502, "FORJD returned an invalid response")
    return result

  async def health(self, request_id: str | None = None) -> dict[str, Any]:
    return await self.request_json("GET", "/health", request_id=request_id)

  async def ready(self, request_id: str | None = None) -> dict[str, Any]:
    return await self.request_json("GET", "/ready", request_id=request_id)

  async def ingest(
    self,
    payload: dict[str, Any],
    request_id: str | None = None,
  ) -> dict[str, Any]:
    self._validate_configuration()
    self._require_bound_tenant(payload.get("tenant_id"), required=True)
    return await self.request_json(
      "POST",
      "/api/v1/ingest",
      payload=payload,
      request_id=request_id,
    )

  async def list_projections(
    self,
    *,
    workflow_id: str | None = None,
    limit: int = 25,
    request_id: str | None = None,
  ) -> dict[str, Any]:
    """GET /api/v1/projections for the bound tenant (Angular list adapter)."""
    from forjd.api import WORKFLOW_ID_TO_FORJD

    self._validate_configuration()
    query: dict[str, str] = {"tenant_id": self.tenant_id, "limit": str(max(1, min(limit, 200)))}
    if workflow_id:
      query["workflow_id"] = WORKFLOW_ID_TO_FORJD.get(workflow_id, workflow_id)
    return await self.request_json(
      "GET",
      "/api/v1/projections",
      query_string=urlencode(query),
      request_id=request_id,
    )

  async def run_projections(
    self,
    *,
    workflow_id: str | None = None,
    request_id: str | None = None,
  ) -> dict[str, Any]:
    """POST /api/v1/projections/run for the bound tenant."""
    from forjd.api import WORKFLOW_ID_TO_FORJD

    self._validate_configuration()
    payload: dict[str, Any] = {"tenant_id": self.tenant_id}
    if workflow_id:
      payload["workflow_id"] = WORKFLOW_ID_TO_FORJD.get(workflow_id, workflow_id)
    return await self.request_json(
      "POST",
      "/api/v1/projections/run",
      payload=payload,
      request_id=request_id,
    )

  async def erase_tenant(
    self,
    tenant_id: str,
    *,
    request_id: str | None = None,
  ) -> dict[str, Any]:
    """POST /api/v1/tenants/{id}/erase — durable wipe + revoke fjsvc_ credentials."""
    self._validate_configuration()
    self._require_bound_tenant(tenant_id, required=True)
    return await self.request_json(
      "POST",
      f"/api/v1/tenants/{tenant_id}/erase",
      payload={"confirm_tenant_id": tenant_id},
      request_id=request_id,
    )

  async def delete_tenant(self, tenant_id: str) -> dict[str, Any]:
    """Alias for ``erase_tenant`` (account-deletion saga)."""
    return await self.erase_tenant(tenant_id)
