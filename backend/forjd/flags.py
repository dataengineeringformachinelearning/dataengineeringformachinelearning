"""Legacy BFF cutover flag aliases.

Prefer ``forjd.cutover`` (``FORJD_CUTOVER_PHASE`` / ``FORJD_*_MODE``). These
wrappers exist so older imports do not read unset settings.
"""

from __future__ import annotations

from forjd.cutover import reads_from_forjd, shadow_writes_enabled


def read_from_forjd() -> bool:
  """True when Angular adapters should read FORJD (phase 1-3)."""
  return reads_from_forjd()


def dual_write_enabled() -> bool:
  """True when sealed writes also record metadata-only shadow receipts."""
  return shadow_writes_enabled()
