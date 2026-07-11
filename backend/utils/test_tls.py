from __future__ import annotations

import base64
import os
from pathlib import Path

import pytest

from utils.tls import materialize_tls_file


def test_materialize_tls_file_uses_private_permissions(monkeypatch: pytest.MonkeyPatch) -> None:
  monkeypatch.delenv("TEST_TLS_PATH", raising=False)
  monkeypatch.setenv("TEST_TLS_B64", base64.b64encode(b"test-pem").decode("ascii"))
  path = materialize_tls_file("TEST_TLS_PATH", "TEST_TLS_B64")
  assert path is not None
  assert Path(path).read_bytes() == b"test-pem"
  assert os.stat(path).st_mode & 0o777 == 0o600


def test_materialize_tls_file_rejects_invalid_base64(monkeypatch: pytest.MonkeyPatch) -> None:
  monkeypatch.delenv("INVALID_TLS_PATH", raising=False)
  monkeypatch.setenv("INVALID_TLS_B64", "not base64!")
  with pytest.raises(RuntimeError, match="valid base64"):
    materialize_tls_file("INVALID_TLS_PATH", "INVALID_TLS_B64")
