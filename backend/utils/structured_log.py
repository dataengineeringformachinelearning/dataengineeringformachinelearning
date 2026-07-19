"""
Structured JSON logging with request correlation IDs.

API handlers log through the standard library; this module adds a
correlation_id context variable so log lines can be traced across the
Django control plane and outbound FORJD BFF calls without guessing.
"""

from __future__ import annotations

import json
import logging
from contextvars import ContextVar
from typing import Any

# Propagated by CorrelationIdMiddleware and worker message handlers.
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")


def set_correlation_id(value: str) -> None:
  """Bind a correlation ID for the current async/sync context."""
  correlation_id_var.set(value or "")


def get_correlation_id() -> str:
  return correlation_id_var.get("")


def log_event(logger: logging.Logger, level: int, event: str, **fields: Any) -> None:
  """
  Emit a single JSON log line. Prefer this in workers over stdout.write.

  Example:
    log_event(logger, logging.INFO, "forjd_proxy", path="/api/v1/projections", status=200)
  """
  payload = {
    "event": event,
    "correlation_id": get_correlation_id(),
    **{k: v for k, v in fields.items() if v is not None},
  }
  logger.log(level, json.dumps(payload, default=str))


class StructuredJsonFormatter(logging.Formatter):
  """Console formatter that outputs one JSON object per log record."""

  def format(self, record: logging.LogRecord) -> str:
    payload: dict[str, Any] = {
      "level": record.levelname,
      "logger": record.name,
      "message": record.getMessage(),
      "module": record.module,
      "correlation_id": get_correlation_id(),
    }
    if record.exc_info:
      payload["exception"] = self.formatException(record.exc_info)
    return json.dumps(payload, default=str)
