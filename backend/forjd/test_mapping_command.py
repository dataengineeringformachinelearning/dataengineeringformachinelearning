from __future__ import annotations

from io import StringIO
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from monitor.models import ForjdTenantMapping

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

  with pytest.raises(CommandError, match="must name"):
    call_command(
      "map_forjd_tenant",
      str(user.profile.account_id),
      str(uuid4()),
      service_token_secret_ref="fjsvc_plaintext_secret",  # pragma: allowlist secret
    )
