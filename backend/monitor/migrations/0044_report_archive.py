# Generated migration for ReportArchive model

from __future__ import annotations

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0043_export_job"),
    migrations.swappable_dependency(settings.AUTH_USER_MODEL),
  ]

  operations = [
    migrations.CreateModel(
      name="ReportArchive",
      fields=[
        (
          "id",
          models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False),
        ),
        ("is_platform", models.BooleanField(db_index=True, default=False)),
        ("report_date", models.DateField(db_index=True)),
        ("period_start", models.DateTimeField()),
        ("period_end", models.DateTimeField()),
        ("total_requests", models.BigIntegerField(default=0)),
        ("avg_latency_ms", models.FloatField(default=0.0)),
        ("p99_latency_ms", models.FloatField(default=0.0)),
        ("error_rate_percent", models.FloatField(default=0.0)),
        ("threats_detected", models.IntegerField(default=0)),
        ("active_incidents", models.IntegerField(default=0)),
        ("unique_visitors", models.IntegerField(default=0)),
        ("total_vulnerabilities", models.IntegerField(default=0)),
        ("summary_json", models.JSONField(blank=True, default=dict)),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        (
          "user",
          models.ForeignKey(
            blank=True,
            null=True,
            on_delete=django.db.models.deletion.CASCADE,
            related_name="report_archives",
            to=settings.AUTH_USER_MODEL,
          ),
        ),
      ],
      options={
        "db_table": "report_archives",
        "ordering": ["-report_date"],
      },
    ),
    migrations.AddConstraint(
      model_name="reportarchive",
      constraint=models.UniqueConstraint(
        condition=models.Q(("is_platform", False)),
        fields=["user", "report_date"],
        name="unique_user_daily_report",
      ),
    ),
    migrations.AddConstraint(
      model_name="reportarchive",
      constraint=models.UniqueConstraint(
        condition=models.Q(("is_platform", True)),
        fields=["report_date"],
        name="unique_platform_daily_report",
      ),
    ),
    migrations.AddIndex(
      model_name="reportarchive",
      index=models.Index(fields=["user", "report_date"], name="report_archives_user_date_idx"),
    ),
    migrations.AddIndex(
      model_name="reportarchive",
      index=models.Index(
        fields=["is_platform", "report_date"], name="report_archives_platform_date_idx"
      ),
    ),
  ]
