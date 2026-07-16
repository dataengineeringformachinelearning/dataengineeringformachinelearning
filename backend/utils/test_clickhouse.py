from __future__ import annotations

import os
from unittest.mock import patch

import pytest

from utils.clickhouse import insert_json_each_row, parse_clickhouse_http_endpoint
from utils.env import clickhouse_uri


def _authenticated_uri(scheme: str, username: str, credential: str, host_path: str) -> str:
  return "".join((scheme, "://", username, ":", credential, "@", host_path))


def test_clickhouse_uri_supports_canonical_split_environment() -> None:
  credential = "credential/with spaces"
  with patch.dict(
    os.environ,
    {
      "CLICKHOUSE_HOST": "clickhouse.internal",
      "CLICKHOUSE_PORT": "8123",
      "CLICKHOUSE_USER": "report user",
      "CLICKHOUSE_PASSWORD": credential,
      "CLICKHOUSE_DB": "analytics",
    },
    clear=True,
  ):
    uri = clickhouse_uri()

  assert uri == _authenticated_uri(
    "clickhouse",
    "report%20user",
    "credential%2Fwith%20spaces",
    "clickhouse.internal:8123/analytics",
  )


def test_clickhouse_uri_prefers_explicit_override() -> None:
  override = _authenticated_uri("clickhouses", "user", "credential", "managed.example/warehouse")
  with patch.dict(
    os.environ,
    {
      "CLICKHOUSE_URI": override,
      "CLICKHOUSE_HOST": "ignored.internal",
    },
    clear=True,
  ):
    assert clickhouse_uri() == override


def test_parse_clickhouse_native_uri_for_authenticated_http() -> None:
  encoded_credential = "test%20credential"
  endpoint = parse_clickhouse_http_endpoint(
    _authenticated_uri(
      "clickhouse",
      "analytics",
      encoded_credential,
      "clickhouse.internal:9000/otel",
    )
  )

  assert endpoint.url == "http://clickhouse.internal:8123/"
  assert endpoint.database == "otel"
  assert endpoint.username == "analytics"
  assert endpoint.password == encoded_credential.replace("%20", " ")


def test_json_each_row_uses_allowlisted_table_and_initializes_schema() -> None:
  with (
    patch("utils.clickhouse.ensure_retention_tables") as ensure,
    patch("utils.clickhouse.execute_clickhouse_http") as execute,
  ):
    insert_json_each_row(
      "security_events",
      [{"event_id": "event-1", "raw_json_text": "{}"}],
      uri="clickhouse://clickhouse.internal/default",
    )

  ensure.assert_called_once_with(uri="clickhouse://clickhouse.internal/default")
  query = execute.call_args.args[0]
  assert query == "INSERT INTO security_events FORMAT JSONEachRow"
  assert b'"event_id":"event-1"' in execute.call_args.kwargs["body"]


def test_json_each_row_rejects_untrusted_table_name() -> None:
  with pytest.raises(ValueError, match="not allowlisted"):
    insert_json_each_row("security_events; DROP TABLE audit_archive", [{"id": "x"}])
