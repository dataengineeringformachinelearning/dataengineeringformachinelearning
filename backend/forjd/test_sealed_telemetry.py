"""Unit tests for platform sealed heartbeat helpers."""

from __future__ import annotations

import base64
from unittest.mock import AsyncMock, patch

import pytest
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from forjd.sealed_telemetry import seal_bytes, send_heartbeat_batch


def test_seal_bytes_round_trip() -> None:
  key = b"k" * 32
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
  plaintext = AESGCM(key).decrypt(nonce, ciphertext, f"{tenant_id}|{event_id}".encode())
  assert plaintext == b'{"ok":true}'


@pytest.mark.asyncio
async def test_send_heartbeat_batch_counts_accepts() -> None:
  client = AsyncMock()
  client.tenant_id = "11111111-1111-1111-1111-111111111111"
  client.request_json = AsyncMock(return_value={"ok": True})
  client.ingest = AsyncMock(return_value={"ok": True, "event_id": "e1"})
  with patch("forjd.sealed_telemetry._platform_client", return_value=client):
    result = await send_heartbeat_batch(count=3)
  assert result["accepted"] == 3
  assert result["failed"] == 0
  assert client.ingest.await_count == 3
  meta = client.ingest.await_args_list[0].args[0]["metadata"]
  assert meta["source"] == "deml-heartbeat"
  assert meta["product"] == "deml"
  assert meta["region"]
  assert meta["component"]
  assert meta["label"] in {"2xx", "4xx", "5xx"}
