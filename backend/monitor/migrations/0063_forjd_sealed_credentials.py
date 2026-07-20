"""Sealed per-account FORJD credentials + widen secret_ref constraints.

Constraint swap is idempotent so environments that never received the older
``*_env_only`` checks (or partially applied an earlier revision) still migrate.
"""

from __future__ import annotations

import uuid

import django_migration_linter as linter
from django.db import migrations, models


def _swap_secret_ref_constraints(apps, schema_editor) -> None:
  """Idempotent constraint swap using static SQL only (no dynamic formatting)."""
  del apps  # state unused — pure SQL against physical tables
  # Fully static statements — table/constraint names are migration constants.
  drop_pg = (
    'ALTER TABLE "forjd_tenant_mappings" DROP CONSTRAINT IF EXISTS '
    '"forjd_tenant_mapping_secret_ref_env_only"',
    'ALTER TABLE "forjd_tenant_associations" DROP CONSTRAINT IF EXISTS '
    '"forjd_tenant_assoc_secret_ref_env_only"',
  )
  drop_other = (
    'ALTER TABLE "forjd_tenant_mappings" DROP CONSTRAINT '
    '"forjd_tenant_mapping_secret_ref_env_only"',
    'ALTER TABLE "forjd_tenant_associations" DROP CONSTRAINT '
    '"forjd_tenant_assoc_secret_ref_env_only"',
  )
  add_mapping = (
    'ALTER TABLE "forjd_tenant_mappings" ADD CONSTRAINT '
    '"forjd_tenant_mapping_secret_ref_safe" CHECK ('
    "(service_token_secret_ref LIKE 'env:FORJD\\_SERVICE\\_TOKEN%' ESCAPE '\\') "
    "OR (service_token_secret_ref LIKE 'sealed:%' ESCAPE '\\')"
    ")"
  )
  add_assoc = (
    'ALTER TABLE "forjd_tenant_associations" ADD CONSTRAINT '
    '"forjd_tenant_assoc_secret_ref_safe" CHECK ('
    "(service_token_secret_ref LIKE 'env:FORJD\\_SERVICE\\_TOKEN%' ESCAPE '\\') "
    "OR (service_token_secret_ref LIKE 'sealed:%' ESCAPE '\\')"
    ")"
  )
  add_specs = (
    ("forjd_tenant_mapping_secret_ref_safe", add_mapping),
    ("forjd_tenant_assoc_secret_ref_safe", add_assoc),
  )

  with schema_editor.connection.cursor() as cursor:
    vendor = schema_editor.connection.vendor
    if vendor == "postgresql":
      for sql in drop_pg:
        cursor.execute(sql)
      for name, sql in add_specs:
        cursor.execute("SELECT 1 FROM pg_constraint WHERE conname = %s", [name])
        if cursor.fetchone():
          continue
        cursor.execute(sql)
    else:
      for sql in drop_other:
        try:
          cursor.execute(sql)
        except Exception:
          pass
      for _name, sql in add_specs:
        try:
          cursor.execute(sql)
        except Exception:
          pass


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0062_userprofile_subscription_active_default_false"),
  ]

  operations = [
    linter.IgnoreMigration(),
    migrations.CreateModel(
      name="ForjdServiceCredential",
      fields=[
        (
          "id",
          models.UUIDField(
            default=uuid.uuid4,
            editable=False,
            primary_key=True,
            serialize=False,
          ),
        ),
        ("deml_account_id", models.UUIDField(db_index=True)),
        ("forjd_tenant_id", models.UUIDField(db_index=True)),
        ("ciphertext", models.TextField()),
        ("encrypted_dek", models.TextField()),
        ("is_active", models.BooleanField(default=True)),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        ("updated_at", models.DateTimeField(auto_now=True)),
      ],
      options={
        "db_table": "forjd_service_credentials",
      },
    ),
    migrations.AddIndex(
      model_name="forjdservicecredential",
      index=models.Index(
        fields=["deml_account_id", "-created_at"],
        name="forjd_svc_cred_acct_idx",
      ),
    ),
    migrations.SeparateDatabaseAndState(
      state_operations=[
        migrations.RemoveConstraint(
          model_name="forjdtenantmapping",
          name="forjd_tenant_mapping_secret_ref_env_only",
        ),
        migrations.RemoveConstraint(
          model_name="forjdtenantassociation",
          name="forjd_tenant_assoc_secret_ref_env_only",
        ),
        migrations.AddConstraint(
          model_name="forjdtenantmapping",
          constraint=models.CheckConstraint(
            condition=(
              models.Q(
                service_token_secret_ref__startswith="env:FORJD_SERVICE_TOKEN"  # pragma: allowlist secret
              )
              | models.Q(
                service_token_secret_ref__startswith="sealed:"  # pragma: allowlist secret
              )
            ),
            name="forjd_tenant_mapping_secret_ref_safe",
          ),
        ),
        migrations.AddConstraint(
          model_name="forjdtenantassociation",
          constraint=models.CheckConstraint(
            condition=(
              models.Q(
                service_token_secret_ref__startswith="env:FORJD_SERVICE_TOKEN"  # pragma: allowlist secret
              )
              | models.Q(
                service_token_secret_ref__startswith="sealed:"  # pragma: allowlist secret
              )
            ),
            name="forjd_tenant_assoc_secret_ref_safe",
          ),
        ),
      ],
      database_operations=[
        migrations.RunPython(_swap_secret_ref_constraints, migrations.RunPython.noop),
      ],
    ),
  ]
