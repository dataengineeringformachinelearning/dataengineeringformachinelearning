"""Seal FORJD ``fjsvc_`` tokens for per-account DB storage.

Uses envelope encryption (random DEK + KEK from SECRET_KEY / ENCRYPTION_MASTER_KEY).
Never store plaintext service tokens in mapping rows.
"""

from __future__ import annotations

import base64
import hashlib
import logging
from typing import Final

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

logger = logging.getLogger("forjd.secrets")

SEALED_REF_PREFIX: Final[str] = "sealed:"


def _kek_cipher() -> Fernet:
  key_source = (
    str(getattr(settings, "ENCRYPTION_MASTER_KEY", "") or "").strip()
    or str(getattr(settings, "SECRET_KEY", "") or "").strip()
  )
  if not key_source:
    raise RuntimeError("SECRET_KEY is required to seal FORJD service tokens")
  key_bytes = base64.urlsafe_b64encode(hashlib.sha256(key_source.encode("utf-8")).digest())
  return Fernet(key_bytes)


def seal_service_token(token: str) -> tuple[str, str]:
  """Return (ciphertext, encrypted_dek) for DB storage."""
  raw_dek = Fernet.generate_key()
  encrypted_dek = _kek_cipher().encrypt(raw_dek).decode("utf-8")
  ciphertext = Fernet(raw_dek).encrypt(token.encode("utf-8")).decode("utf-8")
  return ciphertext, encrypted_dek


def open_service_token(ciphertext: str, encrypted_dek: str) -> str:
  """Decrypt a sealed ``fjsvc_`` token."""
  try:
    dek = _kek_cipher().decrypt(encrypted_dek.encode("utf-8"))
    return Fernet(dek).decrypt(ciphertext.encode("utf-8")).decode("utf-8")
  except InvalidToken as exc:
    raise RuntimeError("Failed to open sealed FORJD service token") from exc


def sealed_ref(credential_id: str) -> str:
  return f"{SEALED_REF_PREFIX}{credential_id}"


def is_sealed_ref(secret_ref: str) -> bool:
  return str(secret_ref or "").startswith(SEALED_REF_PREFIX)


def sealed_credential_id(secret_ref: str) -> str:
  return str(secret_ref or "").removeprefix(SEALED_REF_PREFIX)
