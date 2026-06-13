import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from utils.encryption import decrypt_data, encrypt_data, get_active_dek

from monitor.models import AnalyticsIntegration, DataEncryptionKey

User = get_user_model()


@pytest.mark.django_db
def test_envelope_encryption_and_decryption() -> None:
  # Test encrypting and decrypting basic data
  data = {"api_key": "super-secret-key-123", "account_id": "999"}
  ciphertext = encrypt_data(data)

  assert ciphertext.startswith("v1:")

  # Verify it can be decrypted back to the original dictionary
  decrypted = decrypt_data(ciphertext)
  assert decrypted == data


@pytest.mark.django_db
def test_key_rotation_management_command() -> None:
  # Create a test user
  user = User.objects.create_user(username="test_encrypt_user", password="password")

  # Create an AnalyticsIntegration with encrypted credentials
  integration = AnalyticsIntegration.objects.create(
    user=user, provider="google", credentials={"api_key": "google-oauth-token-xyz"}
  )

  # Check active DEK
  dek_id_before, _ = get_active_dek()

  # Rotate keys using management command
  call_command("rotate_keys")

  # Verify a new active DEK was created and the old one deactivated
  dek_id_after, _ = get_active_dek()
  assert dek_id_before != dek_id_after

  # Verify the old DEK is no longer active
  old_dek = DataEncryptionKey.objects.get(id=dek_id_before)
  assert old_dek.is_active is False

  # Verify credentials can still be decrypted correctly after rotation
  integration.refresh_from_db()
  assert integration.credentials == {"api_key": "google-oauth-token-xyz"}
