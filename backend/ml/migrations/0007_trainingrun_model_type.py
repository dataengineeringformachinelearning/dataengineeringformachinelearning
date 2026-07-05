from django.db import migrations, models


class Migration(migrations.Migration):
  dependencies = [
    ("ml", "0006_user_centric_squash"),
  ]

  operations = [
    migrations.AddField(
      model_name="trainingrun",
      name="model_type",
      field=models.CharField(
        choices=[("sla", "SLA Estimator"), ("spiking", "Spiking Temporal Forecaster")],
        default="sla",
        max_length=16,
      ),
    ),
  ]
