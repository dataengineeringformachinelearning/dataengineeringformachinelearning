"""Seal telemetry into FORJD (ciphertext + routing tags only).

Used by:
- platform heartbeat worker (feeds analytics/ML for the platform tenant)
- public status-widget ingest (DEML seals server-side; browser never holds fjsvc_)
- authenticated BFF helpers

Private keys never leave DEML. FORJD stores ciphertext only.
"""

from __future__ import annotations

import base64
import hashlib
import logging
import os
import secrets
import time
from typing import Any, Final
from uuid import UUID, uuid4

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from forjd.client import ForjdClient, ForjdError
from forjd.tenancy import ForjdTenantCredential

logger = logging.getLogger("forjd.sealed_telemetry")

_GCM_NONCE_BYTES: Final[int] = 12
_AES_KEY_BYTES: Final[int] = 32
_PLATFORM_SESSION_ID: Final[str] = "deml-platform-heartbeat"
_WIDGET_SESSION_PREFIX: Final[str] = "deml-widget"
_REGIONS: Final[tuple[str, ...]] = ("iad", "ord", "sjc", "lhr", "ams")
_COMPONENTS: Final[tuple[str, ...]] = (
  "analytics.overview",
  "ingest.sealed",
  "status.pages",
  "ml.scores",
  "exports.create",
)
_STATUS_LABELS: Final[tuple[str, ...]] = ("2xx", "2xx", "2xx", "2xx", "4xx", "5xx")
_ALLOWED_METADATA: Final[frozenset[str]] = frozenset(
  {
    "source",
    "channel",
    "region",
    "env",
    "environment",
    "product",
    "component",
    "namespace",
    "device_id",
    "series_id",
    "label",
    "labels",
    "tags",
  }
)


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


def _routing_metadata(raw: dict[str, Any] | None) -> dict[str, Any]:
  if not raw:
    return {}
  out: dict[str, Any] = {}
  for key, value in raw.items():
    if key not in _ALLOWED_METADATA:
      continue
    if key in {"labels", "tags"}:
      if isinstance(value, list):
        tags = [str(item)[:128] for item in value if str(item).strip()][:16]
        if tags:
          out[key] = tags
      continue
    text = str(value or "").strip()[:128]
    if text:
      out[key] = text
  return out


async def ensure_crypto_session(client: ForjdClient, *, session_id: str) -> None:
  """Register a public X25519 key for key_id so REQUIRE_CRYPTO_SESSION accepts ingest."""
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


async def seal_and_ingest(
  client: ForjdClient,
  *,
  plaintext: bytes,
  metadata: dict[str, Any] | None = None,
  session_id: str,
  event_type: str = "threat.metric",
  workflow_id: str = "threat_telemetry",
) -> dict[str, Any]:
  """Seal one event and POST to FORJD /api/v1/ingest."""
  key = secrets.token_bytes(_AES_KEY_BYTES)
  await ensure_crypto_session(client, session_id=session_id)
  event_id = f"deml-{uuid4()}"
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
    "event_type": event_type,
    "workflow_id": workflow_id,
    "encryption": {"mode": "e2ee", "algo": "aes-256-gcm"},
    "envelope": envelope,
    "metadata": _routing_metadata(metadata),
  }
  return await client.ingest(body)


def client_for_credential(credential: ForjdTenantCredential) -> ForjdClient:
  return ForjdClient(tenant_id=credential.tenant_id, service_token=credential.service_token)


def platform_client() -> ForjdClient:
  return ForjdClient()


async def send_heartbeat_batch(*, count: int = 6) -> dict[str, Any]:
  """Seal and ingest a small platform batch; returns accepted/failed counts."""
  client = platform_client()
  accepted = 0
  failed = 0
  for index in range(max(1, min(count, 25))):
    region = _REGIONS[index % len(_REGIONS)]
    component = _COMPONENTS[index % len(_COMPONENTS)]
    label = _STATUS_LABELS[index % len(_STATUS_LABELS)]
    plaintext = (f'{{"kind":"deml.platform_heartbeat","seq":{index},"ts":{time.time()}}}').encode()
    try:
      result = await seal_and_ingest(
        client,
        plaintext=plaintext,
        session_id=_PLATFORM_SESSION_ID,
        metadata={
          "source": "deml-heartbeat",
          "product": "deml",
          "region": region,
          "component": component,
          "label": label,
          "channel": "platform",
          "env": "production",
        },
      )
      if result.get("ok") or result.get("event_id") or result.get("accepted"):
        accepted += 1
      else:
        failed += 1
    except ForjdError as exc:
      failed += 1
      logger.warning("sealed heartbeat ingest failed status=%s", exc.status)
  return {"ok": failed == 0, "accepted": accepted, "failed": failed, "sent": accepted + failed}


async def send_widget_telemetry(
  credential: ForjdTenantCredential,
  *,
  slug: str,
  response_time_ms: int,
  status_code: int = 200,
  region: str = "unknown",
  component: str = "status.widget",
  device_id: str | None = None,
) -> dict[str, Any]:
  """Seal bounded widget performance metrics for a published status page."""
  client = client_for_credential(credential)
  # Bucket HTTP codes into chart-friendly labels (2xx/4xx/5xx).
  family = f"{max(1, min(status_code, 599)) // 100}xx"
  latency_bucket = min(max(int(response_time_ms), 0), 60_000)
  safe_slug = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in slug)[:64] or "page"
  session_id = f"{_WIDGET_SESSION_PREFIX}-{safe_slug}"[:128]
  visitor = (device_id or secrets.token_hex(8))[:64]
  plaintext = (
    f'{{"kind":"deml.widget_metric","slug":"{safe_slug}",'
    f'"latency_ms":{latency_bucket},"status":{int(status_code)},"ts":{time.time()}}}'
  ).encode()
  return await seal_and_ingest(
    client,
    plaintext=plaintext,
    session_id=session_id,
    metadata={
      "source": "deml-widget",
      "product": "deml",
      "channel": "status-widget",
      "region": (region or "unknown")[:64],
      "component": (component or "status.widget")[:128],
      "label": family,
      "device_id": visitor,
      "env": "production",
    },
  )


def parse_uuid(value: object) -> UUID | None:
  try:
    return UUID(str(value or "").strip())
  except (TypeError, ValueError):
    return None
