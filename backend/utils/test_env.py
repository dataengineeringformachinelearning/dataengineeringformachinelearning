"""Tests for centralized environment helpers."""

import os

import pytest

from utils import env


def test_get_str_strips_whitespace(monkeypatch):
  monkeypatch.setenv("TEST_VAR", "  hello  ")
  assert env.get_str("TEST_VAR") == "hello"


def test_get_bool_truthy_values(monkeypatch):
  for val in ("true", "True", "1", "yes", "on"):
    monkeypatch.setenv("FLAG", val)
    assert env.get_bool("FLAG") is True


def test_get_bool_default_when_unset(monkeypatch):
  monkeypatch.delenv("MISSING_FLAG", raising=False)
  assert env.get_bool("MISSING_FLAG", default=False) is False


def test_get_csv_splits_and_cleans(monkeypatch):
  monkeypatch.setenv("ORIGINS", " https://a.com , ,https://b.com ")
  assert env.get_csv("ORIGINS") == ["https://a.com", "https://b.com"]


def test_validate_production_config_allows_local_debug(monkeypatch):
  monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)
  monkeypatch.delenv("RAILWAY_SERVICE_NAME", raising=False)
  monkeypatch.setenv("DEBUG", "True")
  env.validate_production_config()  # should not raise


def test_validate_production_config_rejects_insecure_secret_on_railway(monkeypatch):
  monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")
  monkeypatch.setenv("DEBUG", "False")
  monkeypatch.setenv("SECRET_KEY", env._INSECURE_SECRET_KEY)
  with pytest.raises(RuntimeError, match="SECRET_KEY"):
    env.validate_production_config()


def test_validate_production_config_defaults_debug_false_on_railway(monkeypatch):
  """Railway injects RAILWAY_SERVICE_NAME; unset DEBUG must not crash boot."""
  monkeypatch.setenv("RAILWAY_SERVICE_NAME", "deml-relay")
  monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)
  monkeypatch.delenv("DEBUG", raising=False)
  monkeypatch.setenv("SECRET_KEY", "railway-test-secret-key")
  env.validate_production_config()
  assert os.getenv("DEBUG") == "False"


def test_validate_production_config_rejects_debug_true_on_railway(monkeypatch):
  monkeypatch.setenv("RAILWAY_SERVICE_NAME", "deml-backend")
  monkeypatch.setenv("DEBUG", "True")
  monkeypatch.setenv("SECRET_KEY", "railway-test-secret-key")
  with pytest.raises(RuntimeError, match="DEBUG must be False"):
    env.validate_production_config()


def test_tor_proxy_url_reads_env(monkeypatch):
  monkeypatch.setenv("TOR_PROXY_URL", "socks5h://localhost:9050")
  assert env.tor_proxy_url() == "socks5h://localhost:9050"
