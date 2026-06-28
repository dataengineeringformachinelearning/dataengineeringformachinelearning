import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0034_drop_tenant_tables"),
  ]

  operations = [
    migrations.CreateModel(
      name="SyntheticMonitor",
      fields=[
        (
          "id",
          models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False),
        ),
        ("name", models.CharField(max_length=255, unique=True)),
        (
          "status",
          models.CharField(
            choices=[
              ("Operational", "Operational"),
              ("Degraded", "Degraded"),
              ("Outage", "Outage"),
            ],
            default="Operational",
            max_length=20,
          ),
        ),
        ("latency_ms", models.IntegerField(blank=True, null=True)),
        ("detail", models.CharField(blank=True, default="", max_length=500)),
        ("checked_at", models.DateTimeField(auto_now=True)),
      ],
      options={
        "db_table": "synthetic_monitors",
        "ordering": ["name"],
      },
    ),
  ]
