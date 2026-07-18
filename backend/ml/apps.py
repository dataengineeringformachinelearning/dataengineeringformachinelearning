from django.apps import AppConfig


class MlConfig(AppConfig):
  """Migration-only compatibility app; all ML execution lives in FORJD."""

  default_auto_field = "django.db.models.BigAutoField"
  name = "ml"
