# Squash Tenant → User + Sites; platform scope uses is_platform (no login).

import uuid

import django.db.models.deletion
import django_migration_linter as linter
from django.conf import settings
from django.db import migrations, models


def _tenant_owner_map(TenantMembership):
  return {
    m.tenant_id: m.user_id
    for m in TenantMembership.objects.filter(role="Owner").only("tenant_id", "user_id")
  }


def squash_tenant_data(apps, schema_editor):
  Tenant = apps.get_model("monitor", "Tenant")
  TenantMembership = apps.get_model("monitor", "TenantMembership")
  UserProfile = apps.get_model("monitor", "UserProfile")
  StatusPage = apps.get_model("monitor", "StatusPage")

  owners = _tenant_owner_map(TenantMembership)
  platform = Tenant.objects.filter(is_platform_tenant=True).first()
  platform_id = platform.id if platform else None

  for tenant in Tenant.objects.exclude(is_platform_tenant=True):
    user_id = owners.get(tenant.id)
    if not user_id:
      sp = StatusPage.objects.filter(tenant_id=tenant.id).first()
      user_id = sp.user_id if sp else None
    if not user_id:
      continue
    profile, _ = UserProfile.objects.get_or_create(user_id=user_id)
    profile.account_id = tenant.id
    profile.tier = tenant.tier
    profile.stripe_customer_id = tenant.stripe_customer_id or ""
    profile.stripe_subscription_id = tenant.stripe_subscription_id or ""
    profile.subscription_active = tenant.subscription_active
    profile.subscription_current_period_end = tenant.subscription_current_period_end
    profile.save()

  for profile in UserProfile.objects.filter(account_id__isnull=True):
    profile.account_id = uuid.uuid4()
    profile.save(update_fields=["account_id"])

  with_platform = [
    "Endpoints",
    "AggregatedAnalytics",
    "ThreatIntelligence",
    "CookieConsent",
    "Asset",
  ]
  user_only = [
    "Incident",
    "BugReport",
    "Vulnerability",
    "ValidatedSite",
    "IncidentCase",
    "Playbook",
  ]

  for model_name in with_platform:
    Model = apps.get_model("monitor", model_name)
    if platform_id:
      Model.objects.filter(tenant_id=platform_id).update(user_id=None, is_platform=True)
    for tenant_id, user_id in owners.items():
      if tenant_id == platform_id:
        continue
      Model.objects.filter(tenant_id=tenant_id).update(user_id=user_id, is_platform=False)

  for model_name in user_only:
    Model = apps.get_model("monitor", model_name)
    if platform_id:
      Model.objects.filter(tenant_id=platform_id).update(user_id=None)
    for tenant_id, user_id in owners.items():
      if tenant_id == platform_id:
        continue
      Model.objects.filter(tenant_id=tenant_id).update(user_id=user_id)

  StatusPage.objects.filter(slug="platform-status").update(user_id=None, is_platform=True)
  if platform_id:
    StatusPage.objects.filter(tenant_id=platform_id).update(user_id=None, is_platform=True)
    for tenant_id, user_id in owners.items():
      if tenant_id != platform_id:
        StatusPage.objects.filter(tenant_id=tenant_id).update(user_id=user_id, is_platform=False)


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0032_outboxevent"),
    migrations.swappable_dependency(settings.AUTH_USER_MODEL),
  ]

  operations = [
    linter.IgnoreMigration(),
    migrations.AddField(
      model_name="userprofile",
      name="account_id",
      field=models.UUIDField(default=uuid.uuid4, editable=False, null=True),
    ),
    migrations.AddField(
      model_name="userprofile",
      name="tier",
      field=models.CharField(
        choices=[("Standard", "Standard"), ("Pro", "Pro")],
        default="Standard",
        max_length=50,
      ),
    ),
    migrations.AddField(
      model_name="userprofile",
      name="stripe_customer_id",
      field=models.CharField(blank=True, max_length=255, null=True),
    ),
    migrations.AddField(
      model_name="userprofile",
      name="stripe_subscription_id",
      field=models.CharField(blank=True, max_length=255, null=True),
    ),
    migrations.AddField(
      model_name="userprofile",
      name="subscription_active",
      field=models.BooleanField(default=True),
    ),
    migrations.AddField(
      model_name="userprofile",
      name="subscription_current_period_end",
      field=models.DateTimeField(blank=True, null=True),
    ),
    migrations.AddField(
      model_name="statuspage",
      name="is_platform",
      field=models.BooleanField(default=False),
    ),
    migrations.AddField(
      model_name="endpoints",
      name="is_platform",
      field=models.BooleanField(db_index=True, default=False),
    ),
    migrations.AddField(
      model_name="endpoints",
      name="user",
      field=models.ForeignKey(
        blank=True,
        null=True,
        on_delete=django.db.models.deletion.CASCADE,
        related_name="endpoints",
        to=settings.AUTH_USER_MODEL,
      ),
    ),
    migrations.AddField(
      model_name="aggregatedanalytics",
      name="is_platform",
      field=models.BooleanField(db_index=True, default=False),
    ),
    migrations.AddField(
      model_name="aggregatedanalytics",
      name="user",
      field=models.ForeignKey(
        blank=True,
        null=True,
        on_delete=django.db.models.deletion.CASCADE,
        related_name="aggregated_analytics",
        to=settings.AUTH_USER_MODEL,
      ),
    ),
    migrations.AddField(
      model_name="threatintelligence",
      name="is_platform",
      field=models.BooleanField(default=False),
    ),
    migrations.AddField(
      model_name="cookieconsent",
      name="is_platform",
      field=models.BooleanField(default=False),
    ),
    migrations.AddField(
      model_name="cookieconsent",
      name="user",
      field=models.ForeignKey(
        blank=True,
        null=True,
        on_delete=django.db.models.deletion.CASCADE,
        related_name="cookie_consents",
        to=settings.AUTH_USER_MODEL,
      ),
    ),
    migrations.AddField(
      model_name="asset",
      name="is_platform",
      field=models.BooleanField(default=False),
    ),
    migrations.AddField(
      model_name="asset",
      name="user",
      field=models.ForeignKey(
        blank=True,
        null=True,
        on_delete=django.db.models.deletion.CASCADE,
        related_name="assets",
        to=settings.AUTH_USER_MODEL,
      ),
    ),
    migrations.AddField(
      model_name="incident",
      name="user",
      field=models.ForeignKey(
        blank=True,
        null=True,
        on_delete=django.db.models.deletion.CASCADE,
        related_name="incidents",
        to=settings.AUTH_USER_MODEL,
      ),
    ),
    migrations.AddField(
      model_name="bugreport",
      name="user",
      field=models.ForeignKey(
        blank=True,
        null=True,
        on_delete=django.db.models.deletion.CASCADE,
        related_name="bug_reports",
        to=settings.AUTH_USER_MODEL,
      ),
    ),
    migrations.AddField(
      model_name="vulnerability",
      name="user",
      field=models.ForeignKey(
        blank=True,
        null=True,
        on_delete=django.db.models.deletion.CASCADE,
        related_name="vulnerabilities",
        to=settings.AUTH_USER_MODEL,
      ),
    ),
    migrations.AddField(
      model_name="validatedsite",
      name="user",
      field=models.ForeignKey(
        blank=True,
        null=True,
        on_delete=django.db.models.deletion.CASCADE,
        related_name="validated_sites",
        to=settings.AUTH_USER_MODEL,
      ),
    ),
    migrations.AddField(
      model_name="incidentcase",
      name="user",
      field=models.ForeignKey(
        blank=True,
        null=True,
        on_delete=django.db.models.deletion.CASCADE,
        related_name="incident_cases",
        to=settings.AUTH_USER_MODEL,
      ),
    ),
    migrations.AddField(
      model_name="playbook",
      name="user",
      field=models.ForeignKey(
        blank=True,
        null=True,
        on_delete=django.db.models.deletion.CASCADE,
        related_name="playbooks",
        to=settings.AUTH_USER_MODEL,
      ),
    ),
    migrations.AlterField(
      model_name="statuspage",
      name="user",
      field=models.ForeignKey(
        blank=True,
        null=True,
        on_delete=django.db.models.deletion.CASCADE,
        related_name="status_pages",
        to=settings.AUTH_USER_MODEL,
      ),
    ),
    migrations.RunPython(squash_tenant_data, migrations.RunPython.noop),
    migrations.AlterField(
      model_name="userprofile",
      name="account_id",
      field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
    ),
    migrations.SeparateDatabaseAndState(
      database_operations=[],
      state_operations=[
        migrations.AlterUniqueTogether(
          name="aggregatedanalytics",
          unique_together=set(),
        ),
      ],
    ),
    migrations.SeparateDatabaseAndState(
      database_operations=[],
      state_operations=[
        migrations.AlterUniqueTogether(
          name="validatedsite",
          unique_together={("user", "domain")},
        ),
      ],
    ),
    migrations.RemoveField(model_name="endpoints", name="tenant"),
    migrations.RemoveField(model_name="aggregatedanalytics", name="tenant"),
    migrations.RemoveField(model_name="threatintelligence", name="tenant"),
    migrations.RemoveField(model_name="cookieconsent", name="tenant"),
    migrations.RemoveField(model_name="asset", name="tenant"),
    migrations.RemoveField(model_name="incident", name="tenant"),
    migrations.RemoveField(model_name="bugreport", name="tenant"),
    migrations.RemoveField(model_name="vulnerability", name="tenant"),
    migrations.RemoveField(model_name="validatedsite", name="tenant"),
    migrations.RemoveField(model_name="incidentcase", name="tenant"),
    migrations.RemoveField(model_name="playbook", name="tenant"),
    migrations.RemoveField(model_name="statuspage", name="tenant"),
    migrations.AddConstraint(
      model_name="aggregatedanalytics",
      constraint=models.UniqueConstraint(
        condition=models.Q(is_platform=False),
        fields=("user", "timestamp", "bucket_size"),
        name="unique_user_analytics_bucket",
      ),
    ),
    migrations.AddConstraint(
      model_name="aggregatedanalytics",
      constraint=models.UniqueConstraint(
        condition=models.Q(is_platform=True),
        fields=("timestamp", "bucket_size"),
        name="unique_platform_analytics_bucket",
      ),
    ),
  ]
