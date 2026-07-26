from __future__ import annotations

import pytest

from forjd.public_url import validate_public_https_url


def test_rejects_private_and_credentialed_urls() -> None:
  with pytest.raises(ValueError):
    validate_public_https_url("http://example.com")
  with pytest.raises(ValueError):
    validate_public_https_url("https://user:pass@example.com")
  with pytest.raises(ValueError):
    validate_public_https_url("https://127.0.0.1/admin")
  with pytest.raises(ValueError):
    validate_public_https_url("https://169.254.169.254/latest/meta-data")


def test_accepts_public_https(monkeypatch: pytest.MonkeyPatch) -> None:
  import ipaddress
  import socket

  monkeypatch.setattr(
    socket,
    "getaddrinfo",
    lambda *args, **kwargs: [
      (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 0)),
    ],
  )
  assert validate_public_https_url("https://example.com/status") == "https://example.com/status"
  assert ipaddress.ip_address("93.184.216.34").is_global
