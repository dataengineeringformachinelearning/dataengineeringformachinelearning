"""Fly/Railway/Docker entrypoint — migrate then serve ASGI (Daphne)."""

from __future__ import annotations

import os
import subprocess
import sys


def main() -> None:
  # Prefer the virtualenv's python binary to avoid resolving symlinks to the system python
  python_bin = "/opt/venv/bin/python"
  if not os.path.exists(python_bin):
    python_bin = sys.executable

  # --- Boot diagnostics (no secrets) ---
  app = os.getenv("FLY_APP_NAME") or os.getenv("RAILWAY_SERVICE_NAME") or "local"
  forjd = (os.getenv("FORJD_API_URL") or "").rstrip("/") or "(unset)"
  print(f"deml-backend boot host={app} forjd={forjd}", flush=True)

  # Run migrations (idempotent; safe on single-machine PaaS)
  print("Running migrations...", flush=True)
  subprocess.run([python_bin, "manage.py", "migrate", "--noinput"], check=True)

  # Start Daphne ASGI server (Channels/WebSocket-capable)
  print("Starting Daphne ASGI server...", flush=True)
  # Fly sets PORT=8080 via fly.toml; Railway may inject PORT=8000.
  port = os.getenv("PORT", "8080" if os.getenv("FLY_APP_NAME") else "8000")

  daphne_args = [
    "-b",
    "0.0.0.0",
    "-b",
    "::",
    "-p",
    port,
    "config.asgi:application",
  ]  # — intentional container bind (dual-stack IPv4/IPv6 support)

  # Prefer venv daphne binary; fall back to python -m daphne (distroless-safe).
  daphne_bin = "/opt/venv/bin/daphne"
  if os.path.exists(daphne_bin):
    subprocess.run([daphne_bin, *daphne_args], check=True)
  else:
    subprocess.run([python_bin, "-m", "daphne", *daphne_args], check=True)


if __name__ == "__main__":
  main()
