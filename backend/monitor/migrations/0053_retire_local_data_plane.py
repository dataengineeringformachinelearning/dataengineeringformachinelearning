from django.db import migrations


class Migration(migrations.Migration):
  dependencies = [("monitor", "0052_validated_site_domain_index")]

  retired_models = (
    "AggregatedAnalytics",
    "AnalyticsIntegration",
    "Asset",
    "BenchmarkRun",
    "DataEncryptionKey",
    "Endpoints",
    "ExportJob",
    "HealthProbeObservation",
    "HoneypotInteraction",
    "HoneypotEndpoint",
    "IncidentCase",
    "Incident",
    "LighthouseScan",
    "MonitoredService",
    "OutboxEvent",
    "PlaybookAction",
    "Playbook",
    "ReportArchive",
    "ScheduledTaskRun",
    "SearchQuery",
    "StatusPageUptimeDaily",
    "StatusPage",
    "SyntheticMonitor",
    "TelemetryIngestReceipt",
    "ThreatIntelligence",
    "Vulnerability",
    "WebTechnologyObservation",
  )

  # Database tables and data are intentionally retained for rollback. A later,
  # separately approved purge migration may remove them after FORJD cutover.
  operations = [
    migrations.SeparateDatabaseAndState(
      database_operations=[],
      state_operations=[
        *[migrations.DeleteModel(name=name) for name in retired_models],
        migrations.RemoveIndex(model_name="auditlog", name="audit_action_idx"),
        migrations.RemoveIndex(model_name="auditlog", name="audit_logs_timesta_423be6_idx"),
        migrations.RemoveIndex(model_name="bugreport", name="bug_reports_created_c948ac_idx"),
        migrations.RemoveIndex(model_name="cookieconsent", name="cookie_cons_created_f347bb_idx"),
        migrations.RemoveIndex(
          model_name="userlifecyclejob", name="user_lifecy_job_typ_0a8f2d_idx"
        ),
        migrations.RemoveIndex(
          model_name="userlifecyclejob", name="user_lifecy_account_6e2b41_idx"
        ),
        migrations.RemoveField(model_name="bugreport", name="processed_report"),
        migrations.RemoveField(model_name="cookieconsent", name="is_platform"),
      ],
    )
  ]
