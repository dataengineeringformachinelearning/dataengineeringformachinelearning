"""TLS secret materialization helpers for clients that require filesystem paths."""

from __future__ import annotations

import base64
import binascii
import os
import tempfile
from pathlib import Path
from typing import Final

_MATERIALIZED_FILES: Final[dict[str, str]] = {}


def materialize_tls_file(path_env: str, base64_env: str | None = None) -> str | None:
  """Resolve a PEM file path or securely materialize its base64 environment value."""
  path = (os.getenv(path_env) or "").strip()
  if path:
    if not Path(path).is_file():
      raise RuntimeError(f"{path_env} does not point to a readable file")
    return path

  encoded_name = base64_env or f"{path_env}_B64"
  encoded = (os.getenv(encoded_name) or "").strip()
  if not encoded:
    return None
  cache_key = f"{encoded_name}:{encoded}"
  if cache_key in _MATERIALIZED_FILES:
    return _MATERIALIZED_FILES[cache_key]
  try:
    value = base64.b64decode(encoded, validate=True)
  except (ValueError, binascii.Error) as exc:
    raise RuntimeError(f"{encoded_name} must be valid base64") from exc
  handle = tempfile.NamedTemporaryFile(prefix="deml-tls-", delete=False)
  try:
    handle.write(value)
    handle.flush()
    os.chmod(handle.name, 0o600)
  finally:
    handle.close()
  _MATERIALIZED_FILES[cache_key] = handle.name
  return handle.name
