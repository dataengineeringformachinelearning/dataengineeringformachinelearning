import base64
import hashlib
import json

from cryptography.fernet import Fernet
from django.conf import settings


def get_fernet_cipher():
  # Derive a 32-byte key from Django's SECRET_KEY
  key = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest())
  return Fernet(key)


def encrypt_data(data: dict) -> str:
  """Encrypt a dictionary to an encrypted base64 string."""
  if not data:
    return ""
  serialized = json.dumps(data)
  cipher = get_fernet_cipher()
  encrypted = cipher.encrypt(serialized.encode())
  return encrypted.decode()


def decrypt_data(ciphertext: str) -> dict:
  """Decrypt an encrypted base64 string back to a dictionary."""
  if not ciphertext:
    return {}
  cipher = get_fernet_cipher()
  decrypted = cipher.decrypt(ciphertext.encode())
  return json.loads(decrypted.decode())
