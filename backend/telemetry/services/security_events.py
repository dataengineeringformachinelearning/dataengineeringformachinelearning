"""Canonical security event stream for ClickHouse hunt plane."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import polars as pl
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
      "raw_json": raw or {},
    }
    df = pl.DataFrame([row])
    df.write_database(
      table_name="security_events",
      connection=CLICKHOUSE_URI,
      if_table_exists="append",
      engine="adbc",
    )
  except Exception as exc:
    logger.debug("security_events write skipped: %s", exc)


def archive_audit_logs(logs: list[Any]) -> None:
  """Archive audit logs to ClickHouse before Postgres purge."""
  if not logs:
    return
  try:
    rows = [
      {
        "audit_id": str(log.id),
        "timestamp": log.timestamp,
        "action": log.action,
        "resource_id": log.resource_id or "",
        "user_id": log.user_id or 0,
        "ip_address": str(log.ip_address or ""),
        "details": log.details or {},
      }
      for log in logs
    ]
    df = pl.DataFrame(rows)
    df.write_database(
      table_name="audit_archive",
      connection=CLICKHOUSE_URI,
      if_table_exists="append",
      engine="adbc",
    )
  except Exception as exc:
    logger.warning("Audit archive to ClickHouse failed: %s", exc)
