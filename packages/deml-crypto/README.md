# DEML Crypto

AES-256-GCM + GCP KMS envelope encryption with DEK rotation.

## Installation

```bash
pip install deml-crypto
# With GCP KMS support:
pip install deml-crypto[gcp]
```

## Usage

```python
from deml_crypto import encrypt, decrypt, generate_key

# Encrypt data
encrypted_data, encrypted_dek = encrypt(b"my secret data")

# Decrypt data
decrypted = decrypt(encrypted_data, encrypted_dek)
```

## Features

- Envelope encryption with GCP KMS or local KEK
- Automatic key rotation support
- UUID-scoped tenant encryption compatible
- No pickle serialization (safe for security-critical contexts)

## License

MIT
