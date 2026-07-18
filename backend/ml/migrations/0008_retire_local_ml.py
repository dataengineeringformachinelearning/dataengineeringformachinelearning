from django.db import migrations


class Migration(migrations.Migration):
  dependencies = [("ml", "0007_trainingrun_model_type")]

  operations = [
    migrations.SeparateDatabaseAndState(
      database_operations=[],
      state_operations=[
        migrations.DeleteModel(name="ThreatReport"),
        migrations.DeleteModel(name="TrainingRun"),
      ],
    )
  ]
