import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0039_auditlog_audit_logs_timesta_423be6_idx_and_more"),
    migrations.swappable_dependency(settings.AUTH_USER_MODEL),
  ]

  operations = [
    migrations.CreateModel(
      name="UserLifecycleJob",
      fields=[
        (
          "id",
          models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False),
        ),
        (
          "job_type",
          models.CharField(
            choices=[("deletion", "Deletion"), ("reconcile", "Reconcile")],
            default="deletion",
            max_length=32,
          ),
        ),
        (
          "state",
          models.CharField(
            choices=[
              ("pending", "Pending"),
              ("running", "Running"),
              ("completed", "Completed"),
              ("failed", "Failed"),
            ],
            default="pending",
            max_length=32,
          ),
        ),
        ("account_id", models.UUIDField()),
        ("firebase_uid", models.CharField(blank=True, default="", max_length=128)),
        ("user_email", models.CharField(blank=True, default="", max_length=255)),
        ("steps_completed", models.JSONField(blank=True, default=list)),
        ("last_error", models.TextField(blank=True, default="")),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        ("updated_at", models.DateTimeField(auto_now=True)),
        ("completed_at", models.DateTimeField(blank=True, null=True)),
        (
          "user",
          models.ForeignKey(
            blank=True,
            null=True,
            on_delete=django.db.models.deletion.SET_NULL,
            related_name="lifecycle_jobs",
            to=settings.AUTH_USER_MODEL,
          ),
        ),
      ],
      options={
        "db_table": "user_lifecycle_jobs",
        "indexes": [
          models.Index(
            fields=["job_type", "state", "created_at"],
            name="user_lifecy_job_typ_0a8f2d_idx",
          ),
          models.Index(fields=["account_id"], name="user_lifecy_account_6e2b41_idx"),
        ],
      },
    ),
  ]
