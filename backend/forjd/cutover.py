"""Cutover phase flags for safe DEML → FORJD production transition.

Phases match ``docs/CUTOVER.md`` / FORJD ``CUTOVER.md``:

| Phase | Write | Read | Intent |
|-------|-------|------|--------|
| 0 | dual | off | Shadow + FORJD writes; Angular reads empty-stable shapes |
| 1 | dual | dual | Dual-write; Angular reads FORJD (empty fallback on 5xx) |
| 2 | forjd | forjd | FORJD-only (default after cutover) |
| 3 | forjd | forjd | Same as 2 — decommission complete |

Legacy Redpanda/ClickHouse writers are **not** reintroduced. Dual-write means
FORJD plus a metadata-only local shadow receipt for ops comparison.
"""

from __future__ import annotations

import logging
from typing import Any, Final, Literal

from django.conf import settings

logger = logging.getLogger("forjd.cutover")

WriteMode = Literal["off", "forjd", "dual"]
ReadMode = Literal["off", "forjd", "dual"]

_PHASE_PRESETS: Final[dict[str, tuple[WriteMode, ReadMode]]] = {
  "0": ("dual", "off"),
  "1": ("dual", "dual"),
  "2": ("forjd", "forjd"),
  "3": ("forjd", "forjd"),
}
_VALID_WRITE: Final[frozenset[str]] = frozenset({"off", "forjd", "dual"})
_VALID_READ: Final[frozenset[str]] = frozenset({"off", "forjd", "dual"})

# GET adapters that may return empty envelopes so Angular routes keep working.
_READ_FALLBACK_PATHS: Final[frozenset[str]] = frozenset(
  {
    "/api/v1/projections",
    "/api/v1/projections/checkpoints",
    "/api/v1/ingest/events",
    "/api/v1/ingest/results",
    "/api/v1/sessions",
    "/api/v1/replay/dlq",
    "/api/v1/status/pages",
    "/api/v1/analytics/overview",
  }
)


def write_mode() -> WriteMode:
  phase = str(getattr(settings, "FORJD_CUTOVER_PHASE", "") or "").strip()
  if phase in _PHASE_PRESETS:
    return _PHASE_PRESETS[phase][0]
  raw = str(getattr(settings, "FORJD_WRITE_MODE", "forjd") or "forjd").strip().lower()
  return raw if raw in _VALID_WRITE else "forjd"  # type: ignore[return-value]


def read_mode() -> ReadMode:
  phase = str(getattr(settings, "FORJD_CUTOVER_PHASE", "") or "").strip()
  if phase in _PHASE_PRESETS:
    return _PHASE_PRESETS[phase][1]
  raw = str(getattr(settings, "FORJD_READ_MODE", "forjd") or "forjd").strip().lower()
  return raw if raw in _VALID_READ else "forjd"  # type: ignore[return-value]


def writes_enabled() -> bool:
  return write_mode() != "off"


def shadow_writes_enabled() -> bool:
  return write_mode() == "dual"


def reads_from_forjd() -> bool:
  return read_mode() in {"forjd", "dual"}


def empty_read_fallback_enabled() -> bool:
  """Phase 0 (read off) or dual-read outage fallback."""
  return read_mode() in {"off", "dual"}


def is_read_fallback_path(target_path: str) -> bool:
  return target_path.rstrip("/") in _READ_FALLBACK_PATHS or target_path in _READ_FALLBACK_PATHS


def empty_read_envelope(target_path: str) -> dict[str, Any]:
  """Stable JSON shapes for Angular list adapters when FORJD is skipped/down."""
  path = target_path.rstrip("/")
  base = {
    "source": "deml_cutover_fallback",
    "code": "forjd_read_fallback",
    "path": path,
  }
  if path.endswith("/checkpoints"):
    return {**base, "checkpoints": [], "items": []}
  if path.endswith("/results"):
    return {**base, "results": [], "items": []}
  if path.endswith("/events"):
    return {**base, "events": [], "items": []}
  if path.endswith("/sessions"):
    return {**base, "ok": True, "sessions": [], "items": []}
  if path.endswith("/dlq"):
    return {**base, "ok": True, "items": []}
  if path.endswith("/pages"):
    return {**base, "ok": True, "pages": [], "items": []}
  if path.endswith("/overview"):
    return {**base, "ok": True, "items": []}
  return {**base, "items": [], "results": []}


def log_cutover_event(event: str, **fields: object) -> None:
  logger.info("forjd_cutover event=%s %s", event, " ".join(f"{k}={v}" for k, v in fields.items()))
