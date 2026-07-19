from django.db import migrations, models


class Migration(migrations.Migration):
  dependencies = [("monitor", "0058_bugreport_delivery_outbox")]

  operations = [
    migrations.SeparateDatabaseAndState(
      state_operations=[
        migrations.CreateModel(
          name="HeadlessRateLimitBucket",
          fields=[
            ("scope_key", models.CharField(max_length=64, primary_key=True, serialize=False)),
            ("tokens", models.FloatField()),
            ("updated_at", models.DateTimeField(db_index=True)),
          ],
          options={"db_table": "headless_rate_limit_buckets"},
        ),
      ],
      database_operations=[
        migrations.RunSQL(
          sql="""
          CREATE TABLE IF NOT EXISTS headless_rate_limit_buckets (
            scope_key varchar(64) PRIMARY KEY,
            tokens double precision NOT NULL,
            updated_at timestamptz NOT NULL
          );
          CREATE INDEX IF NOT EXISTS headless_rate_limit_buckets_updated_at_idx
            ON headless_rate_limit_buckets (updated_at);
          """,
          reverse_sql=migrations.RunSQL.noop,
        ),
      ],
    ),
  ]
