import uuid

from django.db import migrations


def create_tenant_0(apps, schema_editor):
  Tenant = apps.get_model("monitor", "Tenant")
  User = apps.get_model("auth", "User")
  TenantMembership = apps.get_model("monitor", "TenantMembership")
  StatusPage = apps.get_model("monitor", "StatusPage")
  Endpoints = apps.get_model("monitor", "Endpoints")
  Incident = apps.get_model("monitor", "Incident")
  BugReport = apps.get_model("monitor", "BugReport")
  CookieConsent = apps.get_model("monitor", "CookieConsent")
  Vulnerability = apps.get_model("monitor", "Vulnerability")
  ThreatIntelligence = apps.get_model("monitor", "ThreatIntelligence")
  AggregatedAnalytics = apps.get_model("monitor", "AggregatedAnalytics")

  # Create Tenant 0
  tenant_0, _ = Tenant.objects.get_or_create(
    is_platform_tenant=True,
    defaults={
      "id": uuid.uuid4(),
      "name": "Platform",
      "slug": "platform",
      "target_url": "https://dataengineeringformachinelearning.com",
    },
  )

  # Add all existing users to Tenant 0
  for user in User.objects.all():
    TenantMembership.objects.get_or_create(
      user=user, tenant=tenant_0, defaults={"role": "Owner", "id": uuid.uuid4()}
    )

  # Link existing global/orphaned data to Tenant 0
  StatusPage.objects.filter(tenant__isnull=True).update(tenant=tenant_0)
  Endpoints.objects.filter(tenant__isnull=True).update(tenant=tenant_0)
  Incident.objects.filter(tenant__isnull=True).update(tenant=tenant_0)
  BugReport.objects.filter(tenant__isnull=True).update(tenant=tenant_0)
  CookieConsent.objects.filter(tenant__isnull=True).update(tenant=tenant_0)
  Vulnerability.objects.filter(tenant__isnull=True).update(tenant=tenant_0)
  ThreatIntelligence.objects.filter(tenant__isnull=True).update(tenant=tenant_0)
  AggregatedAnalytics.objects.filter(tenant__isnull=True).update(tenant=tenant_0)


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0021_tenant_aggregatedanalytics_tenant_bugreport_tenant_and_more"),
  ]

  operations = [
    migrations.RunPython(create_tenant_0, reverse_code=migrations.RunPython.noop),
  ]
