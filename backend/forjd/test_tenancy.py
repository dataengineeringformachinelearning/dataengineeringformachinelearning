from __future__ import annotations

from typing import Any
from unittest.mock import patch
from uuid import uuid4

import pytest
from django.test import override_settings
from monitor.models import ForjdTenantMapping

from forjd.tenancy import ForjdTenantConfigurationError, resolve_forjd_tenant_credential


@pytest.mark.django_db
def test_resolves_tenant_bound_default_service_token() -> None:
  account_id = uuid4()
  tenant_id = uuid4()
  ForjdTenantMapping.objects.create(
    deml_account_id=account_id,
    forjd_tenant_id=tenant_id,
  )

  with override_settings(
    FORJD_SERVICE_TOKEN="fjsvc_00000000_default-secret",
    FORJD_TENANT_ID=str(tenant_id),
  ):
    credential = resolve_forjd_tenant_credential(account_id)

  assert credential.tenant_id == tenant_id
  assert credential.service_token == "fjsvc_00000000_default-secret"  # pragma: allowlist secret


@pytest.mark.django_db
def test_resolves_per_tenant_environment_secret_reference() -> None:
  account_id = uuid4()
  tenant_id = uuid4()
  ForjdTenantMapping.objects.create(
    deml_account_id=account_id,
    forjd_tenant_id=tenant_id,
    service_token_secret_ref="env:FORJD_SERVICE_TOKEN_CUSTOMER_A",  # pragma: allowlist secret
  )

  with patch.dict(
    "os.environ",
    {"FORJD_SERVICE_TOKEN_CUSTOMER_A": "fjsvc_a1b2c3d4_customer-a-secret"},
    clear=False,
  ):
    credential = resolve_forjd_tenant_credential(account_id)

  assert credential.tenant_id == tenant_id
  assert credential.service_token == "fjsvc_a1b2c3d4_customer-a-secret"  # pragma: allowlist secret


@pytest.mark.django_db
@pytest.mark.parametrize(
  ("secret_ref", "settings_overrides"),
  [
    ("env:DATABASE_URL", {}),
    ("literal:fjsvc_secret", {}),
    ("env:FORJD_SERVICE_TOKEN", {"FORJD_SERVICE_TOKEN": "not-a-service-token"}),
  ],
)
def test_rejects_unsafe_or_invalid_secret_reference(
  secret_ref: str,
  settings_overrides: dict[str, Any],
) -> None:
  account_id = uuid4()
  ForjdTenantMapping.objects.create(
    deml_account_id=account_id,
    forjd_tenant_id=uuid4(),
    service_token_secret_ref=secret_ref,
  )

  with override_settings(**settings_overrides), pytest.raises(ForjdTenantConfigurationError):
    resolve_forjd_tenant_credential(account_id)


@pytest.mark.django_db
@override_settings(
  FORJD_SERVICE_TOKEN="fjsvc_00000000_default-secret",
  FORJD_TENANT_ID="00000000-0000-0000-0000-000000000001",
)
def test_default_service_token_cannot_be_reused_for_another_tenant() -> None:
  account_id = uuid4()
  ForjdTenantMapping.objects.create(
    deml_account_id=account_id,
    forjd_tenant_id=uuid4(),
  )

  with pytest.raises(ForjdTenantConfigurationError, match="does not match"):
    resolve_forjd_tenant_credential(account_id)


@pytest.mark.django_db
def test_unmapped_account_fails_closed() -> None:
  with pytest.raises(ForjdTenantConfigurationError, match="not mapped"):
    resolve_forjd_tenant_credential(uuid4())
