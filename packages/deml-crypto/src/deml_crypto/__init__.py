"""DEML Crypto - Security utilities for envelope encryption.

Provides AES-256-GCM encryption with GCP KMS envelope encryption support.
"""

from deml_crypto.encryption import (
    __version__,
    decrypt,
    decrypt_dek,
    encrypt,
    encrypt_dek,
    generate_key,
    is_kms_enabled,
)

__all__ = [
    "__version__",
    "encrypt",
    "decrypt",
    "encrypt_dek",
    "decrypt_dek",
    "generate_key",
    "is_kms_enabled",
]
