from django.db import migrations, models


class Migration(migrations.Migration):
  dependencies = [("monitor", "0058_bugreport_delivery_outbox")]

  operations = [
    migrations.CreateModel(
      name="HeadlessRateLimitBucket",
      fields=[
        ("scope_key", models.CharField(max_length=64, primary_key=True, serialize=False)),
        ("tokens", models.FloatField()),
        ("updated_at", models.DateTimeField(db_index=True)),
      ],
      options={"db_table": "headless_rate_limit_buckets"},
    ),
  ]
