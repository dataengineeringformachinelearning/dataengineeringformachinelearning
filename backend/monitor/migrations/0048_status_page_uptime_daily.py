import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0047_webtechnologyobservation"),
  ]

  operations = [
    migrations.CreateModel(
      name="StatusPageUptimeDaily",
      fields=[
        (
          "id",
          models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False),
        ),
        ("is_platform", models.BooleanField(db_index=True, default=False)),
        ("report_date", models.DateField(db_index=True)),
        ("total_checks", models.BigIntegerField(default=0)),
        ("successful_checks", models.BigIntegerField(default=0)),
        ("uptime_percent", models.FloatField(default=100.0)),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        ("updated_at", models.DateTimeField(auto_now=True)),
        (
          "status_page",
          models.ForeignKey(
            on_delete=django.db.models.deletion.CASCADE,
            related_name="uptime_daily_rollups",
            to="monitor.statuspage",
          ),
        ),
        (
          "user",
          models.ForeignKey(
            blank=True,
            null=True,
            on_delete=django.db.models.deletion.CASCADE,
            related_name="status_page_uptime_daily",
            to=settings.AUTH_USER_MODEL,
          ),
        ),
      ],
      options={
        "db_table": "status_page_uptime_daily",
        "ordering": ["report_date"],
        "constraints": [
          models.UniqueConstraint(
            fields=("status_page", "report_date"), name="unique_status_page_uptime_day"
          ),
        ],
        "indexes": [
          models.Index(fields=["status_page", "report_date"], name="status_uptime_page_date_idx"),
          models.Index(
            fields=["user", "is_platform", "report_date"],
            name="status_uptime_scope_date_idx",
          ),
        ],
      },
    ),
  ]
