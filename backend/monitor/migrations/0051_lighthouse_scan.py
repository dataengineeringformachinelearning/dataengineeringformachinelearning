import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0050_health_probe_observed_at_concurrent_index"),
  ]

  operations = [
    migrations.CreateModel(
      name="LighthouseScan",
      fields=[
        (
          "id",
          models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False),
        ),
        ("account_id", models.UUIDField()),
        ("is_platform", models.BooleanField(default=False)),
        ("url", models.URLField(max_length=2048)),
        ("scanned_at", models.DateTimeField()),
        ("performance", models.FloatField(default=0.0)),
        ("accessibility", models.FloatField(default=0.0)),
        ("best_practices", models.FloatField(default=0.0)),
        ("seo", models.FloatField(default=0.0)),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        ("updated_at", models.DateTimeField(auto_now=True)),
        (
          "status_page",
          models.ForeignKey(
            on_delete=django.db.models.deletion.CASCADE,
            related_name="lighthouse_scans",
            to="monitor.statuspage",
          ),
        ),
        (
          "user",
          models.ForeignKey(
            blank=True,
            null=True,
            on_delete=django.db.models.deletion.CASCADE,
            related_name="lighthouse_scans",
            to=settings.AUTH_USER_MODEL,
          ),
        ),
      ],
      options={
        "db_table": "lighthouse_scans",
        "ordering": ["-scanned_at"],
        "constraints": [
          models.UniqueConstraint(
            fields=("status_page", "url", "scanned_at"),
            name="unique_lighthouse_site_bucket",
          ),
          models.CheckConstraint(
            condition=models.Q(
              models.Q(("is_platform", True), ("user__isnull", True)),
              models.Q(("is_platform", False), ("user__isnull", False)),
              _connector="OR",
            ),
            name="lighthouse_scope_isolation",
          ),
        ],
        "indexes": [
          models.Index(
            fields=["account_id", "url", "-scanned_at"],
            name="lh_scan_account_site_time_idx",
          ),
          models.Index(
            fields=["user", "is_platform", "-scanned_at"],
            name="lh_scan_scope_time_idx",
          ),
          models.Index(fields=["scanned_at"], name="lh_scan_scanned_at_idx"),
        ],
      },
    ),
  ]
