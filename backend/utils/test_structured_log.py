"""Tests for structured JSON logging helpers."""

import json
import logging

from utils.structured_log import (
  StructuredJsonFormatter,
  get_correlation_id,
  log_event,
  set_correlation_id,
)


def test_correlation_id_context():
  set_correlation_id("test-corr-123")
  assert get_correlation_id() == "test-corr-123"


def test_log_event_emits_json(caplog):
  logger = logging.getLogger("test.structured")
  set_correlation_id("corr-abc")
  with caplog.at_level(logging.INFO, logger="test.structured"):
    log_event(logger, logging.INFO, "unit_test_event", foo="bar", count=1)

  assert len(caplog.records) == 1
  payload = json.loads(caplog.records[0].message)
  assert payload["event"] == "unit_test_event"
  assert payload["correlation_id"] == "corr-abc"
  assert payload["foo"] == "bar"
  assert payload["count"] == 1


def test_structured_json_formatter():
  set_correlation_id("fmt-test")
  formatter = StructuredJsonFormatter()
  record = logging.LogRecord(
    name="test",
    level=logging.INFO,
    pathname="",
    lineno=0,
    msg="hello",
    args=(),
    exc_info=None,
  )
  output = json.loads(formatter.format(record))
  assert output["message"] == "hello"
  assert output["correlation_id"] == "fmt-test"
