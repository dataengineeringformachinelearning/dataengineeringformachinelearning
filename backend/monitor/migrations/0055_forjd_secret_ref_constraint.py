"""Enforce FORJD secret refs are env:FORJD_SERVICE_TOKEN* (never plaintext)."""

import django_migration_linter as linter
from django.db import migrations, models


class Migration(migrations.Migration):
  # CheckConstraint is misreported as NOT NULL on SQLite lint; Postgres is fine.
  operations = [
    linter.IgnoreMigration(),
    migrations.AddConstraint(
      model_name="forjdtenantmapping",
      constraint=models.CheckConstraint(
        condition=models.Q(service_token_secret_ref__startswith="env:FORJD_SERVICE_TOKEN"),
        name="forjd_tenant_mapping_secret_ref_env_only",
      ),
    ),
  ]

  dependencies = [
    ("monitor", "0054_forjdtenantmapping"),
  ]
