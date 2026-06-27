from django.apps import AppConfig


class TelemetryConfig(AppConfig):
  default_auto_field = "django.db.models.BigAutoField"
  name = "telemetry"

  def ready(self):
    # Connect dynamic CORS handler
    from corsheaders.signals import check_request_enabled

    from telemetry.cors import cors_allow_dynamic_telemetry

    check_request_enabled.connect(cors_allow_dynamic_telemetry)
