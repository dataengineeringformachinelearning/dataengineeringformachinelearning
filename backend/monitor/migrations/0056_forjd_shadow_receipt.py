"""Metadata-only dual-write receipts for FORJD cutover comparison."""

import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0055_forjd_secret_ref_constraint"),
  ]

  operations = [
    migrations.CreateModel(
      name="ForjdShadowReceipt",
      fields=[
        (
          "id",
          models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False),
        ),
        ("deml_account_id", models.UUIDField(blank=True, db_index=True, null=True)),
        ("forjd_tenant_id", models.UUIDField(db_index=True)),
        ("client_event_id", models.CharField(max_length=128)),
        ("workflow_id", models.CharField(blank=True, default="", max_length=128)),
        ("content_type", models.CharField(blank=True, default="", max_length=128)),
        ("event_type", models.CharField(blank=True, default="", max_length=128)),
        ("ciphertext_sha256", models.CharField(blank=True, default="", max_length=64)),
        ("forjd_status", models.PositiveSmallIntegerField(blank=True, null=True)),
        ("forjd_ok", models.BooleanField(default=False)),
        ("request_id", models.CharField(blank=True, default="", max_length=64)),
        ("created_at", models.DateTimeField(auto_now_add=True)),
      ],
      options={"db_table": "forjd_shadow_receipts"},
    ),
    migrations.AddIndex(
      model_name="forjdshadowreceipt",
      index=models.Index(fields=["forjd_tenant_id", "-created_at"], name="forjd_shado_forjd_t_idx"),
    ),
    migrations.AddIndex(
      model_name="forjdshadowreceipt",
      index=models.Index(fields=["client_event_id"], name="forjd_shado_client__idx"),
    ),
  ]
