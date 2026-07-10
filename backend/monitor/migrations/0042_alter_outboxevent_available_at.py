from django.db import migrations, models


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0041_rust_data_plane"),
  ]

  operations = [
    migrations.AlterField(
      model_name="outboxevent",
      name="available_at",
      field=models.DateTimeField(auto_now_add=True, blank=True, null=True),
    ),
  ]
