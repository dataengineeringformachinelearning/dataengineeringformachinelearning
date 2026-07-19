from __future__ import annotations

import hashlib
import hmac
import uuid
from datetime import timedelta

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.utils import timezone


def _pseudonym(account_id: object) -> str:
  digest = hmac.new(
    settings.SECRET_KEY.encode(),
    str(account_id).encode(),
    hashlib.sha256,
  ).hexdigest()[:24]
  return f"acct:{digest}"


def backfill_destination_history(apps, schema_editor) -> None:
  database = schema_editor.connection.alias
  mapping_model = apps.get_model("monitor", "ForjdTenantMapping")
  association_model = apps.get_model("monitor", "ForjdTenantAssociation")
  report_model = apps.get_model("monitor", "BugReport")
  profile_model = apps.get_model("monitor", "UserProfile")
  lifecycle_model = apps.get_model("monitor", "UserLifecycleJob")

  mappings = list(mapping_model.objects.using(database).all())
  mappings_by_account = {mapping.deml_account_id: mapping for mapping in mappings}
  for mapping in mappings:
    association_model.objects.using(database).get_or_create(
      deml_account_id=mapping.deml_account_id,
      forjd_tenant_id=mapping.forjd_tenant_id,
      service_token_secret_ref=mapping.service_token_secret_ref,
    )

  account_by_user = dict(profile_model.objects.using(database).values_list("user_id", "account_id"))
  pending_reports = []
  for report in report_model.objects.using(database).filter(account_id__isnull=True).iterator(500):
    account_id = account_by_user.get(report.user_id)
    if account_id is None:
      continue
    mapping = mappings_by_account.get(account_id)
    report.account_id = account_id
    report.submitted_by_pseudonym = _pseudonym(account_id)
    if mapping is not None:
      report.forjd_tenant_id = mapping.forjd_tenant_id
      report.forjd_service_token_secret_ref = mapping.service_token_secret_ref
    pending_reports.append(report)
    if len(pending_reports) >= 500:
      report_model.objects.using(database).bulk_update(
        pending_reports,
        [
          "account_id",
          "forjd_tenant_id",
          "forjd_service_token_secret_ref",
          "submitted_by_pseudonym",
        ],
      )
      pending_reports.clear()
  if pending_reports:
    report_model.objects.using(database).bulk_update(
      pending_reports,
      [
        "account_id",
        "forjd_tenant_id",
        "forjd_service_token_secret_ref",
        "submitted_by_pseudonym",
      ],
    )

  now = timezone.now()
  associations_by_account: dict[object, dict[str, str]] = {}
  for association in association_model.objects.using(database).order_by("mapped_at"):
    associations_by_account.setdefault(association.deml_account_id, {})[
      str(association.forjd_tenant_id)
    ] = association.service_token_secret_ref

  lifecycle_updates = []
  for job in lifecycle_model.objects.using(database).all().iterator(500):
    targets = [
      {"tenant_id": tenant_id, "service_token_secret_ref": secret_ref}
      for tenant_id, secret_ref in sorted(associations_by_account.get(job.account_id, {}).items())
    ]
    job.forjd_erase_targets = targets
    if job.state in {"pending", "failed"}:
      job.next_attempt_at = now
    elif job.state == "running":
      job.lease_expires_at = job.updated_at + timedelta(minutes=10)
    elif job.state == "completed":
      job.firebase_uid = ""
      job.user_email = ""
    lifecycle_updates.append(job)
    if len(lifecycle_updates) >= 500:
      lifecycle_model.objects.using(database).bulk_update(
        lifecycle_updates,
        [
          "forjd_erase_targets",
          "next_attempt_at",
          "lease_expires_at",
          "firebase_uid",
          "user_email",
        ],
      )
      lifecycle_updates.clear()
  if lifecycle_updates:
    lifecycle_model.objects.using(database).bulk_update(
      lifecycle_updates,
      [
        "forjd_erase_targets",
        "next_attempt_at",
        "lease_expires_at",
        "firebase_uid",
        "user_email",
      ],
    )


