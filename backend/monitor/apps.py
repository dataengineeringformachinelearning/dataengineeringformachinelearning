import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class MonitorConfig(AppConfig):
  default_auto_field = "django.db.models.BigAutoField"
  name = "monitor"

  def ready(self):
    import monitor.signals  # noqa
