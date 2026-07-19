"""Fly/Railway/Docker entrypoint — migrate then serve ASGI (Daphne)."""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import time


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
  server_command: list[str]
  if os.path.exists(daphne_bin):
    server_command = [daphne_bin, *daphne_args]
  else:
    server_command = [python_bin, "-m", "daphne", *daphne_args]

  # Durable issue-report outbox delivery is part of the control-plane boundary.
  # FORJD's client_report_id contract makes overlapping machine retries safe.
  worker_command = [
    python_bin,
    "manage.py",
    "reconcile_forjd_reports",
    "--watch",
    "--interval",
    "30",
  ]
  server = subprocess.Popen(server_command)
  worker = subprocess.Popen(worker_command)
  children = (server, worker)

  def _shutdown(_signum: int, _frame: object) -> None:
    for child in children:
      if child.poll() is None:
        child.terminate()
    raise SystemExit(0)

  signal.signal(signal.SIGTERM, _shutdown)
  signal.signal(signal.SIGINT, _shutdown)
  try:
    while True:
      server_status = server.poll()
      worker_status = worker.poll()
      if server_status is not None or worker_status is not None:
        for child in children:
          if child.poll() is None:
            child.terminate()
        exit_code = server_status if server_status is not None else worker_status
        raise SystemExit(exit_code or 1)
      time.sleep(1)
  finally:
    for child in children:
      if child.poll() is None:
        child.terminate()


if __name__ == "__main__":
  main()