def deduplicate_active_lifecycle_jobs(apps, schema_editor) -> None:
  database = schema_editor.connection.alias
  lifecycle_model = apps.get_model("monitor", "UserLifecycleJob")
  active_states = ["pending", "running", "failed", "dead_letter"]
  duplicate_groups = (
    lifecycle_model.objects.using(database)
    .filter(state__in=active_states)
    .values("account_id", "job_type")
    .annotate(job_count=models.Count("id"))
    .filter(job_count__gt=1)
  )
  for group in duplicate_groups.iterator(500):
    jobs = list(
      lifecycle_model.objects.using(database)
      .filter(
        account_id=group["account_id"],
        job_type=group["job_type"],
        state__in=active_states,
      )
      .order_by("created_at", "id")
    )
    canonical, *duplicates = jobs
    targets: dict[str, str] = {}
    erased: set[str] = set()
    steps: list[str] = []
    for job in jobs:
      for target in job.forjd_erase_targets or []:
        if not isinstance(target, dict) or not target.get("tenant_id"):
          continue
        targets[str(target["tenant_id"])] = str(target.get("service_token_secret_ref") or "")
      erased.update(str(value) for value in (job.forjd_erased_tenant_ids or []))
      for step in job.steps_completed or []:
        if isinstance(step, str) and step not in steps:
          steps.append(step)

    canonical.forjd_erase_targets = [
      {"tenant_id": tenant_id, "service_token_secret_ref": secret_ref}
      for tenant_id, secret_ref in sorted(targets.items())
    ]
    canonical.forjd_erased_tenant_ids = sorted(erased)
    canonical.steps_completed = steps
    canonical.attempts = max(int(job.attempts) for job in jobs)
    canonical.max_attempts = max(int(job.max_attempts) for job in jobs)
    canonical.user_id = canonical.user_id or next(
      (job.user_id for job in jobs if job.user_id is not None),
      None,
    )
    canonical.firebase_uid = canonical.firebase_uid or next(
      (job.firebase_uid for job in jobs if job.firebase_uid),
      "",
    )
    canonical.user_email = canonical.user_email or next(
      (job.user_email for job in jobs if job.user_email),
      "",
    )
    all_dead_lettered = all(job.state == "dead_letter" for job in jobs)
    canonical.state = "dead_letter" if all_dead_lettered else "failed"
    canonical.next_attempt_at = None if all_dead_lettered else timezone.now()
    canonical.failure_code = "MigrationDeduplicated"
    canonical.last_error = "Duplicate lifecycle receipts were merged during migration"
    canonical.completed_at = None
    canonical.lease_token = None
    canonical.lease_expires_at = None
    lifecycle_model.objects.using(database).filter(pk__in=[job.pk for job in duplicates]).delete()
    canonical.save(
      update_fields=[
        "forjd_erase_targets",
        "forjd_erased_tenant_ids",
        "steps_completed",
        "attempts",
        "max_attempts",
        "user",
        "firebase_uid",
        "user_email",
        "state",
        "next_attempt_at",
        "failure_code",
        "last_error",
        "completed_at",
        "lease_token",
        "lease_expires_at",
        "updated_at",
      ]
    )


