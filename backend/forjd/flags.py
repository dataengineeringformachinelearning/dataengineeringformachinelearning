"""BFF cutover flags for FORJD-backed data-plane adapters.

Angular routes stay unchanged. These flags only affect Django's decision to
call FORJD versus fail closed. There is no local streaming fallback.
"""

from __future__ import annotations

from django.conf import settings


def read_from_forjd() -> bool:
  """When False, authenticated FORJD adapters return 503 (fail closed)."""
  return bool(getattr(settings, "FORJD_READ_FROM_FORJD", True))


def dual_write_enabled() -> bool:
  """Advisory flag for operators running a temporary dual-write bridge.

  Local DEML brokers/workers are retired. Dual-write, if used, must live in a
  separately deployed bridge — never by reintroducing Redpanda/ClickHouse here.
  """
  return bool(getattr(settings, "FORJD_DUAL_WRITE_ENABLED", False))
