"""Platform sealed telemetry → FORJD (ciphertext + routing tags only).

Keeps the mapped DEML platform tenant fed so analytics-rollup / ml-training
have continuous sealed traffic. Private keys never leave this process; FORJD
stores ciphertext only.
"""

from __future__ import annotations

import base64
import hashlib
import logging
import os
import secrets
import time
from typing import Any, Final
from uuid import uuid4

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from forjd.client import ForjdClient, ForjdError

logger = logging.getLogger("forjd.sealed_telemetry")

_GCM_NONCE_BYTES: Final[int] = 12
_AES_KEY_BYTES: Final[int] = 32
_SESSION_ID: Final[str] = "deml-platform-heartbeat"
# Rotate among routing tags so partner charts (region / status / component) fill.
_REGIONS: Final[tuple[str, ...]] = ("iad", "ord", "sjc", "lhr", "ams")
_COMPONENTS: Final[tuple[str, ...]] = (
  "analytics.overview",
  "ingest.sealed",
  "status.pages",
  "ml.scores",
  "exports.create",
)
_STATUS_LABELS: Final[tuple[str, ...]] = ("2xx", "2xx", "2xx", "2xx", "4xx", "5xx")


# --- AES-256-GCM seal (client-side; FORJD never opens) ---
def seal_bytes(
  plaintext: bytes,
  *,
  key: bytes,
  key_id: str,
  tenant_id: str,
  client_event_id: str,
) -> dict[str, str]:
  if len(key) != _AES_KEY_BYTES:
    raise ValueError("AES-256 key must be 32 bytes")
  nonce = os.urandom(_GCM_NONCE_BYTES)
  aad = f"{tenant_id}|{client_event_id}".encode()
  ciphertext = AESGCM(key).encrypt(nonce, plaintext, aad)
  return {
    "algo": "aes-256-gcm",
    "key_id": key_id,
    "nonce": base64.b64encode(nonce).decode("ascii"),
    "ciphertext": base64.b64encode(ciphertext).decode("ascii"),
    "ciphertext_sha256": hashlib.sha256(ciphertext).hexdigest(),
  }


def _platform_client() -> ForjdClient:
  """Bound client from Fly/env platform credentials (not per-account sealed refs)."""
  return ForjdClient()


async def _ensure_session(client: ForjdClient, *, session_id: str) -> None:
  from cryptography.hazmat.primitives import serialization
  from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey

  identity_pub = (
    X25519PrivateKey.generate()
    .public_key()
    .public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
  )
  await client.request_json(
    "POST",
    "/api/v1/sessions",
    payload={
      "tenant_id": client.tenant_id,
      "session_id": session_id,
      "identity_public_key": base64.b64encode(identity_pub).decode("ascii"),
    },
  )


async def send_heartbeat_batch(*, count: int = 6) -> dict[str, Any]:
  """Seal and ingest a small platform batch; returns accepted/failed counts."""
  client = _platform_client()
  key = secrets.token_bytes(_AES_KEY_BYTES)
  session_id = _SESSION_ID
  await _ensure_session(client, session_id=session_id)

  accepted = 0
  failed = 0
  for index in range(max(1, min(count, 25))):
    event_id = f"deml-hb-{uuid4()}"
    region = _REGIONS[index % len(_REGIONS)]
    component = _COMPONENTS[index % len(_COMPONENTS)]
    label = _STATUS_LABELS[index % len(_STATUS_LABELS)]
    plaintext = (f'{{"kind":"deml.platform_heartbeat","seq":{index},"ts":{time.time()}}}').encode()
    envelope = seal_bytes(
      plaintext,
      key=key,
      key_id=session_id,
      tenant_id=client.tenant_id,
      client_event_id=event_id,
    )
    body = {
      "tenant_id": client.tenant_id,
      "client_event_id": event_id,
      "content_type": "application/forjd-telemetry+v1",
      "event_type": "threat.metric",
      "workflow_id": "threat_telemetry",
      "encryption": {"mode": "e2ee", "algo": "aes-256-gcm"},
      "envelope": envelope,
      "metadata": {
        "source": "deml-heartbeat",
        "product": "deml",
        "region": region,
        "component": component,
        "label": label,
        "channel": "platform",
        "env": "production",
      },
    }
    try:
      result = await client.ingest(body)
      if result.get("ok") or result.get("event_id") or result.get("accepted"):
        accepted += 1
      else:
        failed += 1
    except ForjdError as exc:
      failed += 1
      logger.warning("sealed heartbeat ingest failed status=%s", exc.status)
  return {"ok": failed == 0, "accepted": accepted, "failed": failed, "sent": accepted + failed}
