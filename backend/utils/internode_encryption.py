"""Authenticated application-layer encryption for durable internode messages."""

from __future__ import annotations

import base64
import binascii
import json
import os
import re
import time
import uuid
from dataclasses import dataclass
from enum import StrEnum
from typing import Final

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from utils.env import is_production

ENVELOPE_TYPE: Final[str] = "deml-internode+jwe"
ENVELOPE_VERSION: Final[int] = 1
ALGORITHM: Final[str] = "dir"
CONTENT_ENCRYPTION: Final[str] = "A256GCM"
NONCE_BYTES: Final[int] = 12
KEY_BYTES: Final[int] = 32
MAX_CLOCK_SKEW_SECONDS: Final[int] = 300
_IDENTIFIER_RE: Final[re.Pattern[str]] = re.compile(r"^[A-Za-z0-9._:/-]{1,128}$")


class InternodeEncryptionError(ValueError):
  """Raised when internode encryption configuration or authentication fails."""


class InternodeEncryptionMode(StrEnum):
  DISABLED = "disabled"
  OPTIONAL = "optional"
  REQUIRED = "required"


@dataclass(frozen=True)
class InternodeKeyring:
  mode: InternodeEncryptionMode
  active_kid: str | None
  keys: dict[str, bytes]
  sender: str

  @property
  def can_encrypt(self) -> bool:
    return bool(self.active_kid and self.active_kid in self.keys)


def _b64url_encode(value: bytes) -> str:
  return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64url_decode(value: str) -> bytes:
  if not isinstance(value, str) or not value:
    raise InternodeEncryptionError("internode envelope contains invalid base64url data")
  try:
    return base64.b64decode(value + "=" * (-len(value) % 4), altchars=b"-_", validate=True)
  except (ValueError, binascii.Error) as exc:
    raise InternodeEncryptionError("internode envelope contains invalid base64url data") from exc


def _validate_identifier(name: str, value: str) -> str:
  if not _IDENTIFIER_RE.fullmatch(value):
    raise InternodeEncryptionError(f"{name} must match {_IDENTIFIER_RE.pattern}")
  return value


def _default_mode() -> InternodeEncryptionMode:
  return InternodeEncryptionMode.REQUIRED if is_production() else InternodeEncryptionMode.DISABLED


def load_keyring() -> InternodeKeyring:
  raw_mode = os.getenv("DEML_INTERNODE_ENCRYPTION", _default_mode().value).strip().lower()
  try:
    mode = InternodeEncryptionMode(raw_mode)
  except ValueError as exc:
    raise InternodeEncryptionError(
      "DEML_INTERNODE_ENCRYPTION must be disabled, optional, or required"
    ) from exc

  sender = _validate_identifier(
    "DEML_NODE_ID",
    (os.getenv("DEML_NODE_ID") or os.getenv("RAILWAY_SERVICE_NAME") or "deml-local").strip(),
  )
  active_kid = (os.getenv("DEML_INTERNODE_ACTIVE_KID") or "").strip() or None
  raw_keyring = (os.getenv("DEML_INTERNODE_KEYS") or "").strip()
  keys: dict[str, bytes] = {}
  if raw_keyring:
    try:
      parsed = json.loads(raw_keyring)
    except json.JSONDecodeError as exc:
      raise InternodeEncryptionError("DEML_INTERNODE_KEYS must be a JSON object") from exc
    if not isinstance(parsed, dict):
      raise InternodeEncryptionError("DEML_INTERNODE_KEYS must be a JSON object")
    for kid, encoded in parsed.items():
      if not isinstance(kid, str) or not isinstance(encoded, str):
        raise InternodeEncryptionError("internode key identifiers and values must be strings")
      validated_kid = _validate_identifier("internode kid", kid)
      key = _b64url_decode(encoded)
      if len(key) != KEY_BYTES:
        raise InternodeEncryptionError(f"internode key {validated_kid!r} must decode to 32 bytes")
      keys[validated_kid] = key

  keyring = InternodeKeyring(mode=mode, active_kid=active_kid, keys=keys, sender=sender)
  if mode is InternodeEncryptionMode.REQUIRED and not keyring.can_encrypt:
    raise InternodeEncryptionError(
      "required internode encryption needs DEML_INTERNODE_ACTIVE_KID in DEML_INTERNODE_KEYS"
    )
  if active_kid and active_kid not in keys:
    raise InternodeEncryptionError("DEML_INTERNODE_ACTIVE_KID is not present in the keyring")
  return keyring


def _aad(*, kid: str, context: str, sender: str, issued_at: int, message_id: str) -> bytes:
  return "\n".join(
    (
      ENVELOPE_TYPE,
      str(ENVELOPE_VERSION),
      kid,
      ALGORITHM,
      CONTENT_ENCRYPTION,
      context,
      sender,
      str(issued_at),
      message_id,
    )
  ).encode("utf-8")


