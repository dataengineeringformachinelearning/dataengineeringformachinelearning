from __future__ import annotations

from django.db import migrations, models

REPORT_MAX_DELIVERY_ATTEMPTS = 12


def bound_and_sanitize_report_outbox(apps, schema_editor) -> None:
  """Quarantine exhausted rows and replace historical free-form failures."""
  report_model = apps.get_model("monitor", "BugReport")
  database = schema_editor.connection.alias
  reports = report_model.objects.using(database)

  reports.filter(delivery_status="delivered").update(last_delivery_error="")
  reports.filter(delivery_status="legacy_retained").update(
    next_delivery_at=None,
    last_delivery_error="legacy_retained",
  )
  reports.filter(
    delivery_status="pending",
    delivery_attempts__gte=REPORT_MAX_DELIVERY_ATTEMPTS,
  ).update(
    delivery_status="dead_letter",
    next_delivery_at=None,
    last_delivery_error="attempt_limit",
  )
  reports.filter(delivery_status="pending").exclude(last_delivery_error="").update(
    last_delivery_error="delivery_retry_scheduled"
  )


class Migration(migrations.Migration):
  dependencies = [("monitor", "0060_destination_history_lifecycle_fencing")]

  operations = [
    migrations.AlterField(
      model_name="bugreport",
      name="delivery_status",
      field=models.CharField(
        choices=[
          ("pending", "Pending"),
          ("delivered", "Delivered"),
          ("dead_letter", "Dead letter"),
          ("legacy_retained", "Legacy retained locally"),
        ],
        db_index=True,
        default="pending",
        max_length=16,
      ),
    ),
    migrations.RunPython(
      bound_and_sanitize_report_outbox,
      migrations.RunPython.noop,
    ),
    migrations.AddIndex(
      model_name="bugreport",
      index=models.Index(
        fields=["delivery_status", "next_delivery_at", "created_at"],
        name="bug_report_delivery_ready_idx",
      ),
    ),
  ]
