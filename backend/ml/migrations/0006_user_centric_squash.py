import django.db.models.deletion
import django_migration_linter as linter
from django.conf import settings
from django.db import migrations, models


def squash_ml_tenant_data(apps, schema_editor):
  Tenant = apps.get_model("monitor", "Tenant")
  TenantMembership = apps.get_model("monitor", "TenantMembership")
  TrainingRun = apps.get_model("ml", "TrainingRun")
  ThreatReport = apps.get_model("ml", "ThreatReport")

  owners = {
    m.tenant_id: m.user_id
    for m in TenantMembership.objects.filter(role="Owner").only("tenant_id", "user_id")
  }
  platform = Tenant.objects.filter(is_platform_tenant=True).first()
  platform_id = platform.id if platform else None

  if platform_id:
    TrainingRun.objects.filter(tenant_id=platform_id).update(user_id=None, is_platform=True)
    ThreatReport.objects.filter(tenant_id=platform_id).update(user_id=None, is_platform=True)
  for tenant_id, user_id in owners.items():
    if tenant_id == platform_id:
      continue
    TrainingRun.objects.filter(tenant_id=tenant_id).update(user_id=user_id, is_platform=False)
    ThreatReport.objects.filter(tenant_id=tenant_id).update(user_id=user_id, is_platform=False)


class Migration(migrations.Migration):
  dependencies = [
    ("ml", "0005_threatreport_threat_repo_created_04515e_idx_and_more"),
    ("monitor", "0033_user_centric_squash"),
    migrations.swappable_dependency(settings.AUTH_USER_MODEL),
  ]

  operations = [
    linter.IgnoreMigration(),
    migrations.AddField(
      model_name="trainingrun",
      name="is_platform",
      field=models.BooleanField(default=False),
    ),
    migrations.AddField(
      model_name="trainingrun",
      name="user",
      field=models.ForeignKey(
        blank=True,
        null=True,
        on_delete=django.db.models.deletion.CASCADE,
        related_name="training_runs",
        to=settings.AUTH_USER_MODEL,
      ),
    ),
    migrations.AddField(
      model_name="threatreport",
      name="is_platform",
      field=models.BooleanField(default=False),
    ),
    migrations.AddField(
      model_name="threatreport",
      name="user",
      field=models.ForeignKey(
        blank=True,
        null=True,
        on_delete=django.db.models.deletion.CASCADE,
        related_name="threat_reports",
        to=settings.AUTH_USER_MODEL,
      ),
    ),
    migrations.RunPython(squash_ml_tenant_data, migrations.RunPython.noop),
    migrations.RemoveField(model_name="trainingrun", name="tenant"),
    migrations.RemoveField(model_name="threatreport", name="tenant"),
  ]
