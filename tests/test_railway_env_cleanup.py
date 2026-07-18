from __future__ import annotations

import importlib.util
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest


def _load_cleanup_module() -> ModuleType:
  module_path = Path(__file__).resolve().parents[1] / "scripts" / "railway_env_cleanup.py"
  spec = importlib.util.spec_from_file_location("railway_env_cleanup", module_path)
  if spec is None or spec.loader is None:
    raise RuntimeError(f"Unable to load {module_path}")
  module = importlib.util.module_from_spec(spec)
  spec.loader.exec_module(module)
  return module


railway_env_cleanup = _load_cleanup_module()


def test_user_control_plane_keeps_full_runtime_environment(
  monkeypatch: pytest.MonkeyPatch,
) -> None:
  variables: dict[str, str] = {
    "DATABASE_URL": "postgresql://example.invalid/deml",
    "FORJD_SERVICE_TOKEN_CUSTOMER_A": "fjsvc_deadbeef_customer-secret",
    "PGHOST": "retired-plugin.internal",
  }
  monkeypatch.setattr(railway_env_cleanup, "_railway_vars", lambda _service: variables)

  service_config: dict[str, Any] = {
    "class": "django-user-control-plane",
    "requiredEnv": ["DATABASE_URL", "FORJD_API_URL"],
  }
  candidates, deleted = railway_env_cleanup.cleanup_service(
    "deml-backend",
    service_config,
    dry_run=True,
  )

  assert candidates == 1
  assert deleted == 1
