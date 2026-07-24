"""Auto-provision a FORJD tenant + sealed ``fjsvc_`` for each DEML account.

End users never see FORJD. DEML calls ``POST /api/v1/partner/provision`` with
``FORJD_PROVISION_TOKEN``, seals the minted token, and stores the mapping.
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID, uuid4

import aiohttp
from asgiref.sync import async_to_sync, sync_to_async
from django.conf import settings
from django.db import transaction
from monitor.models import ForjdServiceCredential, ForjdTenantMapping, UserProfile

from forjd.client import ForjdError, is_forjd_service_token, redact_forjd_secrets
from forjd.secrets import is_sealed_ref, open_service_token, seal_service_token, sealed_ref
from forjd.tenancy import (
  ForjdTenantConfigurationError,
  ForjdTenantCredential,
  resolve_forjd_tenant_credential,
)

logger = logging.getLogger("forjd.provision")


class ForjdProvisionError(RuntimeError):
  """Partner provision failed — surface as a typed 503 to the product UI."""


def provision_configured() -> bool:
  return bool(str(getattr(settings, "FORJD_PROVISION_TOKEN", "") or "").strip()) and bool(
    str(getattr(settings, "FORJD_API_URL", "") or "").strip()
  )


def _external_ref(account_id: UUID) -> str:
  return f"deml:{account_id}"


async def _call_partner_provision(
  *,
  external_ref: str,
  remint_if_exists: bool = False,
) -> dict[str, Any]:
  base = str(getattr(settings, "FORJD_API_URL", "") or "").rstrip("/")
  token = str(getattr(settings, "FORJD_PROVISION_TOKEN", "") or "").strip()
  if not base or not token:
    raise ForjdProvisionError("FORJD partner provisioning is not configured")

  url = f"{base}/api/v1/partner/provision"
  payload = {
    "external_ref": external_ref,
    "partner": "deml",
    "include_tenant_erase": True,
    "remint_if_exists": remint_if_exists,
  }
  headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
    "Accept": "application/json",
  }
  api_key = str(getattr(settings, "FORJD_API_KEY", "") or "").strip()
  if api_key:
    headers["X-API-Key"] = api_key

  timeout = aiohttp.ClientTimeout(total=30, connect=5)
  try:
    async with (
      aiohttp.ClientSession(timeout=timeout) as session,
      session.post(url, json=payload, headers=headers) as response,
    ):
      body = await response.json(content_type=None)
      if response.status >= 400:
        detail = body.get("detail") if isinstance(body, dict) else body
        raise ForjdError(response.status, redact_forjd_secrets(str(detail)))
      if not isinstance(body, dict):
        raise ForjdProvisionError("invalid partner provision response")
      return body
  except ForjdError:
    raise
  except Exception as exc:
    raise ForjdProvisionError(redact_forjd_secrets(str(exc))) from exc


def _persist_mapping(
  *,
  account_id: UUID,
  tenant_id: UUID,
  service_token: str,
) -> ForjdTenantMapping:
  ciphertext, encrypted_dek = seal_service_token(service_token)
  credential_id = uuid4()
  with transaction.atomic():
    ForjdServiceCredential.objects.filter(
      deml_account_id=account_id,
      forjd_tenant_id=tenant_id,
      is_active=True,
    ).update(is_active=False)
    ForjdServiceCredential.objects.create(
      id=credential_id,
      deml_account_id=account_id,
      forjd_tenant_id=tenant_id,
      ciphertext=ciphertext,
      encrypted_dek=encrypted_dek,
    )
    mapping = (
      ForjdTenantMapping.objects.select_for_update().filter(deml_account_id=account_id).first()
    )
    if mapping is None:
      mapping = ForjdTenantMapping.objects.create(
        deml_account_id=account_id,
        forjd_tenant_id=tenant_id,
        service_token_secret_ref=sealed_ref(str(credential_id)),
        is_active=True,
      )
    else:
      mapping.forjd_tenant_id = tenant_id
      mapping.service_token_secret_ref = sealed_ref(str(credential_id))
      mapping.is_active = True
      mapping.save()
  return mapping


def _provision_account_credential(
  account_id: UUID,
  *,
  remint_if_exists: bool,
) -> ForjdTenantCredential:
  """Serialize one account's partner provision call behind its profile row."""
  with transaction.atomic():
    try:
      UserProfile.objects.select_for_update().only("pk").get(account_id=account_id)
    except UserProfile.DoesNotExist as exc:
      raise ForjdTenantConfigurationError("This DEML account does not exist") from exc

    # Another automatic request may have completed provisioning while this
    # caller waited. Explicit recovery deliberately rotates the credential.
    if not remint_if_exists:
      try:
        return resolve_forjd_tenant_credential(account_id)
      except ForjdTenantConfigurationError:
        pass

    body = async_to_sync(_call_partner_provision)(
      external_ref=_external_ref(account_id),
      remint_if_exists=remint_if_exists,
    )
    token = ((body.get("service_account") or {}) if isinstance(body, dict) else {}).get("token")
    if not token:
      detail = (
        "partner provision returned an existing tenant without a service token; "
        "explicit credential recovery is required"
        if not remint_if_exists
        else "partner credential recovery did not return a service token"
      )
      raise ForjdProvisionError(detail)
    if not is_forjd_service_token(str(token)):
      raise ForjdProvisionError("partner provision returned an invalid service token")

    tenant_raw = (body.get("tenant") or {}).get("id")
    try:
      tenant_id = UUID(str(tenant_raw))
    except (TypeError, ValueError) as exc:
      raise ForjdProvisionError("partner provision returned an invalid tenant id") from exc

    _persist_mapping(
      account_id=account_id,
      tenant_id=tenant_id,
      service_token=str(token),
    )
    logger.info(
      "forjd_provisioned account_id=%s tenant_id=%s created=%s reminted=%s",
      account_id,
      tenant_id,
      body.get("created"),
      body.get("reminted"),
    )
    return resolve_forjd_tenant_credential(account_id)


async def ensure_forjd_tenant_credential(account_id: UUID) -> ForjdTenantCredential:
  """Return a usable credential, provisioning at most once per DEML account."""
  try:
    return await sync_to_async(resolve_forjd_tenant_credential)(account_id)
  except ForjdTenantConfigurationError:
    pass

  if not provision_configured():
    raise ForjdTenantConfigurationError("This DEML account is not mapped to an active FORJD tenant")

  return await sync_to_async(_provision_account_credential, thread_sensitive=True)(
    account_id,
    remint_if_exists=False,
  )


async def recover_forjd_tenant_credential(account_id: UUID) -> ForjdTenantCredential:
  """Explicitly remint a missing/broken credential for an existing FORJD tenant."""
  if not provision_configured():
    raise ForjdTenantConfigurationError("FORJD partner provisioning is not configured")
  return await sync_to_async(_provision_account_credential, thread_sensitive=True)(
    account_id,
    remint_if_exists=True,
  )


def resolve_sealed_service_token(
  secret_ref: str,
  *,
  expected_account_id: UUID,
  expected_tenant_id: UUID,
) -> str:
  if not is_sealed_ref(secret_ref):
    raise ForjdTenantConfigurationError("not a sealed service token reference")
  credential_id = secret_ref.removeprefix("sealed:")
  row = ForjdServiceCredential.objects.filter(
    id=credential_id,
    deml_account_id=expected_account_id,
    forjd_tenant_id=expected_tenant_id,
    is_active=True,
  ).first()
  if row is None:
    raise ForjdTenantConfigurationError("sealed FORJD service credential is unavailable")
  return open_service_token(row.ciphertext, row.encrypted_dek)
