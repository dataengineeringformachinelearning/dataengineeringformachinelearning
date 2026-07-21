"""Restore DEML-local analytics integrations (GA / Clarity / Cloudflare).

The FORJD cutover retired the old ``analytics_integrations`` model (0053) but
these third-party credentials are control-plane data and belong in DEML. The
retired physical table keeps its rollback window; this migration creates the
sealed replacement table ``analytics_provider_integrations``.
"""

from __future__ import annotations

import uuid

import django.db.models.deletion
import django_migration_linter as linter
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0063_forjd_sealed_credentials"),
    migrations.swappable_dependency(settings.AUTH_USER_MODEL),
  ]

  operations = [
    # New table — NOT NULL columns are safe (linter false positive on CreateModel).
    linter.IgnoreMigration(),
    migrations.CreateModel(
      name="AnalyticsIntegration",
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
        ("account_id", models.UUIDField(db_index=True)),
        (
          "provider",
          models.CharField(
            choices=[
              ("google", "Google Analytics"),
              ("microsoft", "Microsoft Clarity"),
              ("cloudflare", "Cloudflare Analytics"),
            ],
            max_length=32,
          ),
        ),
        ("credentials_ciphertext", models.TextField()),
        ("credentials_dek", models.TextField()),
        ("active", models.BooleanField(default=True)),
        ("last_sync", models.DateTimeField(blank=True, null=True)),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        ("updated_at", models.DateTimeField(auto_now=True)),
        (
          "user",
          models.ForeignKey(
            on_delete=django.db.models.deletion.CASCADE,
            related_name="analytics_integrations",
            to=settings.AUTH_USER_MODEL,
          ),
        ),
      ],
      options={
        "db_table": "analytics_provider_integrations",
      },
    ),
    migrations.AddConstraint(
      model_name="analyticsintegration",
      constraint=models.UniqueConstraint(
        fields=("account_id", "provider"), name="analytics_integration_uniq"
      ),
    ),
  ]
