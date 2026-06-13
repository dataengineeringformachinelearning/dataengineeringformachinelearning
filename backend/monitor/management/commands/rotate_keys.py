import logging
from typing import Any

from cryptography.fernet import Fernet
from django.core.management.base import BaseCommand
from django.db import transaction
from utils.encryption import get_kek_cipher

from monitor.models import AnalyticsIntegration, DataEncryptionKey

logger = logging.getLogger(__name__)


class Command(BaseCommand):
  help = "Rotates the active Data Encryption Key (DEK) and re-encrypts all credentials."

  def handle(self, *args: Any, **options: Any) -> None:
    self.stdout.write("Starting key rotation process...")

    with transaction.atomic():
      # 1. Deactivate current active DEK(s)
      DataEncryptionKey.objects.filter(is_active=True).update(is_active=False)

      # 2. Generate a new DEK
      raw_dek = Fernet.generate_key()
      kek_cipher = get_kek_cipher()
      encrypted_dek = kek_cipher.encrypt(raw_dek).decode()

      new_dek = DataEncryptionKey.objects.create(encrypted_dek=encrypted_dek, is_active=True)
      self.stdout.write(self.style.SUCCESS(f"Generated new active DEK: {new_dek.id}"))

      # 3. Re-encrypt existing AnalyticsIntegration credentials
      integrations = AnalyticsIntegration.objects.all()
      reencrypted_count = 0

      for integration in integrations:
        try:
          # Accessing self.credentials triggers decryption under-the-hood if it is still a ciphertext dict.
          # To ensure we get the decrypted dict, we manually trigger the decryption check.
          # Note: self._decrypt_credentials() was already called on initialization.
          # We force re-encryption by clearing any stored ciphertext and calling save.
          if isinstance(integration.credentials, dict):
            # Read current decrypted credentials
            creds = dict(integration.credentials)
            # Clear credentials to ensure save() knows it's not ciphertext and re-encrypts it
            integration.credentials = creds
            integration.save()
            reencrypted_count += 1
        except Exception as e:
          self.stdout.write(
            self.style.ERROR(
              f"Failed to re-encrypt credentials for user {integration.user.username}: {e}"
            )
          )

      self.stdout.write(
        self.style.SUCCESS(
          f"Successfully rotated keys and re-encrypted {reencrypted_count} integration credentials."
        )
      )
