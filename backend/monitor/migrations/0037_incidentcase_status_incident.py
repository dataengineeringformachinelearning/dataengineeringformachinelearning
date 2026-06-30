from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0036_add_vuln_audit_indexes_antigravity"),
  ]

  operations = [
    migrations.AddField(
      model_name="incidentcase",
      name="status_incident",
      field=models.ForeignKey(
        blank=True,
        help_text="Optional public status-page incident linked from this SOC case.",
        null=True,
        on_delete=django.db.models.deletion.SET_NULL,
        related_name="security_cases",
        to="monitor.incident",
      ),
    ),
  ]
