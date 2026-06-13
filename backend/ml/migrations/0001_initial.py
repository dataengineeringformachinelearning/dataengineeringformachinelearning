import uuid

from django.db import migrations, models


class CreateTableIfNotExists(migrations.CreateModel):
  def database_forwards(self, app_label, schema_editor, from_state, to_state):
    table_name = self.options.get("db_table", f"{app_label}_{self.name.lower()}")
    if table_name in schema_editor.connection.introspection.table_names():
      return
    super().database_forwards(app_label, schema_editor, from_state, to_state)


class Migration(migrations.Migration):
  initial = True

  dependencies = [
    ("monitor", "0009_rename_model_to_ml"),
  ]

  operations = [
    CreateTableIfNotExists(
      name="TrainingRun",
      fields=[
        (
          "id",
          models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False),
        ),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        ("average_sla", models.FloatField()),
        ("loss", models.FloatField()),
      ],
      options={
        "db_table": "training_runs",
        "ordering": ["-created_at"],
      },
    ),
  ]
