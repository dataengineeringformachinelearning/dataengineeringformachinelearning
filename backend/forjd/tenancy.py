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

DEFAULT_SERVICE_TOKEN_SECRET_REF: Final[str] = "env:FORJD_SERVICE_TOKEN"
_SERVICE_TOKEN_ENV_PATTERN: Final[re.Pattern[str]] = re.compile(
  r"FORJD_SERVICE_TOKEN(?:_[A-Z0-9_]+)?\Z"
)


class ForjdTenantConfigurationError(RuntimeError):
  """Raised when an account has no safe, usable FORJD tenant credential."""


@dataclass(frozen=True, slots=True)
class ForjdTenantCredential:
  tenant_id: UUID
  service_token: str


def validate_service_token_secret_ref(secret_ref: str) -> str:
  prefix, separator, env_name = secret_ref.strip().partition(":")
  if separator != ":" or prefix != "env" or not _SERVICE_TOKEN_ENV_PATTERN.fullmatch(env_name):
    raise ForjdTenantConfigurationError(
      "FORJD service token reference must name a FORJD_SERVICE_TOKEN environment variable"
    )
  return f"env:{env_name}"


def _resolve_service_token(secret_ref: str) -> str:
  normalized_secret_ref = validate_service_token_secret_ref(secret_ref)
  env_name = normalized_secret_ref.removeprefix("env:")

  # Prefer Django settings for the default ref so tests / local settings win
  # over a polluted process environment.
  if normalized_secret_ref == DEFAULT_SERVICE_TOKEN_SECRET_REF:
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


def _expected_tenant_env_name(secret_ref: str) -> str:
  """Map env:FORJD_SERVICE_TOKEN[_SUFFIX] → FORJD_TENANT_ID[_SUFFIX]."""
  env_name = secret_ref.removeprefix("env:")
  if env_name == "FORJD_SERVICE_TOKEN":
    return "FORJD_TENANT_ID"
  suffix = env_name.removeprefix("FORJD_SERVICE_TOKEN")
  return f"FORJD_TENANT_ID{suffix}"


def _require_tenant_env_match(mapping: ForjdTenantMapping, secret_ref: str) -> None:
  """Bind each service-token ref to a matching FORJD_TENANT_ID[_SUFFIX] value."""
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
  if mapping.forjd_tenant_id != expected_tenant_id:
    raise ForjdTenantConfigurationError(
      "The mapped FORJD tenant does not match the service credential tenant"
    )


def resolve_forjd_tenant_credential(account_id: UUID) -> ForjdTenantCredential:
  mapping = ForjdTenantMapping.objects.filter(
    deml_account_id=account_id,
    is_active=True,
  ).first()
  if mapping is None:
    raise ForjdTenantConfigurationError("This DEML account is not mapped to an active FORJD tenant")

  secret_ref = validate_service_token_secret_ref(mapping.service_token_secret_ref)
  _require_tenant_env_match(mapping, secret_ref)

  return ForjdTenantCredential(
    tenant_id=mapping.forjd_tenant_id,
    service_token=_resolve_service_token(secret_ref),
  )