class Migration(migrations.Migration):
  dependencies = [
    migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ("monitor", "0059_headless_rate_limit_bucket"),
  ]

  operations = [
    migrations.CreateModel(
      name="ForjdTenantAssociation",
      fields=[
        (
          "id",
          models.UUIDField(
            default=uuid.uuid4,
            primary_key=True,
            serialize=False,
            editable=False,
          ),
        ),
        ("deml_account_id", models.UUIDField(db_index=True)),
        ("forjd_tenant_id", models.UUIDField(db_index=True)),
        ("service_token_secret_ref", models.CharField(max_length=255)),
        ("mapped_at", models.DateTimeField(auto_now_add=True)),
      ],
      options={"db_table": "forjd_tenant_associations"},
    ),
    migrations.AddConstraint(
      model_name="forjdtenantassociation",
      constraint=models.UniqueConstraint(
        fields=("deml_account_id", "forjd_tenant_id", "service_token_secret_ref"),
        name="forjd_tenant_assoc_identity_uniq",
      ),
    ),
    migrations.AddConstraint(
      model_name="forjdtenantassociation",
      constraint=models.CheckConstraint(
        condition=models.Q(service_token_secret_ref__startswith="env:FORJD_SERVICE_TOKEN"),
        name="forjd_tenant_assoc_secret_ref_env_only",
      ),
    ),
    migrations.AlterField(
      model_name="bugreport",
      name="user",
      field=models.ForeignKey(
        blank=True,
        null=True,
        on_delete=django.db.models.deletion.SET_NULL,
        related_name="bug_reports",
        to=settings.AUTH_USER_MODEL,
      ),
    ),
    migrations.AddField(
      model_name="bugreport",
      name="account_id",
      field=models.UUIDField(blank=True, db_index=True, null=True),
    ),
    migrations.AddField(
      model_name="bugreport",
      name="forjd_tenant_id",
      field=models.UUIDField(blank=True, db_index=True, null=True),
    ),
    migrations.AddField(
      model_name="bugreport",
      name="forjd_service_token_secret_ref",
      field=models.CharField(blank=True, default="", max_length=255),
    ),
    migrations.AddField(
      model_name="bugreport",
      name="submitted_by_pseudonym",
      field=models.CharField(blank=True, default="", max_length=64),
    ),
    migrations.AlterField(
      model_name="userlifecyclejob",
      name="state",
      field=models.CharField(
        choices=[
          ("pending", "Pending"),
          ("running", "Running"),
          ("completed", "Completed"),
          ("failed", "Failed"),
          ("dead_letter", "Dead letter"),
        ],
        default="pending",
        max_length=32,
      ),
    ),
    migrations.AddField(
      model_name="userlifecyclejob",
      name="attempts",
      field=models.PositiveIntegerField(default=0),
    ),
    migrations.AddField(
      model_name="userlifecyclejob",
      name="failure_code",
      field=models.CharField(blank=True, default="", max_length=128),
    ),
    migrations.AddField(
      model_name="userlifecyclejob",
      name="forjd_erase_targets",
      field=models.JSONField(blank=True, default=list),
    ),
    migrations.AddField(
      model_name="userlifecyclejob",
      name="forjd_erased_tenant_ids",
      field=models.JSONField(blank=True, default=list),
    ),
    migrations.AddField(
      model_name="userlifecyclejob",
      name="lease_expires_at",
      field=models.DateTimeField(blank=True, db_index=True, null=True),
    ),
    migrations.AddField(
      model_name="userlifecyclejob",
      name="lease_token",
      field=models.UUIDField(blank=True, editable=False, null=True),
    ),
    migrations.AddField(
      model_name="userlifecyclejob",
      name="max_attempts",
      field=models.PositiveIntegerField(default=12),
    ),
    migrations.AddField(
      model_name="userlifecyclejob",
      name="next_attempt_at",
      field=models.DateTimeField(blank=True, db_index=True, null=True),
    ),
    migrations.RunPython(backfill_destination_history, migrations.RunPython.noop),
    migrations.RunPython(deduplicate_active_lifecycle_jobs, migrations.RunPython.noop),
    migrations.AddConstraint(
      model_name="userlifecyclejob",
      constraint=models.UniqueConstraint(
        condition=models.Q(state__in=["pending", "running", "failed", "dead_letter"]),
        fields=("account_id", "job_type"),
        name="user_lifecycle_active_job_uniq",
      ),
    ),
  ]
