import uuid
from typing import Any

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def create_outbox_notify_trigger(apps: Any, schema_editor: Any) -> None:
  del apps  # required signature for migration linter / RunPython
  if schema_editor.connection.vendor != "postgresql":
    return
  with schema_editor.connection.cursor() as cursor:
    cursor.execute(
      """
      CREATE OR REPLACE FUNCTION notify_deml_outbox() RETURNS trigger AS $$
      BEGIN
        PERFORM pg_notify('deml_outbox', NEW.id::text);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS monitor_outbox_notify ON monitor_outboxevent;
      CREATE TRIGGER monitor_outbox_notify
      AFTER INSERT ON monitor_outboxevent
      FOR EACH ROW EXECUTE FUNCTION notify_deml_outbox();
      """
    )


def drop_outbox_notify_trigger(apps: Any, schema_editor: Any) -> None:
  del apps  # required signature for migration linter / RunPython
  if schema_editor.connection.vendor != "postgresql":
    return
  with schema_editor.connection.cursor() as cursor:
    cursor.execute(
      """
      DROP TRIGGER IF EXISTS monitor_outbox_notify ON monitor_outboxevent;
      DROP FUNCTION IF EXISTS notify_deml_outbox();
      """
    )


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0040_userlifecyclejob"),
    migrations.swappable_dependency(settings.AUTH_USER_MODEL),
  ]

  operations = [
    migrations.AddIndex(
      model_name="statuspage",
      index=models.Index(
        fields=["is_platform", "is_published"], name="status_page_is_plat_ff9f2d_idx"
      ),
    ),
    migrations.AddIndex(
      model_name="statuspage",
      index=models.Index(fields=["user", "is_platform"], name="status_page_user_id_12c0fc_idx"),
    ),
    # Nullable on add so existing outbox rows do not get a NOT NULL DDL change.
    # Backfill from created_at; model uses auto_now_add for new inserts.
    migrations.AddField(
      model_name="outboxevent",
      name="available_at",
      field=models.DateTimeField(blank=True, null=True),
    ),
    migrations.RunSQL(
      sql="UPDATE monitor_outboxevent SET available_at = created_at WHERE available_at IS NULL",
      reverse_sql=migrations.RunSQL.noop,
    ),
    migrations.AddField(
      model_name="outboxevent",
      name="dlq_at",
      field=models.DateTimeField(blank=True, null=True),
    ),
    migrations.AddField(
      model_name="outboxevent",
      name="idempotency_key",
      field=models.CharField(blank=True, max_length=255, null=True, unique=True),
    ),
    migrations.AddField(
      model_name="outboxevent",
      name="lease_expires_at",
      field=models.DateTimeField(blank=True, null=True),
    ),
    migrations.AddField(
      model_name="outboxevent",
      name="lease_owner",
      field=models.UUIDField(blank=True, null=True),
    ),
    migrations.AddIndex(
      model_name="outboxevent",
      index=models.Index(
        fields=["is_published", "available_at", "lease_expires_at"],
        name="monitor_out_delivery_idx",
      ),
    ),
    migrations.CreateModel(
      name="ScheduledTaskRun",
      fields=[
        (
          "id",
          models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False),
        ),
        ("task_name", models.CharField(max_length=100)),
        ("scheduled_for", models.DateTimeField()),
        (
          "state",
          models.CharField(
            choices=[
              ("pending", "Pending"),
              ("published", "Published"),
              ("running", "Running"),
              ("completed", "Completed"),
              ("failed", "Failed"),
            ],
            default="pending",
            max_length=20,
          ),
        ),
        ("attempts", models.IntegerField(default=0)),
        ("last_error", models.TextField(blank=True, default="")),
        ("claimed_by", models.UUIDField(blank=True, null=True)),
        ("lease_expires_at", models.DateTimeField(blank=True, null=True)),
        ("started_at", models.DateTimeField(blank=True, null=True)),
        ("completed_at", models.DateTimeField(blank=True, null=True)),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        ("updated_at", models.DateTimeField(auto_now=True)),
      ],
      options={"db_table": "scheduled_task_runs"},
    ),
    migrations.AddConstraint(
      model_name="scheduledtaskrun",
      constraint=models.UniqueConstraint(
        fields=("task_name", "scheduled_for"), name="unique_scheduled_task_bucket"
      ),
    ),
    migrations.AddIndex(
      model_name="scheduledtaskrun",
      index=models.Index(fields=["state", "scheduled_for"], name="scheduled_t_state_1b67dc_idx"),
    ),
    migrations.CreateModel(
      name="HealthProbeObservation",
      fields=[
        (
          "id",
          models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False),
        ),
        ("observation_key", models.CharField(max_length=255, unique=True)),
        ("account_id", models.UUIDField(blank=True, db_index=True, null=True)),
        ("is_platform", models.BooleanField(db_index=True, default=False)),
        ("url", models.URLField()),
        ("status_code", models.IntegerField()),
        ("response_time_ms", models.PositiveBigIntegerField()),
        ("is_active", models.BooleanField(default=False)),
        ("error", models.TextField(blank=True, default="")),
        ("observed_at", models.DateTimeField()),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        (
          "monitored_service",
          models.ForeignKey(
            on_delete=django.db.models.deletion.CASCADE,
            related_name="probe_observations",
            to="monitor.monitoredservice",
          ),
        ),
        (
          "user",
          models.ForeignKey(
            blank=True,
            null=True,
            on_delete=django.db.models.deletion.CASCADE,
            related_name="probe_observations",
            to=settings.AUTH_USER_MODEL,
          ),
        ),
      ],
      options={"db_table": "health_probe_observations"},
    ),
    migrations.AddIndex(
      model_name="healthprobeobservation",
      index=models.Index(
        fields=["monitored_service", "observed_at"], name="health_prob_monitor_538bc5_idx"
      ),
    ),
    migrations.AddIndex(
      model_name="healthprobeobservation",
      index=models.Index(
        fields=["user", "is_platform", "observed_at"], name="health_prob_user_id_672f2a_idx"
      ),
    ),
    migrations.CreateModel(
      name="TelemetryIngestReceipt",
      fields=[
        (
          "id",
          models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False),
        ),
        ("topic", models.CharField(max_length=100)),
        ("partition", models.IntegerField()),
        ("offset", models.BigIntegerField()),
        ("account_id", models.UUIDField(blank=True, db_index=True, null=True)),
        ("event_id", models.CharField(blank=True, default="", max_length=255)),
        ("processed_at", models.DateTimeField(auto_now_add=True)),
      ],
      options={"db_table": "telemetry_ingest_receipts"},
    ),
    migrations.AddConstraint(
      model_name="telemetryingestreceipt",
      constraint=models.UniqueConstraint(
        fields=("topic", "partition", "offset"), name="unique_telemetry_kafka_position"
      ),
    ),
    migrations.AddIndex(
      model_name="telemetryingestreceipt",
      index=models.Index(fields=["topic", "processed_at"], name="telemetry_i_topic_590d13_idx"),
    ),
    migrations.RunPython(create_outbox_notify_trigger, drop_outbox_notify_trigger),
  ]
