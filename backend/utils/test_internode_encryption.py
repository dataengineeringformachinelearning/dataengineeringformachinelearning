from __future__ import annotations

import base64
import json

import pytest

from utils.internode_encryption import (
  InternodeEncryptionError,
  InternodeEncryptionMode,
  InternodeKeyring,
  decrypt_bytes,
  encrypt_bytes,
)

KEY = bytes(range(32))
KID = "test-2026-07"
MESSAGE_ID = "12345678-1234-5678-1234-567812345678"
NONCE = bytes(range(12))


def keyring(mode: InternodeEncryptionMode = InternodeEncryptionMode.REQUIRED) -> InternodeKeyring:
  return InternodeKeyring(mode=mode, active_kid=KID, keys={KID: KEY}, sender="test-node")


def test_internode_round_trip_and_deterministic_vector() -> None:
  encrypted = encrypt_bytes(
    b'{"tenant":"00000000-0000-0000-0000-000000000001"}',
    context="kafka:app-events",
    keyring=keyring(),
    issued_at=1_783_728_000,
    message_id=MESSAGE_ID,
    nonce=NONCE,
  )
  envelope = json.loads(encrypted)
  assert envelope["typ"] == "deml-internode+jwe"
  assert envelope["nonce"] == base64.urlsafe_b64encode(NONCE).decode().rstrip("=")
  assert (
    envelope["ciphertext"]
    == (
      "PCCifquErG-ve7W7gdlIXbPmtxnAS29MFVfVtS1EMIIxIIPMn_EiqESUT924txkak-sNbr-oICt4Caj8XnDvij8"  # pragma: allowlist secret
    )
  )
  assert (
    decrypt_bytes(
      encrypted,
      context="kafka:app-events",
      keyring=keyring(),
      now=1_783_728_000,
    )
    == b'{"tenant":"00000000-0000-0000-0000-000000000001"}'
  )


def test_internode_rejects_tampering_and_context_swaps() -> None:
  encrypted = encrypt_bytes(
    b"sensitive",
    context="kafka:app-events",
    keyring=keyring(),
    issued_at=1_783_728_000,
    message_id=MESSAGE_ID,
    nonce=NONCE,
  )
  envelope = json.loads(encrypted)
  first = envelope["ciphertext"][0]
  envelope["ciphertext"] = ("A" if first != "A" else "B") + envelope["ciphertext"][1:]
  with pytest.raises(InternodeEncryptionError, match="authentication failed"):
    decrypt_bytes(
      json.dumps(envelope).encode(),
      context="kafka:app-events",
      keyring=keyring(),
      now=1_783_728_000,
    )
  with pytest.raises(InternodeEncryptionError, match="context mismatch"):
    decrypt_bytes(
      encrypted,
      context="kafka:user-issues",
      keyring=keyring(),
      now=1_783_728_000,
    )


def test_required_mode_rejects_plaintext_downgrade() -> None:
  with pytest.raises(InternodeEncryptionError, match="plaintext"):
    decrypt_bytes(b'{"legacy":true}', context="kafka:app-events", keyring=keyring())


def test_optional_mode_accepts_plaintext_for_rolling_migration() -> None:
  optional = keyring(InternodeEncryptionMode.OPTIONAL)
  assert (
    decrypt_bytes(b'{"legacy":true}', context="kafka:app-events", keyring=optional)
    == b'{"legacy":true}'
  )
