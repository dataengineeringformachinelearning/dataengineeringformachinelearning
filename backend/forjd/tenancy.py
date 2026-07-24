"""Tenant binding and secret-reference resolution for FORJD service calls."""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Final
from uuid import UUID

from django.conf import settings
from monitor.models import ForjdTenantMapping

from forjd.client import is_forjd_service_token
from forjd.secrets import is_sealed_ref

DEFAULT_SERVICE_TOKEN_SECRET_REF: Final[str] = "env:FORJD_SERVICE_TOKEN"
_SERVICE_TOKEN_ENV_PATTERN: Final[re.Pattern[str]] = re.compile(
  r"FORJD_SERVICE_TOKEN(?:_[A-Z0-9_]+)?\Z"
)
_SEALED_REF_PATTERN: Final[re.Pattern[str]] = re.compile(
  r"\Asealed:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\Z",
  re.IGNORECASE,
)


class ForjdTenantConfigurationError(RuntimeError):
  """Raised when an account has no safe, usable FORJD tenant credential."""


@dataclass(frozen=True, slots=True)
class ForjdTenantCredential:
  tenant_id: UUID
  service_token: str


def validate_service_token_secret_ref(secret_ref: str) -> str:
  """Accept ``env:FORJD_SERVICE_TOKEN[_SUFFIX]`` or ``sealed:<uuid>`` refs."""
  raw = secret_ref.strip()
  if is_sealed_ref(raw):
    if not _SEALED_REF_PATTERN.fullmatch(raw):
      raise ForjdTenantConfigurationError("FORJD sealed token reference must be sealed:<uuid>")
    return raw
  prefix, separator, env_name = raw.partition(":")
  if separator != ":" or prefix != "env" or not _SERVICE_TOKEN_ENV_PATTERN.fullmatch(env_name):
    raise ForjdTenantConfigurationError(
      "FORJD service token reference must be env:FORJD_SERVICE_TOKEN* or sealed:<uuid>"
    )
  return f"env:{env_name}"


def _resolve_env_service_token(secret_ref: str) -> str:
  env_name = secret_ref.removeprefix("env:")

  # Prefer Django settings for the default ref so tests / local settings win
  # over a polluted process environment.
  if secret_ref == DEFAULT_SERVICE_TOKEN_SECRET_REF:
    token = str(getattr(settings, "FORJD_SERVICE_TOKEN", "")).strip()
    if not token:
      token = os.getenv(env_name, "").strip()
  else:
    token = os.getenv(env_name, "").strip()
  if not token:
    raise ForjdTenantConfigurationError("FORJD service token secret is unavailable")
  if not is_forjd_service_token(token):
    raise ForjdTenantConfigurationError("FORJD service token has an invalid format")
  return token


def _resolve_service_token(
  secret_ref: str,
  *,
  expected_account_id: UUID,
  expected_tenant_id: UUID,
) -> str:
  normalized = validate_service_token_secret_ref(secret_ref)
  if is_sealed_ref(normalized):
    from forjd.provision import resolve_sealed_service_token

    token = resolve_sealed_service_token(
      normalized,
      expected_account_id=expected_account_id,
      expected_tenant_id=expected_tenant_id,
    )
    if not is_forjd_service_token(token):
      raise ForjdTenantConfigurationError("FORJD service token has an invalid format")
    return token
  return _resolve_env_service_token(normalized)


def _expected_tenant_env_name(secret_ref: str) -> str:
  """Map env:FORJD_SERVICE_TOKEN[_SUFFIX] → FORJD_TENANT_ID[_SUFFIX]."""
  env_name = secret_ref.removeprefix("env:")
  if env_name == "FORJD_SERVICE_TOKEN":
    return "FORJD_TENANT_ID"
  suffix = env_name.removeprefix("FORJD_SERVICE_TOKEN")
  return f"FORJD_TENANT_ID{suffix}"


def _require_tenant_env_match(tenant_id: UUID, secret_ref: str) -> None:
  """Bind each env-backed service-token ref to a matching FORJD_TENANT_ID value."""
  if is_sealed_ref(secret_ref):
    return
  tenant_env = _expected_tenant_env_name(secret_ref)
  if secret_ref == DEFAULT_SERVICE_TOKEN_SECRET_REF:
    configured = str(getattr(settings, "FORJD_TENANT_ID", "")).strip()
    if not configured:
      configured = os.getenv(tenant_env, "").strip()
  else:
    configured = os.getenv(tenant_env, "").strip()
  if not configured:
    raise ForjdTenantConfigurationError(f"{tenant_env} is unavailable")
  try:
    expected_tenant_id = UUID(configured)
  except ValueError as exc:
    raise ForjdTenantConfigurationError(f"{tenant_env} is not a valid UUID") from exc
  if tenant_id != expected_tenant_id:
    raise ForjdTenantConfigurationError(
      "The mapped FORJD tenant does not match the service credential tenant"
    )


def resolve_forjd_tenant_credential(
  account_id: UUID,
  *,
  allow_inactive: bool = False,
) -> ForjdTenantCredential:
  """Resolve the mapped FORJD tenant + ``fjsvc_`` token for an account.

  ``allow_inactive`` is for account-deletion retries after the mapping was
  deactivated to stop new partner calls — never use it for normal BFF traffic.
  """
  qs = ForjdTenantMapping.objects.filter(deml_account_id=account_id)
  mapping = qs.filter(is_active=True).first()
  if mapping is None and allow_inactive:
    mapping = qs.order_by("-updated_at").first()
  if mapping is None:
    raise ForjdTenantConfigurationError(
      "This DEML account is not mapped to an active FORJD tenant"
      if not allow_inactive
      else "This DEML account has no FORJD tenant mapping to erase"
    )

  secret_ref = validate_service_token_secret_ref(mapping.service_token_secret_ref)
  _require_tenant_env_match(mapping.forjd_tenant_id, secret_ref)

  return ForjdTenantCredential(
    tenant_id=mapping.forjd_tenant_id,
    service_token=_resolve_service_token(
      secret_ref,
      expected_account_id=account_id,
      expected_tenant_id=mapping.forjd_tenant_id,
    ),
  )


def resolve_forjd_snapshot_credential(
  account_id: UUID,
  tenant_id: UUID,
  service_token_secret_ref: str,
) -> ForjdTenantCredential:
  """Resolve an assignment-once destination without consulting the current mapping."""
  secret_ref = validate_service_token_secret_ref(service_token_secret_ref)
  _require_tenant_env_match(tenant_id, secret_ref)
  return ForjdTenantCredential(
    tenant_id=tenant_id,
    service_token=_resolve_service_token(
      secret_ref,
      expected_account_id=account_id,
      expected_tenant_id=tenant_id,
    ),
  )


def resolve_forjd_tenant_credential_by_tenant(
  forjd_tenant_id: UUID,
  *,
  allow_inactive: bool = False,
) -> ForjdTenantCredential:
  """Reverse-lookup: FORJD tenant UUID → active DEML mapping credential."""
  qs = ForjdTenantMapping.objects.filter(forjd_tenant_id=forjd_tenant_id)
  mapping = qs.filter(is_active=True).first()
  if mapping is None and allow_inactive:
    mapping = qs.order_by("-updated_at").first()
  if mapping is None:
    raise ForjdTenantConfigurationError("No DEML account is mapped to this FORJD tenant")
  return resolve_forjd_tenant_credential(mapping.deml_account_id, allow_inactive=allow_inactive)
