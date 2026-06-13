import base64
import hashlib
import json
from typing import Any, Final

from cryptography.fernet import Fernet
from django.conf import settings


def get_fernet_cipher() -> Fernet:
  # Derive a 32-byte key from Django's SECRET_KEY
  key: Final[bytes] = base64.urlsafe_b64encode(
    hashlib.sha256(settings.SECRET_KEY.encode()).digest()
  )
  return Fernet(key)


def encrypt_data(data: dict[str, Any]) -> str:
  """Encrypt a dictionary to an encrypted base64 string."""
  if not data:
    return ""
  serialized: Final[str] = json.dumps(data)
  cipher: Final[Fernet] = get_fernet_cipher()
  encrypted: Final[bytes] = cipher.encrypt(serialized.encode())
  return encrypted.decode()


def decrypt_data(ciphertext: str) -> dict[str, Any]:
  """Decrypt an encrypted base64 string back to a dictionary."""
  if not ciphertext:
    return {}
  cipher: Final[Fernet] = get_fernet_cipher()
  decrypted: Final[bytes] = cipher.decrypt(ciphertext.encode())
  return json.loads(decrypted.decode())
