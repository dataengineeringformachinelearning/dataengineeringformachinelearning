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
  monkeypatch.setenv(
    "DATABASE_URL", "postgresql://user:pass@host:5432/db"
  )  # pragma: allowlist secret
  with pytest.raises(RuntimeError, match="SECRET_KEY"):
    env.validate_production_config()


def test_validate_production_config_defaults_debug_false_on_railway(monkeypatch):
  """Railway injects RAILWAY_SERVICE_NAME; unset DEBUG must not crash boot."""
  monkeypatch.setenv("RAILWAY_SERVICE_NAME", "deml-relay")
  monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)
  monkeypatch.delenv("DEBUG", raising=False)
  monkeypatch.setenv("SECRET_KEY", "railway-test-secret-key")
  monkeypatch.setenv(
    "DATABASE_URL",
    "postgresql://user:pass@host:5432/db?sslmode=verify-full",
  )
  monkeypatch.setenv("REDIS_URL", "rediss://user:pass@cache.example:6379")
  env.validate_production_config()
  assert os.getenv("DEBUG") == "False"


def test_validate_production_config_rejects_debug_true_on_railway(monkeypatch):
  monkeypatch.setenv("RAILWAY_SERVICE_NAME", "deml-backend")
  monkeypatch.setenv("DEBUG", "True")
  monkeypatch.setenv("SECRET_KEY", "railway-test-secret-key")
  monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@host:5432/db")
  with pytest.raises(RuntimeError, match="DEBUG must be False"):
    env.validate_production_config()


def test_validate_production_config_rejects_missing_database_url_on_railway(monkeypatch):
  monkeypatch.setenv("RAILWAY_SERVICE_NAME", "deml-backend")
  monkeypatch.setenv("DEBUG", "False")
  monkeypatch.setenv("SECRET_KEY", "railway-test-secret-key")
  monkeypatch.delenv("DATABASE_URL", raising=False)
  with pytest.raises(RuntimeError, match="DATABASE_URL must be set"):
    env.validate_production_config()


def test_validate_production_config_rejects_sqlite_on_railway(monkeypatch):
  monkeypatch.setenv("RAILWAY_SERVICE_NAME", "deml-backend")
  monkeypatch.setenv("DEBUG", "False")
  monkeypatch.setenv("SECRET_KEY", "railway-test-secret-key")
  monkeypatch.setenv("DATABASE_URL", "sqlite:////tmp/collectstatic.db")
  with pytest.raises(RuntimeError, match="SQLite is not supported"):
    env.validate_production_config()


def test_configure_database_url_falls_back_to_sqlite_locally(monkeypatch):
  monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)
  monkeypatch.delenv("RAILWAY_SERVICE_NAME", raising=False)
  monkeypatch.delenv("DATABASE_URL", raising=False)
  env.configure_database_url()
  assert os.getenv("DATABASE_URL", "").startswith("sqlite:///")


def test_configure_database_url_keeps_postgres_when_set(monkeypatch):
  monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)
  monkeypatch.delenv("RAILWAY_SERVICE_NAME", raising=False)
  monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@host:5432/db")
  env.configure_database_url()
  assert os.getenv("DATABASE_URL") == "postgresql://user:pass@host:5432/db"


def test_production_transport_rejects_plaintext_postgres(monkeypatch):
  monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")
  monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@host:5432/db")
  with pytest.raises(RuntimeError, match="sslmode"):
    env.validate_encrypted_transport_config()


def test_production_transport_rejects_plaintext_redis(monkeypatch):
  monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")
  monkeypatch.setenv(
    "DATABASE_URL",
    "postgresql://user:pass@host:5432/db?sslmode=verify-full",
  )
  monkeypatch.setenv("REDIS_URL", "redis://cache.internal:6379")
  with pytest.raises(RuntimeError, match="rediss"):
    env.validate_encrypted_transport_config()
