from django.db import migrations, models


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0051_lighthouse_scan"),
  ]

  operations = [
    migrations.AddIndex(
      model_name="validatedsite",
      index=models.Index(fields=["domain"], name="validated_site_domain_idx"),
    ),
  ]
