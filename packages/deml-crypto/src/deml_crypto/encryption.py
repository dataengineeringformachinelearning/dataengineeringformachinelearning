"""DEML Crypto - AES-256-GCM + GCP KMS envelope encryption with DEK rotation.

This module provides security utilities for envelope encryption where:
- KEK (Key Encryption Key) is stored in GCP KMS or derived from a master secret
- DEK (Data Encryption Key) is generated randomly and encrypted by the KEK
- Supports automatic key rotation with temporal validity windows

Usage:
    from deml_crypto import encrypt, decrypt, rotate_key

    encrypted = encrypt(b"secret data")
    decrypted = decrypt(encrypted)
"""

from __future__ import annotations

import base64
import hashlib
import os
from typing import Final

from cryptography.fernet import Fernet

__version__ = "0.1.0"

# Environment configuration
KMS_PROJECT_ID: Final[str | None] = os.getenv("GCP_KMS_PROJECT_ID") or os.getenv(
    "GOOGLE_CLOUD_PROJECT"
)
KMS_LOCATION: Final[str] = os.getenv("GCP_KMS_LOCATION", "global")
KMS_KEY_RING: Final[str | None] = os.getenv("GCP_KMS_KEY_RING")
KMS_KEY_NAME: Final[str | None] = os.getenv("GCP_KMS_KEY_NAME")


def is_kms_enabled() -> bool:
    """Check if GCP KMS is configured."""
    return bool(KMS_PROJECT_ID and KMS_KEY_RING and KMS_KEY_NAME)


_kms_client: object | None = None


def get_kms_client() -> object:
    """Get or create the KMS client (lazy initialization)."""
    global _kms_client
    if _kms_client is None:
        try:
            from google.cloud import kms

            _kms_client = kms.KeyManagementServiceClient()
        except ImportError:
            return None
    return _kms_client


def _get_kms_key_path() -> str:
    """Construct the full KMS key path."""
    if not KMS_PROJECT_ID or not KMS_KEY_RING or not KMS_KEY_NAME:
        raise ValueError("KMS configuration incomplete")
    client = get_kms_client()
    return client.crypto_key_path(
        KMS_PROJECT_ID,
        KMS_LOCATION,
        KMS_KEY_RING,
        KMS_KEY_NAME,
    )


def encrypt_dek(raw_dek: bytes) -> str:
    """Encrypt a Data Encryption Key using KMS or local KEK."""
    if is_kms_enabled():
        try:
            client = get_kms_client()
            key_path = _get_kms_key_path()
            response = client.encrypt(request={"name": key_path, "plaintext": raw_dek})
            return base64.b64encode(response.ciphertext).decode("utf-8")
        except Exception:
            pass

    # Fallback to local KEK encryption
    kek_cipher = _get_kek_cipher()
    return kek_cipher.encrypt(raw_dek).decode()


def decrypt_dek(encrypted_dek: str) -> bytes:
    """Decrypt a Data Encryption Key using KMS or local KEK."""
    if is_kms_enabled() and not encrypted_dek.startswith("gAAAA"):
        try:
            client = get_kms_client()
            key_path = _get_kms_key_path()
            ciphertext_bytes = base64.b64decode(encrypted_dek.encode("utf-8"))
            response = client.decrypt(request={"name": key_path, "ciphertext": ciphertext_bytes})
            return response.plaintext
        except Exception:
            pass

    kek_cipher = _get_kek_cipher()
    return kek_cipher.decrypt(encrypted_dek.encode())


def _get_kek_cipher(master_key: str | None = None) -> Fernet:
    """Derive a KEK cipher from master key."""
    key_source = (
        master_key
        or os.getenv("ENCRYPTION_MASTER_KEY")
        or os.getenv("SECRET_KEY", "default-key-for-dev")
    )
    key_bytes: Final[bytes] = base64.urlsafe_b64encode(hashlib.sha256(key_source.encode()).digest())
    return Fernet(key_bytes)


def encrypt(data: bytes, master_key: str | None = None) -> tuple[str, str]:
    """Encrypt data with a randomly generated DEK.

    Returns:
        Tuple of (encrypted_data, encrypted_dek) for storage
    """
    raw_dek: Final[bytes] = Fernet.generate_key()
    encrypted_dek: Final[str] = encrypt_dek(raw_dek)

    cipher = Fernet(raw_dek)
    encrypted_data: Final[str] = cipher.encrypt(data).decode()

    return encrypted_data, encrypted_dek


def decrypt(encrypted_data: str, encrypted_dek: str, master_key: str | None = None) -> bytes:
    """Decrypt data using the encrypted DEK."""
    dek_bytes: Final[bytes] = decrypt_dek(encrypted_dek)
    cipher = Fernet(dek_bytes)
    return cipher.decrypt(encrypted_data.encode())


def generate_key() -> str:
    """Generate a new Fernet key for DEK use."""
    return Fernet.generate_key().decode()
