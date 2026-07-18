"""Enforce FORJD secret refs are env:FORJD_SERVICE_TOKEN* (never plaintext)."""

from django.db import migrations, models


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0054_forjdtenantmapping"),
  ]

  operations = [
    migrations.AddConstraint(
      model_name="forjdtenantmapping",
      constraint=models.CheckConstraint(
        condition=models.Q(service_token_secret_ref__startswith="env:FORJD_SERVICE_TOKEN"),
        name="forjd_tenant_mapping_secret_ref_env_only",
      ),
    ),
  ]
