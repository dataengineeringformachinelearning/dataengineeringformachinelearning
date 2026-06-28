import django_migration_linter as linter
from django.db import migrations


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0033_user_centric_squash"),
    ("ml", "0006_user_centric_squash"),
  ]

  operations = [
    linter.IgnoreMigration(),
    migrations.AlterUniqueTogether(
      name="tenantmembership",
      unique_together=None,
    ),
    migrations.RemoveField(model_name="tenantmembership", name="user"),
    migrations.RemoveField(model_name="tenantmembership", name="tenant"),
    migrations.DeleteModel(name="TenantMembership"),
    migrations.DeleteModel(name="Tenant"),
  ]
