from __future__ import annotations

from unittest.mock import patch
from uuid import UUID, uuid4

import pytest
from django.core.exceptions import ValidationError
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
    {
      "FORJD_SERVICE_TOKEN_CUSTOMER_A": "fjsvc_a1b2c3d4_customer-a-secret",
      "FORJD_TENANT_ID_CUSTOMER_A": str(tenant_id),
    },
    clear=False,
  ):
    credential = resolve_forjd_tenant_credential(account_id)

  assert credential.tenant_id == tenant_id
  assert credential.service_token == "fjsvc_a1b2c3d4_customer-a-secret"  # pragma: allowlist secret


@pytest.mark.django_db
@pytest.mark.parametrize(
  "secret_ref",
  [
    "env:DATABASE_URL",
    "literal:fjsvc_secret",
  ],
)
def test_rejects_unsafe_secret_reference_at_save(secret_ref: str) -> None:
  with pytest.raises(ValidationError):
    ForjdTenantMapping.objects.create(
      deml_account_id=uuid4(),
      forjd_tenant_id=uuid4(),
      service_token_secret_ref=secret_ref,
    )


@pytest.mark.django_db
@override_settings(
  FORJD_SERVICE_TOKEN="not-a-service-token",
  FORJD_TENANT_ID="00000000-0000-0000-0000-000000000001",
)
def test_rejects_invalid_token_format_at_resolve() -> None:
  account_id = uuid4()
  ForjdTenantMapping.objects.create(
    deml_account_id=account_id,
    forjd_tenant_id=UUID("00000000-0000-0000-0000-000000000001"),
  )

  with pytest.raises(ForjdTenantConfigurationError, match="invalid format"):
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


@pytest.mark.django_db
@override_settings(
  SECRET_KEY="test-secret-key-for-sealed-tokens"  # pragma: allowlist secret
)
def test_resolves_sealed_service_token() -> None:
  from monitor.models import ForjdServiceCredential

  from forjd.secrets import seal_service_token, sealed_ref

  account_id = uuid4()
  tenant_id = uuid4()
  credential_id = uuid4()
  ciphertext, encrypted_dek = seal_service_token(
    "fjsvc_abcd1234_sealed-secret"  # pragma: allowlist secret
  )
  ForjdServiceCredential.objects.create(
    id=credential_id,
    deml_account_id=account_id,
    forjd_tenant_id=tenant_id,
    ciphertext=ciphertext,
    encrypted_dek=encrypted_dek,
  )
  ForjdTenantMapping.objects.create(
    deml_account_id=account_id,
    forjd_tenant_id=tenant_id,
    service_token_secret_ref=sealed_ref(str(credential_id)),
  )

  credential = resolve_forjd_tenant_credential(account_id)
  assert credential.tenant_id == tenant_id
  assert credential.service_token == "fjsvc_abcd1234_sealed-secret"  # pragma: allowlist secret


@pytest.mark.django_db
@override_settings(SECRET_KEY="test-secret-key-for-sealed-tokens")  # pragma: allowlist secret
def test_rejects_sealed_credential_owned_by_another_account() -> None:
  from monitor.models import ForjdServiceCredential

  from forjd.secrets import seal_service_token, sealed_ref

  owner_account_id = uuid4()
  mapped_account_id = uuid4()
  tenant_id = uuid4()
  ciphertext, encrypted_dek = seal_service_token(
    "fjsvc_abcd1234_cross-account-secret"  # pragma: allowlist secret
  )
  credential = ForjdServiceCredential.objects.create(
    deml_account_id=owner_account_id,
    forjd_tenant_id=tenant_id,
    ciphertext=ciphertext,
    encrypted_dek=encrypted_dek,
  )
  ForjdTenantMapping.objects.create(
    deml_account_id=mapped_account_id,
    forjd_tenant_id=tenant_id,
    service_token_secret_ref=sealed_ref(str(credential.id)),
  )

  with pytest.raises(ForjdTenantConfigurationError, match="unavailable"):
    resolve_forjd_tenant_credential(mapped_account_id)


@pytest.mark.django_db
@override_settings(SECRET_KEY="test-secret-key-for-sealed-tokens")  # pragma: allowlist secret
def test_rejects_sealed_credential_owned_by_another_tenant() -> None:
  from monitor.models import ForjdServiceCredential

  from forjd.secrets import seal_service_token, sealed_ref

  account_id = uuid4()
  credential_tenant_id = uuid4()
  mapped_tenant_id = uuid4()
  ciphertext, encrypted_dek = seal_service_token(
    "fjsvc_abcd1234_cross-tenant-secret"  # pragma: allowlist secret
  )
  credential = ForjdServiceCredential.objects.create(
    deml_account_id=account_id,
    forjd_tenant_id=credential_tenant_id,
    ciphertext=ciphertext,
    encrypted_dek=encrypted_dek,
  )
  ForjdTenantMapping.objects.create(
    deml_account_id=account_id,
    forjd_tenant_id=mapped_tenant_id,
    service_token_secret_ref=sealed_ref(str(credential.id)),
  )

  with pytest.raises(ForjdTenantConfigurationError, match="unavailable"):
    resolve_forjd_tenant_credential(account_id)


@pytest.mark.django_db
def test_per_tenant_token_requires_matching_tenant_env() -> None:
  account_id = uuid4()
  tenant_id = uuid4()
  ForjdTenantMapping.objects.create(
    deml_account_id=account_id,
    forjd_tenant_id=tenant_id,
    service_token_secret_ref="env:FORJD_SERVICE_TOKEN_CUSTOMER_A",  # pragma: allowlist secret
  )

  with (
    patch.dict(
      "os.environ",
      {
        # Test-only placeholder credential shape — not a real secret.
        "FORJD_SERVICE_TOKEN_CUSTOMER_A": "fjsvc_a1b2c3d4_customer-a-secret",  # pragma: allowlist secret
        "FORJD_TENANT_ID_CUSTOMER_A": str(uuid4()),
      },
      clear=False,
    ),
    pytest.raises(ForjdTenantConfigurationError, match="does not match"),
  ):
    resolve_forjd_tenant_credential(account_id)
