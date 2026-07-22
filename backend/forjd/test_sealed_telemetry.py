"""Unit tests for server-side AES-GCM seal helpers."""

from __future__ import annotations

import base64
import hashlib
import secrets

from forjd.sealed_telemetry import seal_bytes


def test_seal_bytes_produces_valid_gcm_envelope() -> None:
  key = secrets.token_bytes(32)
  tenant_id = "11111111-1111-1111-1111-111111111111"
  event_id = "evt-1"
  envelope = seal_bytes(
    b'{"ok":true}',
    key=key,
    key_id="session-1",
    tenant_id=tenant_id,
    client_event_id=event_id,
  )
  assert envelope["algo"] == "aes-256-gcm"
  assert envelope["key_id"] == "session-1"
  nonce = base64.b64decode(envelope["nonce"])
  ciphertext = base64.b64decode(envelope["ciphertext"])
  assert len(nonce) == 12
  assert len(ciphertext) >= 17
  assert envelope["ciphertext_sha256"] == hashlib.sha256(ciphertext).hexdigest()
