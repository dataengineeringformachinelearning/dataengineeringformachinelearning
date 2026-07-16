from typing import Any, Final

from django.db import migrations, models

INDEX_NAME: Final = "health_probe_observed_at_idx"


def create_observed_at_index(apps: Any, schema_editor: Any) -> None:
  if schema_editor.connection.vendor == "postgresql":
    with schema_editor.connection.cursor() as cursor:
      cursor.execute(
        """
        SELECT index_state.indisvalid
        FROM pg_class AS index_class
        JOIN pg_index AS index_state ON index_state.indexrelid = index_class.oid
        JOIN pg_class AS table_class ON table_class.oid = index_state.indrelid
        JOIN pg_namespace AS namespace ON namespace.oid = index_class.relnamespace
        WHERE index_class.relname = 'health_probe_observed_at_idx'
          AND table_class.relname = 'health_probe_observations'
          AND namespace.nspname = current_schema()
        """
      )
      existing = cursor.fetchone()
      if existing and bool(existing[0]):
        return
      if existing:
        cursor.execute("DROP INDEX CONCURRENTLY health_probe_observed_at_idx")
      cursor.execute(
        "CREATE INDEX CONCURRENTLY health_probe_observed_at_idx "
        "ON health_probe_observations (observed_at)"
      )
      cursor.execute(
        """
        SELECT index_state.indisvalid
        FROM pg_class AS index_class
        JOIN pg_index AS index_state ON index_state.indexrelid = index_class.oid
        JOIN pg_class AS table_class ON table_class.oid = index_state.indrelid
        JOIN pg_namespace AS namespace ON namespace.oid = index_class.relnamespace
        WHERE index_class.relname = 'health_probe_observed_at_idx'
          AND table_class.relname = 'health_probe_observations'
          AND namespace.nspname = current_schema()
        """
      )
      created = cursor.fetchone()
      if not created or not bool(created[0]):
        raise RuntimeError("health_probe_observed_at_idx was not created as a valid index")
    return
  observation = apps.get_model("monitor", "HealthProbeObservation")
  schema_editor.add_index(
    observation,
    models.Index(fields=["observed_at"], name=INDEX_NAME),
  )


def drop_observed_at_index(apps: Any, schema_editor: Any) -> None:
  if schema_editor.connection.vendor == "postgresql":
    schema_editor.execute("DROP INDEX CONCURRENTLY IF EXISTS health_probe_observed_at_idx")
    return
  observation = apps.get_model("monitor", "HealthProbeObservation")
  schema_editor.remove_index(
    observation,
    models.Index(fields=["observed_at"], name=INDEX_NAME),
  )


class Migration(migrations.Migration):
  atomic = False

  dependencies = [
    ("monitor", "0049_export_job_retries"),
  ]

  operations = [
    migrations.SeparateDatabaseAndState(
      database_operations=[
        migrations.RunPython(create_observed_at_index, drop_observed_at_index),
      ],
      state_operations=[
        migrations.AddIndex(
          model_name="healthprobeobservation",
          index=models.Index(fields=["observed_at"], name=INDEX_NAME),
        ),
      ],
    ),
  ]
