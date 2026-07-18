"""Firebase-authenticated handoff of sealed telemetry to FORJD."""

from __future__ import annotations

import base64
import binascii
import hashlib
import re
from typing import Any, Final, Literal
from uuid import UUID

from asgiref.sync import sync_to_async
from ninja import Field, Router, Schema
from ninja.errors import HttpError
from pydantic import ConfigDict, field_validator, model_validator

from forjd.client import ForjdClient, ForjdError
from forjd.tenancy import (
  ForjdTenantConfigurationError,
  ForjdTenantCredential,
  resolve_forjd_tenant_credential,
)

router = Router(tags=["FORJD"])

TELEMETRY_CONTENT_TYPE: Final[str] = "application/forjd-telemetry+v1"
TELEMETRY_WORKFLOW_ID: Final[str] = "deml_telemetry"
ALLOWED_METADATA_KEYS: Final[frozenset[str]] = frozenset(
  {
    "source",
    "channel",
    "region",
    "env",
    "environment",
    "product",
    "component",
    "namespace",
    "device_id",
    "series_id",
    "label",
    "labels",
    "tags",
  }
)
LIST_METADATA_KEYS: Final[frozenset[str]] = frozenset({"labels", "tags"})
ROUTING_TAG_PATTERN: Final[re.Pattern[str]] = re.compile(r"\A[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}\Z")


class StrictSchema(Schema):
  model_config = ConfigDict(extra="forbid")


class EncryptionOptions(StrictSchema):
  mode: Literal["e2ee"] = "e2ee"
  algo: Literal["aes-256-gcm"] = "aes-256-gcm"


class EncryptedEnvelope(StrictSchema):
  algo: Literal["aes-256-gcm"] = "aes-256-gcm"
  key_id: str = Field(min_length=1, max_length=256)
  nonce: str = Field(min_length=8, max_length=64)
  ciphertext: str = Field(min_length=24, max_length=1_048_576)
  ciphertext_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
  ratchet_header: str | None = Field(default=None, max_length=8192)

  @model_validator(mode="after")
  def validate_forjd_wire_envelope(self) -> EncryptedEnvelope:
    """Match FORJD's AES-GCM envelope checks without opening the ciphertext."""
    try:
      nonce = base64.b64decode(self.nonce, validate=True)
      ciphertext = base64.b64decode(self.ciphertext, validate=True)
    except (binascii.Error, ValueError) as exc:
      raise ValueError("nonce and ciphertext must be valid base64") from exc
    if len(nonce) != 12:
      raise ValueError("nonce must decode to 12 bytes")
    if len(ciphertext) < 17:
      raise ValueError("ciphertext must include an AES-GCM tag and encrypted body")
    if hashlib.sha256(ciphertext).hexdigest() != self.ciphertext_sha256:
      raise ValueError("ciphertext_sha256 does not match ciphertext")
    return self


class SealedEvent(StrictSchema):
  """The only event shape DEML may forward to FORJD today."""

  tenant_id: UUID
  client_event_id: str = Field(min_length=1, max_length=128)
  content_type: Literal["application/forjd-telemetry+v1"] = TELEMETRY_CONTENT_TYPE
  event_type: Literal["deml.metric", "deml.alert"] = "deml.metric"
  schema_version: int = Field(default=1, ge=1, le=1000)
  workflow_id: Literal["deml_telemetry"] = TELEMETRY_WORKFLOW_ID
  encryption: EncryptionOptions = Field(default_factory=EncryptionOptions)
  envelope: EncryptedEnvelope
  metadata: dict[str, Any] = Field(default_factory=dict)

  @field_validator("metadata")
  @classmethod
  def validate_routing_metadata(cls, metadata: dict[str, Any]) -> dict[str, Any]:
    """Reject plaintext-shaped metadata before it can leave DEML."""
    if len(metadata) > 32 or len(str(metadata)) > 4096:
      raise ValueError("metadata exceeds the FORJD routing-tag limits")
    invalid_keys = sorted(
      str(key) for key in metadata if not isinstance(key, str) or key not in ALLOWED_METADATA_KEYS
    )
    if invalid_keys:
      raise ValueError(f"metadata contains non-routing keys: {', '.join(invalid_keys)}")
    for key, value in metadata.items():
      values: list[object]
      if key in LIST_METADATA_KEYS:
        if not isinstance(value, list) or not value or len(value) > 32:
          raise ValueError(f"metadata.{key} must be a non-empty list of routing tags")
        values = value
      else:
        values = [value]
      if any(
        not isinstance(item, str) or ROUTING_TAG_PATTERN.fullmatch(item) is None for item in values
      ):
        raise ValueError(
          f"metadata.{key} contains a non-routing value; plaintext and identifiers are forbidden"
        )
    return metadata


class SealedEventBatch(StrictSchema):
  events: list[SealedEvent] = Field(min_length=1, max_length=100)


def request_id_from(request: Any) -> str | None:
  value = str(getattr(request, "correlation_id", "")).strip()
  return value or None


async def resolve_request_credential(request: Any) -> ForjdTenantCredential:
  """Resolve the caller's DEML account to its tenant-scoped FORJD secret."""
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")

  account_id = await sync_to_async(
    lambda: getattr(getattr(request.user, "profile", None), "account_id", None)
  )()
  if account_id is None:
    raise HttpError(403, "The authenticated user has no DEML account")

  try:
    return await sync_to_async(resolve_forjd_tenant_credential)(account_id)
  except ForjdTenantConfigurationError as exc:
    raise HttpError(503, "FORJD tenant service credential is unavailable") from exc


def require_mapped_tenant(payload_tenant_id: UUID, credential: ForjdTenantCredential) -> None:
  if payload_tenant_id != credential.tenant_id:
    raise HttpError(403, "Event tenant does not match the account's FORJD tenant")


@router.get("/health", auth=None)
async def health(request: Any) -> dict[str, Any]:
  try:
    return await ForjdClient(use_service_auth=False).health(request_id=request_id_from(request))
  except ForjdError as exc:
    raise HttpError(exc.status, str(exc)) from exc


@router.post("/ingest")
async def ingest(request: Any, payload: SealedEvent) -> dict[str, Any]:
  credential = await resolve_request_credential(request)
  require_mapped_tenant(payload.tenant_id, credential)

  try:
    return await ForjdClient(
      tenant_id=credential.tenant_id,
      service_token=credential.service_token,
    ).ingest(
      payload.model_dump(mode="json"),
      request_id=request_id_from(request),
    )
  except ForjdError as exc:
    raise HttpError(exc.status, str(exc)) from exc


@router.post("/ingest/events:batch")
async def ingest_batch(request: Any, payload: SealedEventBatch) -> dict[str, Any]:
  credential = await resolve_request_credential(request)
  for event in payload.events:
    require_mapped_tenant(event.tenant_id, credential)

  try:
    return await ForjdClient(
      tenant_id=credential.tenant_id,
      service_token=credential.service_token,
    ).request_json(
      "POST",
      "/api/v1/ingest/events:batch",
      payload=payload.model_dump(mode="json"),
      request_id=request_id_from(request),
    )
  except ForjdError as exc:
    raise HttpError(exc.status, str(exc)) from exc
