from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):
  """Flip Python/DB default only — existing rows keep their current values."""

  dependencies = [
    ("monitor", "0061_bugreport_dead_letter_outbox"),
  ]

  import django_migration_linter

  operations = [
    # AlterField default-only is misreported as adding NOT NULL.
    django_migration_linter.IgnoreMigration(),
    migrations.AlterField(
      model_name="userprofile",
      name="subscription_active",
      field=models.BooleanField(default=False),
    ),
  ]
