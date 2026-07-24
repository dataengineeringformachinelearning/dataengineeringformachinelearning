from __future__ import annotations

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from monitor.models import ForjdServiceCredential

from forjd.provision import ForjdProvisionError, _persist_mapping, _provision_account_credential
from forjd.tenancy import resolve_forjd_snapshot_credential

User = get_user_model()


@pytest.mark.django_db
@override_settings(SECRET_KEY="test-provision-sealing-key")  # pragma: allowlist secret
def test_provision_is_idempotent_after_mapping_is_persisted() -> None:
  user = User.objects.create_user(username="provision-user")
  account_id = user.profile.account_id
  tenant_id = uuid4()
  partner_call = AsyncMock(
    return_value={
      "created": True,
      "reminted": False,
      "tenant": {"id": str(tenant_id)},
      "service_account": {
        "token": "fjsvc_abcdefgh_provision-secret"  # pragma: allowlist secret
      },
    }
  )

  with patch("forjd.provision._call_partner_provision", partner_call):
    first = _provision_account_credential(account_id, remint_if_exists=False)
    second = _provision_account_credential(account_id, remint_if_exists=False)

  assert first == second
  assert first.tenant_id == tenant_id
  partner_call.assert_awaited_once_with(
    external_ref=f"deml:{account_id}",
    remint_if_exists=False,
  )


@pytest.mark.django_db
def test_idempotent_response_without_token_requires_explicit_recovery() -> None:
  user = User.objects.create_user(username="existing-partner-user")
  account_id = user.profile.account_id
  partner_call = AsyncMock(
    return_value={
      "created": False,
      "reminted": False,
      "tenant": {"id": str(uuid4())},
      "service_account": {"token": None},
    }
  )

  with (
    patch("forjd.provision._call_partner_provision", partner_call),
    pytest.raises(ForjdProvisionError, match="explicit credential recovery"),
  ):
    _provision_account_credential(account_id, remint_if_exists=False)

  partner_call.assert_awaited_once_with(
    external_ref=f"deml:{account_id}",
    remint_if_exists=False,
  )


@pytest.mark.django_db
@override_settings(SECRET_KEY="test-provision-sealing-key")  # pragma: allowlist secret
def test_explicit_recovery_remints_an_existing_local_credential() -> None:
  user = User.objects.create_user(username="credential-recovery-user")
  account_id = user.profile.account_id
  tenant_id = uuid4()
  partner_call = AsyncMock(
    side_effect=[
      {
        "created": True,
        "reminted": False,
        "tenant": {"id": str(tenant_id)},
        "service_account": {
          "token": "fjsvc_abcdefgh_initial-secret"  # pragma: allowlist secret
        },
      },
      {
        "created": False,
        "reminted": True,
        "tenant": {"id": str(tenant_id)},
        "service_account": {
          "token": "fjsvc_abcdefgh_recovered-secret"  # pragma: allowlist secret
        },
      },
    ]
  )

  with patch("forjd.provision._call_partner_provision", partner_call):
    initial = _provision_account_credential(account_id, remint_if_exists=False)
    recovered = _provision_account_credential(account_id, remint_if_exists=True)

  assert initial.service_token == "fjsvc_abcdefgh_initial-secret"  # pragma: allowlist secret
  assert recovered.service_token == "fjsvc_abcdefgh_recovered-secret"  # pragma: allowlist secret
  assert partner_call.await_args_list[1].kwargs["remint_if_exists"] is True
  assert (
    ForjdServiceCredential.objects.filter(
      deml_account_id=account_id,
      forjd_tenant_id=tenant_id,
      is_active=True,
    ).count()
    == 1
  )


@pytest.mark.django_db
@override_settings(SECRET_KEY="test-provision-sealing-key")  # pragma: allowlist secret
def test_new_tenant_mapping_keeps_historical_tenant_credential_usable() -> None:
  user = User.objects.create_user(username="historical-tenant-user")
  account_id = user.profile.account_id
  historical_tenant_id = uuid4()
  current_tenant_id = uuid4()
  historical_mapping = _persist_mapping(
    account_id=account_id,
    tenant_id=historical_tenant_id,
    service_token="fjsvc_abcdefgh_historical-secret",  # pragma: allowlist secret
  )
  historical_ref = historical_mapping.service_token_secret_ref

  _persist_mapping(
    account_id=account_id,
    tenant_id=current_tenant_id,
    service_token="fjsvc_abcdefgh_current-secret",  # pragma: allowlist secret
  )

  historical = resolve_forjd_snapshot_credential(
    account_id,
    historical_tenant_id,
    historical_ref,
  )
  assert historical.service_token == "fjsvc_abcdefgh_historical-secret"  # pragma: allowlist secret