def encrypt_bytes(
  plaintext: bytes,
  *,
  context: str,
  keyring: InternodeKeyring | None = None,
  issued_at: int | None = None,
  message_id: str | None = None,
  nonce: bytes | None = None,
) -> bytes:
  """Encrypt bytes and return a UTF-8 JSON DEML Internode Envelope."""
  resolved = keyring or load_keyring()
  if resolved.mode is InternodeEncryptionMode.DISABLED:
    return plaintext
  if not resolved.can_encrypt:
    if resolved.mode is InternodeEncryptionMode.OPTIONAL:
      return plaintext
    raise InternodeEncryptionError("internode encryption has no active key")

  validated_context = _validate_identifier("internode context", context)
  kid = resolved.active_kid
  if kid is None:
    raise InternodeEncryptionError("internode encryption has no active kid")
  now = int(time.time()) if issued_at is None else issued_at
  jti = str(uuid.uuid4()) if message_id is None else str(uuid.UUID(message_id))
  iv = os.urandom(NONCE_BYTES) if nonce is None else nonce
  if len(iv) != NONCE_BYTES:
    raise InternodeEncryptionError("internode AES-GCM nonce must be 12 bytes")
  authenticated_data = _aad(
    kid=kid,
    context=validated_context,
    sender=resolved.sender,
    issued_at=now,
    message_id=jti,
  )
  ciphertext = AESGCM(resolved.keys[kid]).encrypt(iv, plaintext, authenticated_data)
  envelope = {
    "typ": ENVELOPE_TYPE,
    "v": ENVELOPE_VERSION,
    "kid": kid,
    "alg": ALGORITHM,
    "enc": CONTENT_ENCRYPTION,
    "ctx": validated_context,
    "sender": resolved.sender,
    "iat": now,
    "jti": jti,
    "nonce": _b64url_encode(iv),
    "ciphertext": _b64url_encode(ciphertext),
  }
  return json.dumps(envelope, sort_keys=True, separators=(",", ":")).encode("utf-8")


def decrypt_bytes(
  value: bytes,
  *,
  context: str,
  keyring: InternodeKeyring | None = None,
  now: int | None = None,
) -> bytes:
  """Authenticate and decrypt an internode envelope, enforcing downgrade policy."""
  resolved = keyring or load_keyring()
  if resolved.mode is InternodeEncryptionMode.DISABLED:
    return value
  try:
    envelope = json.loads(value)
  except (json.JSONDecodeError, UnicodeDecodeError):
    envelope = None
  if not isinstance(envelope, dict) or envelope.get("typ") != ENVELOPE_TYPE:
    if resolved.mode is InternodeEncryptionMode.OPTIONAL:
      return value
    raise InternodeEncryptionError("plaintext internode message rejected in required mode")

  required = ("v", "kid", "alg", "enc", "ctx", "sender", "iat", "jti", "nonce", "ciphertext")
  if any(field not in envelope for field in required):
    raise InternodeEncryptionError("internode envelope is missing protected fields")
  if envelope["v"] != ENVELOPE_VERSION or envelope["alg"] != ALGORITHM:
    raise InternodeEncryptionError("unsupported internode envelope algorithm or version")
  if envelope["enc"] != CONTENT_ENCRYPTION:
    raise InternodeEncryptionError("unsupported internode content encryption")
  validated_context = _validate_identifier("internode context", context)
  if envelope["ctx"] != validated_context:
    raise InternodeEncryptionError("internode envelope context mismatch")
  kid = _validate_identifier("internode kid", str(envelope["kid"]))
  sender = _validate_identifier("internode sender", str(envelope["sender"]))
  if kid not in resolved.keys:
    raise InternodeEncryptionError(f"internode key {kid!r} is not available")
  try:
    issued_at = int(envelope["iat"])
    message_id = str(uuid.UUID(str(envelope["jti"])))
  except (TypeError, ValueError) as exc:
    raise InternodeEncryptionError("internode envelope timestamp or message id is invalid") from exc
  current_time = int(time.time()) if now is None else now
  if issued_at > current_time + MAX_CLOCK_SKEW_SECONDS:
    raise InternodeEncryptionError("internode envelope timestamp is in the future")
  iv = _b64url_decode(envelope["nonce"])
  if len(iv) != NONCE_BYTES:
    raise InternodeEncryptionError("internode envelope nonce must be 12 bytes")
  ciphertext = _b64url_decode(envelope["ciphertext"])
  authenticated_data = _aad(
    kid=kid,
    context=validated_context,
    sender=sender,
    issued_at=issued_at,
    message_id=message_id,
  )
  try:
    return AESGCM(resolved.keys[kid]).decrypt(iv, ciphertext, authenticated_data)
  except Exception as exc:
    raise InternodeEncryptionError("internode envelope authentication failed") from exc


def encrypt_kafka_value(value: bytes, topic: str) -> bytes:
  return encrypt_bytes(value, context=f"kafka:{topic}")


def decrypt_kafka_value(value: bytes, topic: str) -> bytes:
  return decrypt_bytes(value, context=f"kafka:{topic}")
