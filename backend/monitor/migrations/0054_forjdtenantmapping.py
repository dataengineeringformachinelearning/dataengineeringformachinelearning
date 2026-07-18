import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
  dependencies = [("monitor", "0053_retire_local_data_plane")]

  operations = [
    migrations.CreateModel(
      name="ForjdTenantMapping",
      fields=[
        (
          "id",
          models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False),
        ),
        ("deml_account_id", models.UUIDField(unique=True)),
        ("forjd_tenant_id", models.UUIDField(unique=True)),
        (
          "service_token_secret_ref",
          models.CharField(default="env:FORJD_SERVICE_TOKEN", max_length=255),
        ),
        ("is_active", models.BooleanField(default=True)),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        ("updated_at", models.DateTimeField(auto_now=True)),
      ],
      options={"db_table": "forjd_tenant_mappings"},
    )
  ]
