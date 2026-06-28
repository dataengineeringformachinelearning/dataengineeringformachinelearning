"""Tests for centralized environment helpers."""

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


def test_validate_site_urls_rejects_missing(monkeypatch):
  for name in ("FRONTEND_URL", "BACKEND_URL", "MARKETING_URL"):
    monkeypatch.delenv(name, raising=False)
  with pytest.raises(RuntimeError, match="Missing required environment variable"):
    env.validate_site_urls()


def test_validate_site_urls_accepts_trio(monkeypatch):
  monkeypatch.setenv("FRONTEND_URL", "https://deml.app")
  monkeypatch.setenv("BACKEND_URL", "https://backend.deml.app")
  monkeypatch.setenv("MARKETING_URL", "https://dataengineeringformachinelearning.com")
  env.validate_site_urls()
