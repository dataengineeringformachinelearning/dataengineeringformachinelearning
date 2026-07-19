"""FORJD write/read mode helpers for the DEML BFF.

Steady-state production uses ``FORJD_WRITE_MODE=forjd`` and
``FORJD_READ_MODE=forjd``. Optional ``FORJD_CUTOVER_PHASE`` presets:

| Phase | Write | Read | Intent |
|-------|-------|------|--------|
| 0 | dual | off | FORJD writes + metadata shadow; Angular reads empty-stable |
| 1 | dual | dual | Dual-write; Angular reads FORJD (empty fallback on 5xx) |
| 2 | forjd | forjd | FORJD-only (production default) |
| 3 | forjd | forjd | Same as 2 |

See ``docs/FORJD_INTEGRATION.md``.
"""

from __future__ import annotations

import logging
from typing import Any, Final, Literal

from django.conf import settings

logger = logging.getLogger("forjd.modes")

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

# GET adapters that may return empty envelopes only in explicit off/dual modes.
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
    "/api/v1/soc/cases",
    "/api/v1/playbooks",
    "/api/v1/playbooks/runs",
    "/api/v1/siem/signals",
    "/api/v1/vulnerabilities",
    "/api/v1/exports",
    "/api/v1/ml/scores",
    "/api/v1/compliance/soc",
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
  """Empty envelopes when reads are off, or dual-read outage fallback."""
  return read_mode() in {"off", "dual"}


def required_contract_version() -> str:
  """Headless API contract DEML expects before declaring FORJD compatible."""
  return str(getattr(settings, "FORJD_REQUIRED_CONTRACT_VERSION", "1.0") or "1.0").strip()


def contract_version_is_compatible(received: object) -> bool:
  return str(received or "").strip() == required_contract_version()


def is_read_fallback_path(target_path: str) -> bool:
  return target_path.rstrip("/") in _READ_FALLBACK_PATHS or target_path in _READ_FALLBACK_PATHS


def empty_read_envelope(target_path: str) -> dict[str, Any]:
  """Stable JSON shapes for Angular list adapters when FORJD is skipped/down."""
  path = target_path.rstrip("/")
  base = {
    "source": "deml_forjd_fallback",
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
  if path.endswith("/cases"):
    return {**base, "ok": True, "cases": [], "items": []}
  if path.endswith("/playbooks"):
    return {**base, "ok": True, "playbooks": [], "items": []}
  if path.endswith("/playbooks/runs"):
    return {**base, "ok": True, "runs": [], "items": []}
  if path.endswith("/signals"):
    return {**base, "ok": True, "signals": [], "items": []}
  if path.endswith("/vulnerabilities"):
    return {**base, "ok": True, "vulnerabilities": [], "items": []}
  if path.endswith("/exports"):
    return {**base, "ok": True, "jobs": [], "items": []}
  if path.endswith("/scores"):
    return {**base, "ok": True, "scores": [], "items": []}
  if path.endswith("/soc"):
    return {**base, "ok": False, "status": "unavailable", "items": []}
  return {**base, "items": [], "results": []}


def log_forjd_mode_event(event: str, **fields: object) -> None:
  logger.info("forjd_mode event=%s %s", event, " ".join(f"{k}={v}" for k, v in fields.items()))
