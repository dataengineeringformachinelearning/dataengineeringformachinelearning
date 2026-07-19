from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0061_bugreport_dead_letter_outbox"),
  ]

  operations = [
    migrations.AlterField(
      model_name="userprofile",
      name="subscription_active",
      field=models.BooleanField(default=False),
    ),
  ]
