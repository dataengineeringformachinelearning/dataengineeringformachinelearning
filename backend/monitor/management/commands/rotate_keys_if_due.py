from datetime import timedelta
from typing import Any

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone
from utils.retention import DEK_ROTATION_MAX_AGE_DAYS

from monitor.models import DataEncryptionKey


class Command(BaseCommand):
  help = "Rotates envelope keys only when no active key exists or the active key is too old"

  def handle(self, *args: Any, **options: Any) -> None:
    active_key = DataEncryptionKey.objects.filter(is_active=True).order_by("-created_at").first()
    if active_key is None or timezone.now() - active_key.created_at >= timedelta(
      days=DEK_ROTATION_MAX_AGE_DAYS
    ):
      call_command("rotate_keys")
      self.stdout.write(self.style.SUCCESS("Data encryption keys rotated."))
      return
    self.stdout.write(self.style.SUCCESS("Active data encryption key remains within policy."))
