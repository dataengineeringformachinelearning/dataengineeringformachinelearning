from __future__ import annotations

from argparse import ArgumentParser
from uuid import UUID

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import IntegrityError, transaction
from forjd.tenancy import (
  DEFAULT_SERVICE_TOKEN_SECRET_REF,
  ForjdTenantConfigurationError,
  validate_service_token_secret_ref,
)

from monitor.models import (
  ForjdTenantAssociation,
  ForjdTenantMapping,
  UserLifecycleJob,
  UserProfile,
)


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
    try:
      secret_ref = validate_service_token_secret_ref(str(options["service_token_secret_ref"]))
      with transaction.atomic():
        if not (
          UserProfile.objects.select_for_update().filter(account_id=deml_account_id).exists()
        ):
          raise CommandError("DEML account does not exist")
        if (
          UserLifecycleJob.objects.filter(
            account_id=deml_account_id,
            job_type=UserLifecycleJob.JobType.DELETION,
          )
          .exclude(state=UserLifecycleJob.State.COMPLETED)
          .exists()
        ):
          raise CommandError("DEML account deletion is in progress; remapping is blocked")

        mapping = (
          ForjdTenantMapping.objects.select_for_update()
          .filter(deml_account_id=deml_account_id)
          .first()
        )
        created = mapping is None
        if mapping is not None:
          ForjdTenantAssociation.objects.get_or_create(
            deml_account_id=mapping.deml_account_id,
            forjd_tenant_id=mapping.forjd_tenant_id,
            service_token_secret_ref=mapping.service_token_secret_ref,
          )
          if (
            mapping.forjd_tenant_id != forjd_tenant_id
            and mapping.service_token_secret_ref == secret_ref
          ):
            raise CommandError(
              "A remapped tenant requires a distinct service-token secret reference so "
              "historical erasure and outbox retries remain addressable"
            )
          mapping.forjd_tenant_id = forjd_tenant_id
          mapping.service_token_secret_ref = secret_ref
          mapping.is_active = True
          mapping.save()
        else:
          mapping = ForjdTenantMapping.objects.create(
            deml_account_id=deml_account_id,
            forjd_tenant_id=forjd_tenant_id,
            service_token_secret_ref=secret_ref,
            is_active=True,
          )

        ForjdTenantAssociation.objects.get_or_create(
          deml_account_id=deml_account_id,
          forjd_tenant_id=forjd_tenant_id,
          service_token_secret_ref=secret_ref,
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
