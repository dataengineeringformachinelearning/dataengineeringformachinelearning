"""Small authenticated ClickHouse HTTP client for archival writes and DDL.

The production URI may use ClickHouse's native-style ``clickhouse://`` scheme,
but archival operations use the HTTP interface so they do not depend on a
database adapter or expose credentials in query strings.
"""

from __future__ import annotations

import base64
import json
import urllib.request
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, datetime
from functools import lru_cache
from typing import Any, Final
from urllib.parse import parse_qs, unquote, urlencode, urlparse, urlunparse

from utils.env import clickhouse_uri

_ALLOWED_ARCHIVE_TABLES: Final[frozenset[str]] = frozenset(
  {"audit_archive", "security_events", "asset_vulnerability_ledger"}
)

_RETENTION_TABLE_DDL: Final[tuple[str, ...]] = (
  """
  CREATE TABLE IF NOT EXISTS audit_archive (
    audit_id String,
    timestamp DateTime64(6, 'UTC'),
    action LowCardinality(String),
    resource_id String,
    user_id UInt64,
    ip_address String,
    user_agent String,
    details_json String
  ) ENGINE = ReplacingMergeTree
  PARTITION BY toYYYYMM(timestamp)
  ORDER BY (audit_id, timestamp)
  TTL timestamp + INTERVAL 180 DAY DELETE
  """,
  """
  CREATE TABLE IF NOT EXISTS security_events (
    event_id String,
    timestamp DateTime64(6, 'UTC'),
    event_type LowCardinality(String),
    source LowCardinality(String),
    severity LowCardinality(String),
    account_id String,
    user_id UInt64,
    correlation_id String,
    raw_json_text String
  ) ENGINE = MergeTree
  PARTITION BY toYYYYMM(timestamp)
  ORDER BY (timestamp, event_id)
  TTL timestamp + INTERVAL 365 DAY DELETE
  """,
  """
  CREATE TABLE IF NOT EXISTS asset_vulnerability_ledger (
    timestamp DateTime64(6, 'UTC'),
    account_id String,
    url Nullable(String),
    tech_name Nullable(String),
    version Nullable(String),
    cpe_2_3 Nullable(String),
    cve_id String,
    cvss_score Nullable(Float64),
    description Nullable(String),
    remediation Nullable(String)
  ) ENGINE = MergeTree
  PARTITION BY toYYYYMM(timestamp)
  ORDER BY (account_id, timestamp, cve_id)
  TTL timestamp + INTERVAL 730 DAY DELETE
  """,
  "ALTER TABLE audit_archive ADD COLUMN IF NOT EXISTS user_agent String DEFAULT ''",
  "ALTER TABLE audit_archive ADD COLUMN IF NOT EXISTS details_json String DEFAULT ''",
  "ALTER TABLE security_events ADD COLUMN IF NOT EXISTS raw_json_text String DEFAULT ''",
  """ALTER TABLE asset_vulnerability_ledger
     ADD COLUMN IF NOT EXISTS timestamp DateTime64(6, 'UTC')
     DEFAULT toDateTime64('2026-07-15 00:00:00', 6, 'UTC')""",
  "ALTER TABLE audit_archive MODIFY TTL timestamp + INTERVAL 180 DAY DELETE",
  "ALTER TABLE security_events MODIFY TTL timestamp + INTERVAL 365 DAY DELETE",
  """ALTER TABLE asset_vulnerability_ledger
     MODIFY TTL timestamp + INTERVAL 730 DAY DELETE""",
)


@dataclass(frozen=True)
class ClickHouseHttpEndpoint:
  """Credential-separated ClickHouse HTTP endpoint."""

  url: str
  database: str
  username: str
  password: str


def parse_clickhouse_http_endpoint(raw_uri: str) -> ClickHouseHttpEndpoint:
  """Normalize native/HTTP ClickHouse URIs to the HTTP query interface."""
  parsed = urlparse(raw_uri)
  scheme_map = {
    "clickhouse": "http",
    "clickhouses": "https",
    "http": "http",
    "https": "https",
  }
  http_scheme = scheme_map.get(parsed.scheme.lower())
  if http_scheme is None or not parsed.hostname:
    raise ValueError("ClickHouse URI must use clickhouse, clickhouses, http, or https")

  port = parsed.port
  if parsed.scheme.lower() == "clickhouse" and port in {None, 9000}:
    port = 8123
  elif parsed.scheme.lower() == "clickhouses" and port in {None, 9440}:
    port = 8443
  host = parsed.hostname
  if ":" in host and not host.startswith("["):
    host = f"[{host}]"
  netloc = f"{host}:{port}" if port is not None else host

  query = parse_qs(parsed.query)
  database = (query.get("database") or [parsed.path.strip("/") or "default"])[0]
  return ClickHouseHttpEndpoint(
    url=urlunparse((http_scheme, netloc, "/", "", "", "")),
    database=database,
    username=unquote(parsed.username or ""),
    password=unquote(parsed.password or ""),
  )


def execute_clickhouse_http(
  query: str,
  *,
  body: bytes = b"",
  uri: str | None = None,
  timeout: float = 30.0,
) -> None:
  """Execute one ClickHouse query and raise when it is not acknowledged."""
  endpoint = parse_clickhouse_http_endpoint(uri or clickhouse_uri())
  params = urlencode(
    {
      "query": query,
      "database": endpoint.database,
      "date_time_input_format": "best_effort",
      "input_format_defaults_for_omitted_fields": "1",
      "default_week_start": "0",
    }
  )
  headers = {"Content-Type": "application/x-ndjson"}
  if endpoint.username:
    credentials = base64.b64encode(f"{endpoint.username}:{endpoint.password}".encode()).decode(
      "ascii"
    )
    headers["Authorization"] = f"Basic {credentials}"
  request = urllib.request.Request(
    f"{endpoint.url}?{params}",
    data=body,
    headers=headers,
    method="POST",
  )
  # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
  with urllib.request.urlopen(request, timeout=timeout) as response:
    if response.status < 200 or response.status >= 300:
      raise RuntimeError(f"ClickHouse query failed with HTTP {response.status}")


@lru_cache(maxsize=8)
def _ensure_retention_tables(uri: str) -> None:
  for statement in _RETENTION_TABLE_DDL:
    execute_clickhouse_http(statement, uri=uri)


def ensure_retention_tables(*, uri: str | None = None) -> None:
  """Create archival tables once per process; failed attempts are not cached."""
  _ensure_retention_tables(uri or clickhouse_uri())


def _json_default(value: Any) -> str:
  if isinstance(value, datetime | date):
    return value.isoformat()
  return str(value)


def insert_json_each_row(
  table: str,
  rows: Iterable[dict[str, Any]],
  *,
  uri: str | None = None,
) -> None:
  """Insert named JSON rows into an allowlisted archival table."""
  if table not in _ALLOWED_ARCHIVE_TABLES:
    raise ValueError(f"ClickHouse archival table is not allowlisted: {table}")
  materialized = list(rows)
  if not materialized:
    return
  resolved_uri = uri or clickhouse_uri()
  ensure_retention_tables(uri=resolved_uri)
  payload = "\n".join(
    json.dumps(row, sort_keys=True, default=_json_default, separators=(",", ":"))
    for row in materialized
  ).encode("utf-8")
  execute_clickhouse_http(
    f"INSERT INTO {table} FORMAT JSONEachRow",
    body=payload,
    uri=resolved_uri,
  )
