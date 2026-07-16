"""Canonical security event stream for ClickHouse hunt plane."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from utils.clickhouse import insert_json_each_row
from utils.env import clickhouse_uri

logger = logging.getLogger(__name__)

CLICKHOUSE_URI = clickhouse_uri()


def write_security_event(
  *,
  event_type: str,
  source: str,
  severity: str,
  account_id: str | None = None,
  user_id: int | None = None,
  correlation_id: str | None = None,
  raw: dict[str, Any] | None = None,
) -> None:
  """Append one row to security_events (best-effort, never raises)."""
  try:
    row = {
      "event_id": str(uuid.uuid4()),
      "timestamp": datetime.now(timezone.utc),
      "event_type": event_type,
      "source": source,
      "severity": severity,
      "account_id": account_id or "",
      "user_id": user_id or 0,
      "correlation_id": correlation_id or "",
      "raw_json_text": json.dumps(raw or {}, sort_keys=True, default=str, separators=(",", ":")),
    }
    insert_json_each_row("security_events", [row], uri=CLICKHOUSE_URI)
  except Exception as exc:
    logger.debug("security_events write skipped: %s", exc)


def archive_audit_logs(logs: list[Any]) -> bool:
  """Archive audit logs to ClickHouse before Postgres purge.

  The caller must only delete the corresponding PostgreSQL IDs when this
  function returns ``True``.
  """
  if not logs:
    return True
  try:
    rows = [
      {
        "audit_id": str(log.id),
        "timestamp": log.timestamp,
        "action": log.action,
        "resource_id": log.resource_id or "",
        "user_id": log.user_id or 0,
        "ip_address": str(log.ip_address or ""),
        "user_agent": log.user_agent or "",
        "details_json": json.dumps(
          log.details or {}, sort_keys=True, default=str, separators=(",", ":")
        ),
      }
      for log in logs
    ]
    insert_json_each_row("audit_archive", rows, uri=CLICKHOUSE_URI)
    return True
  except Exception as exc:
    logger.warning("Audit archive to ClickHouse failed: %s", exc)
    return False
