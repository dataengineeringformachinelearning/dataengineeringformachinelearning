from django.apps import AppConfig


class TelemetryConfig(AppConfig):
  default_auto_field = "django.db.models.BigAutoField"
  name = "telemetry"

  def ready(self):
    # Connect dynamic CORS handler
    pass

    # Start workers in a separate thread to avoid blocking main thread
