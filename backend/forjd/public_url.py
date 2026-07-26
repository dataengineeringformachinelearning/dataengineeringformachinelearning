"""SSRF-safe public URL validation for BFF-forwarded probe/export targets."""

from __future__ import annotations

import ipaddress
import socket
from typing import Final
from urllib.parse import urlsplit

_ALLOWED_SCHEMES: Final[frozenset[str]] = frozenset({"https"})
_ALLOWED_DEBUG_SCHEMES: Final[frozenset[str]] = frozenset({"http", "https"})
_MAX_URL_LENGTH: Final[int] = 2048


def validate_public_https_url(raw: str, *, allow_http_loopback: bool = False) -> str:
  """Return a normalized public URL or raise ValueError.

  Rejects credentials, non-http(s) schemes, private/link-local/reserved
  resolutions, and oversized inputs. Production callers should keep
  ``allow_http_loopback=False``.
  """
  candidate = (raw or "").strip()
  if not candidate:
    raise ValueError("url is required")
  if len(candidate) > _MAX_URL_LENGTH:
    raise ValueError("url exceeds maximum length")

  parsed = urlsplit(candidate)
  scheme = (parsed.scheme or "").lower()
  allowed = _ALLOWED_DEBUG_SCHEMES if allow_http_loopback else _ALLOWED_SCHEMES
  if scheme not in allowed:
    raise ValueError("url must use https")
  if parsed.username or parsed.password:
    raise ValueError("url cannot contain credentials")
  host = (parsed.hostname or "").strip().lower().rstrip(".")
  if not host:
    raise ValueError("url requires a hostname")
  if parsed.port is not None and parsed.port not in {80, 443}:
    raise ValueError("url port is not allowed")

  try:
    host = host.encode("idna").decode("ascii")
  except UnicodeError as exc:
    raise ValueError("url hostname is not valid IDNA") from exc

  loopback_hosts = {"localhost", "127.0.0.1", "::1"}
  if host in loopback_hosts:
    if not allow_http_loopback:
      raise ValueError("url resolves to a non-public address")
    return candidate

  try:
    literal = ipaddress.ip_address(host)
  except ValueError:
    literal = None
  if literal is not None:
    if not literal.is_global:
      raise ValueError("url resolves to a non-public address")
    return candidate

  try:
    records = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
  except socket.gaierror as exc:
    raise ValueError("url hostname could not be resolved") from exc
  addresses = {ipaddress.ip_address(record[4][0]) for record in records}
  if not addresses:
    raise ValueError("url hostname resolved without an address")
  if any(not address.is_global for address in addresses):
    raise ValueError("url resolves to a non-public address")
  return candidate
