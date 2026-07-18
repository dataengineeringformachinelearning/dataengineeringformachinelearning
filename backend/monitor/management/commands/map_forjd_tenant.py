from __future__ import annotations

from argparse import ArgumentParser
from uuid import UUID

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import IntegrityError
from forjd.tenancy import (
  DEFAULT_SERVICE_TOKEN_SECRET_REF,
  ForjdTenantConfigurationError,
  validate_service_token_secret_ref,
)

from monitor.models import ForjdTenantMapping, UserProfile


class Command(BaseCommand):
  help = "Bind one DEML account to one FORJD tenant using a service-token secret reference."

  def add_arguments(self, parser: ArgumentParser | CommandParser) -> None:
    parser.add_argument("deml_account_id", type=UUID)
    parser.add_argument("forjd_tenant_id", type=UUID)
    parser.add_argument(
      "--service-token-secret-ref",
      default=DEFAULT_SERVICE_TOKEN_SECRET_REF,
      help="Environment secret reference such as env:FORJD_SERVICE_TOKEN_CUSTOMER_A.",
    )

  def handle(self, *args: object, **options: object) -> None:
    deml_account_id = options["deml_account_id"]
    forjd_tenant_id = options["forjd_tenant_id"]
    if not isinstance(deml_account_id, UUID) or not isinstance(forjd_tenant_id, UUID):
      raise CommandError("Both tenant identifiers must be UUIDs")
    if not UserProfile.objects.filter(account_id=deml_account_id).exists():
      raise CommandError("DEML account does not exist")

    try:
      secret_ref = validate_service_token_secret_ref(str(options["service_token_secret_ref"]))
      mapping, created = ForjdTenantMapping.objects.update_or_create(
        deml_account_id=deml_account_id,
        defaults={
          "forjd_tenant_id": forjd_tenant_id,
          "service_token_secret_ref": secret_ref,
          "is_active": True,
        },
      )
    except ForjdTenantConfigurationError as exc:
      raise CommandError(str(exc)) from exc
    except IntegrityError as exc:
      raise CommandError("FORJD tenant is already mapped to another DEML account") from exc

    action = "Created" if created else "Updated"
    self.stdout.write(
      self.style.SUCCESS(
        f"{action} DEML account {mapping.deml_account_id} -> FORJD tenant {mapping.forjd_tenant_id}"
      )
    )
