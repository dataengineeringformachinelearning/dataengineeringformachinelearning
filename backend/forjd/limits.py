"""Shared DEML-side limits for the canonical FORJD ingest contract."""

from __future__ import annotations

from typing import Final

MAX_INGEST_BATCH_EVENTS: Final[int] = 25
MAX_INGEST_BODY_BYTES: Final[int] = 8 * 1024 * 1024

INGEST_WRITE_PATHS: Final[frozenset[str]] = frozenset(
  {
    "/api/v1/ingest",
    "/api/v1/ingest/events",
    "/api/v1/ingest/events:batch",
    "/api/v1/forjd/ingest",
    "/api/v1/forjd/ingest/events:batch",
  }
)
