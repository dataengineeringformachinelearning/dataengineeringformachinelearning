from __future__ import annotations

from io import StringIO
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from monitor.models import ForjdTenantAssociation, ForjdTenantMapping, UserLifecycleJob

User = get_user_model()


@pytest.mark.django_db
def test_map_forjd_tenant_stores_only_a_secret_reference() -> None:
  user = User.objects.create_user(username="mapping-operator-test")
  forjd_tenant_id = uuid4()
  stdout = StringIO()

  call_command(
    "map_forjd_tenant",
    str(user.profile.account_id),
    str(forjd_tenant_id),
    service_token_secret_ref="env:FORJD_SERVICE_TOKEN_CUSTOMER_A",  # pragma: allowlist secret
    stdout=stdout,
  )

  mapping = ForjdTenantMapping.objects.get(deml_account_id=user.profile.account_id)
  expected_secret_ref = "env:FORJD_SERVICE_TOKEN_CUSTOMER_A"  # pragma: allowlist secret
  assert mapping.forjd_tenant_id == forjd_tenant_id
  assert mapping.service_token_secret_ref == expected_secret_ref
  assert mapping.is_active is True
  assert "fjsvc_" not in mapping.service_token_secret_ref


@pytest.mark.django_db
def test_map_forjd_tenant_rejects_a_plaintext_token() -> None:
  user = User.objects.create_user(username="mapping-secret-test")

  with pytest.raises(CommandError, match="must be env:FORJD_SERVICE_TOKEN"):
    call_command(
      "map_forjd_tenant",
      str(user.profile.account_id),
      str(uuid4()),
      service_token_secret_ref="fjsvc_plaintext_secret",  # pragma: allowlist secret
    )


@pytest.mark.django_db
def test_remap_retains_immutable_tenant_history() -> None:
  user = User.objects.create_user(username="mapping-history-test")
  account_id = user.profile.account_id
  old_tenant = uuid4()
  new_tenant = uuid4()

  call_command(
    "map_forjd_tenant",
    str(account_id),
    str(old_tenant),
    service_token_secret_ref="env:FORJD_SERVICE_TOKEN_CUSTOMER_A",  # pragma: allowlist secret
  )
  call_command(
    "map_forjd_tenant",
    str(account_id),
    str(new_tenant),
    service_token_secret_ref="env:FORJD_SERVICE_TOKEN_CUSTOMER_B",  # pragma: allowlist secret
  )

  mapping = ForjdTenantMapping.objects.get(deml_account_id=account_id)
  assert mapping.forjd_tenant_id == new_tenant
  assert set(
    ForjdTenantAssociation.objects.filter(deml_account_id=account_id).values_list(
      "forjd_tenant_id", flat=True
    )
  ) == {old_tenant, new_tenant}


@pytest.mark.django_db
def test_remap_requires_a_distinct_historical_secret_reference() -> None:
  user = User.objects.create_user(username="mapping-ref-stability-test")
  account_id = user.profile.account_id
  call_command(
    "map_forjd_tenant",
    str(account_id),
    str(uuid4()),
    service_token_secret_ref="env:FORJD_SERVICE_TOKEN_CUSTOMER_A",  # pragma: allowlist secret
  )

  with pytest.raises(CommandError, match="distinct service-token secret reference"):
    call_command(
      "map_forjd_tenant",
      str(account_id),
      str(uuid4()),
      service_token_secret_ref="env:FORJD_SERVICE_TOKEN_CUSTOMER_A",  # pragma: allowlist secret
    )


@pytest.mark.django_db
def test_mapping_is_blocked_after_deletion_tombstone() -> None:
  user = User.objects.create_user(username="mapping-delete-barrier")
  UserLifecycleJob.objects.create(
    user=user,
    account_id=user.profile.account_id,
    state=UserLifecycleJob.State.FAILED,
  )

  with pytest.raises(CommandError, match="deletion is in progress"):
    call_command(
      "map_forjd_tenant",
      str(user.profile.account_id),
      str(uuid4()),
      service_token_secret_ref="env:FORJD_SERVICE_TOKEN_CUSTOMER_A",  # pragma: allowlist secret
    )
