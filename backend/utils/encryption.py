import base64
import hashlib
import json
import os
import uuid
from typing import Any, Final

from cryptography.fernet import Fernet
from django.conf import settings
from google.cloud import kms

# Retrieve KMS settings from environment variables
KMS_PROJECT_ID = os.getenv("GCP_KMS_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT")
KMS_LOCATION = os.getenv("GCP_KMS_LOCATION", "global")
KMS_KEY_RING = os.getenv("GCP_KMS_KEY_RING")
KMS_KEY_NAME = os.getenv("GCP_KMS_KEY_NAME")

_kms_client = None


def get_kms_client() -> kms.KeyManagementServiceClient:
  global _kms_client
  if _kms_client is None:
    _kms_client = kms.KeyManagementServiceClient()
  return _kms_client


def is_kms_enabled() -> bool:
  return bool(KMS_PROJECT_ID and KMS_KEY_RING and KMS_KEY_NAME)


def encrypt_dek_kms(raw_dek: bytes) -> str:
  client = get_kms_client()
  key_path = client.crypto_key_path(KMS_PROJECT_ID, KMS_LOCATION, KMS_KEY_RING, KMS_KEY_NAME)
  response = client.encrypt(request={"name": key_path, "plaintext": raw_dek})
  return base64.b64encode(response.ciphertext).decode("utf-8")


def decrypt_dek_kms(encrypted_dek: str) -> bytes:
  client = get_kms_client()
  key_path = client.crypto_key_path(KMS_PROJECT_ID, KMS_LOCATION, KMS_KEY_RING, KMS_KEY_NAME)
  ciphertext_bytes = base64.b64decode(encrypted_dek.encode("utf-8"))
  response = client.decrypt(request={"name": key_path, "ciphertext": ciphertext_bytes})
  return response.plaintext


def get_kek_cipher() -> Fernet:
  """Derive a 32-byte master Key Encryption Key (KEK) from settings.SECRET_KEY."""
  master_key_src: Final[str] = os.getenv("ENCRYPTION_MASTER_KEY") or settings.SECRET_KEY
  key: Final[bytes] = base64.urlsafe_b64encode(hashlib.sha256(master_key_src.encode()).digest())
  return Fernet(key)


def decrypt_dek(encrypted_dek_str: str) -> bytes:
  """Decrypt the DEK from database using GCP KMS if enabled and applicable, else fallback locally."""
  if is_kms_enabled() and not encrypted_dek_str.startswith("gAAAA"):
    try:
      return decrypt_dek_kms(encrypted_dek_str)
    except Exception:
      pass
  kek_cipher = get_kek_cipher()
  return kek_cipher.decrypt(encrypted_dek_str.encode())


def get_active_dek() -> tuple[uuid.UUID, Fernet]:
  """Retrieve the active Data Encryption Key (DEK) from the database, generating one if none exists."""
  from monitor.models import DataEncryptionKey

  try:
    dek_obj = DataEncryptionKey.objects.filter(is_active=True).order_by("-created_at").first()
    if not dek_obj:
      raw_dek: Final[bytes] = Fernet.generate_key()
      if is_kms_enabled():
        try:
          encrypted_dek = encrypt_dek_kms(raw_dek)
        except Exception:
          kek_cipher: Final[Fernet] = get_kek_cipher()
          encrypted_dek = kek_cipher.encrypt(raw_dek).decode()
      else:
        kek_cipher: Final[Fernet] = get_kek_cipher()
        encrypted_dek = kek_cipher.encrypt(raw_dek).decode()
      dek_obj = DataEncryptionKey.objects.create(encrypted_dek=encrypted_dek, is_active=True)
    decrypted_dek_bytes: Final[bytes] = decrypt_dek(dek_obj.encrypted_dek)
    return dek_obj.id, Fernet(decrypted_dek_bytes)
  except Exception:
    # Fallback to key derived from SECRET_KEY if db is not ready (e.g. during migrations/tests)
    fallback_key: Final[bytes] = base64.urlsafe_b64encode(
      hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    )
    return uuid.UUID("00000000-0000-0000-0000-000000000000"), Fernet(fallback_key)


def get_dek_by_id(dek_id: uuid.UUID) -> Fernet:
  """Retrieve a specific DEK by its ID and decrypt it using the KEK."""
  from monitor.models import DataEncryptionKey

  try:
    if str(dek_id) == "00000000-0000-0000-0000-000000000000":
      fallback_key: Final[bytes] = base64.urlsafe_b64encode(
        hashlib.sha256(settings.SECRET_KEY.encode()).digest()
      )
      return Fernet(fallback_key)
    dek_obj = DataEncryptionKey.objects.get(id=dek_id)
    decrypted_dek_bytes: Final[bytes] = decrypt_dek(dek_obj.encrypted_dek)
    return Fernet(decrypted_dek_bytes)
  except Exception:
    fallback_key = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest())
    return Fernet(fallback_key)


def encrypt_data(data: dict[str, Any]) -> str:
  """Encrypt a dictionary to an encrypted base64 string using the active DEK."""
  if not data:
    return ""
  serialized: Final[str] = json.dumps(data)
  dek_id, cipher = get_active_dek()
  encrypted: Final[bytes] = cipher.encrypt(serialized.encode())
  return f"v1:{dek_id}:{encrypted.decode()}"


def decrypt_data(ciphertext: str) -> dict[str, Any]:
  """Decrypt an encrypted base64 string back to a dictionary."""
  if not ciphertext:
    return {}

  if ciphertext.startswith("v1:"):
    parts: Final[list[str]] = ciphertext.split(":", 2)
    if len(parts) == 3:
      _, dek_id_str, encrypted_payload = parts
      try:
        dek_id: Final[uuid.UUID] = uuid.UUID(dek_id_str)
        cipher: Final[Fernet] = get_dek_by_id(dek_id)
        decrypted: Final[bytes] = cipher.decrypt(encrypted_payload.encode())
        return json.loads(decrypted.decode())
      except Exception:
        pass

  # Fallback to old format decryption directly using Django SECRET_KEY
  try:
    fallback_key: Final[bytes] = base64.urlsafe_b64encode(
      hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    )
    cipher = Fernet(fallback_key)
    decrypted_bytes: Final[bytes] = cipher.decrypt(ciphertext.encode())
    return json.loads(decrypted_bytes.decode())
  except Exception:
    return {}
