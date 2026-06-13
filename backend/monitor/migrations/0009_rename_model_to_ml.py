from django.db import migrations


def rename_app_in_migrations(apps, schema_editor):
  with schema_editor.connection.cursor() as cursor:
    cursor.execute("UPDATE django_migrations SET app = 'ml' WHERE app = 'model';")


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0008_analyticsintegration"),
  ]

  operations = [
    migrations.RunPython(rename_app_in_migrations, elidable=True),
  ]
