"""Fly (primary) / Docker entrypoint — heal sequences, migrate, then serve ASGI (Daphne)."""

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

  # Heal serial defaults lost during schema restore (id=NULL on django_*/auth_* inserts).
  print("Ensuring Django system-table id sequences...", flush=True)
  subprocess.run(
    [
      python_bin,
      "manage.py",
      "shell",
      "-c",
      (
        "from django.db import connection\n"
        "with connection.cursor() as c:\n"
        '  c.execute("""\n'
        "  DO $$\n"
        "  DECLARE\n"
        "    r record;\n"
        "    seq_name text;\n"
        "    max_id bigint;\n"
        "  BEGIN\n"
        "    FOR r IN\n"
        "      SELECT c.table_schema, c.table_name\n"
        "      FROM information_schema.columns c\n"
        "      WHERE c.table_schema = ANY (current_schemas(false))\n"
        "        AND c.column_name = 'id'\n"
        "        AND c.data_type IN ('integer', 'bigint')\n"
        "        AND c.column_default IS NULL\n"
        "        AND (\n"
        "          c.table_name LIKE 'django_%'\n"
        "          OR c.table_name LIKE 'auth_%'\n"
        "        )\n"
        "    LOOP\n"
        "      seq_name := format('%I.%I_id_seq', r.table_schema, r.table_name);\n"
        "      EXECUTE format(\n"
        "        'CREATE SEQUENCE IF NOT EXISTS %s',\n"
        "        seq_name\n"
        "      );\n"
        "      EXECUTE format(\n"
        "        'SELECT COALESCE(MAX(id), 1) FROM %I.%I',\n"
        "        r.table_schema,\n"
        "        r.table_name\n"
        "      ) INTO max_id;\n"
        "      EXECUTE format('SELECT setval(%L, %s)', seq_name, GREATEST(max_id, 1));\n"
        "      EXECUTE format(\n"
        "        'ALTER TABLE %I.%I ALTER COLUMN id SET DEFAULT nextval(%L)',\n"
        "        r.table_schema,\n"
        "        r.table_name,\n"
        "        seq_name\n"
        "      );\n"
        "      BEGIN\n"
        "        EXECUTE format(\n"
        "          'ALTER SEQUENCE %s OWNED BY %I.%I.id',\n"
        "          seq_name,\n"
        "          r.table_schema,\n"
        "          r.table_name\n"
        "        );\n"
        "      EXCEPTION WHEN OTHERS THEN\n"
        "        NULL;\n"
        "      END;\n"
        "    END LOOP;\n"
        "  END $$;\n"
        '  """)\n'
        "print('django system id sequences ok')\n"
      ),
    ],
    check=False,
  )

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
  worker_restarts = 0

  def _shutdown(_signum: int, _frame: object) -> None:
    for child in (server, worker):
      if child.poll() is None:
        child.terminate()
    raise SystemExit(0)

  signal.signal(signal.SIGTERM, _shutdown)
  signal.signal(signal.SIGINT, _shutdown)
  try:
    while True:
      server_status = server.poll()
      if server_status is not None:
        if worker.poll() is None:
          worker.terminate()
        raise SystemExit(server_status or 1)
      # Report outbox is best-effort — keep Daphne up and restart the worker.
      if worker.poll() is not None:
        worker_restarts += 1
        print(
          f"report worker exited code={worker.returncode}; restart #{worker_restarts}",
          flush=True,
        )
        time.sleep(min(30, 2 * worker_restarts))
        worker = subprocess.Popen(worker_command)
      time.sleep(1)
  finally:
    for child in (server, worker):
      if child.poll() is None:
        child.terminate()


if __name__ == "__main__":
  main()
