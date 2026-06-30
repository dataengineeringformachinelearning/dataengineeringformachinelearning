import os
import subprocess
import sys


def main():
  # Prefer the virtualenv's python binary to avoid resolving symlinks to the system python
  python_bin = "/opt/venv/bin/python"
  if not os.path.exists(python_bin):
    python_bin = sys.executable

  # Run migrations
  print("Running migrations...", flush=True)
  subprocess.run([python_bin, "manage.py", "migrate", "--noinput"], check=True)

  # Start Daphne ASGI server (required for Channels/WebSocket support)
  print("Starting Daphne ASGI server...", flush=True)
  port = os.getenv("PORT", "8000")

  daphne_args = ["-b", "0.0.0.0", "-p", port, "config.asgi:application"]

  # Prefer venv daphne binary; fall back to python -m daphne (distroless-safe).
  daphne_bin = "/opt/venv/bin/daphne"
  if os.path.exists(daphne_bin):
    subprocess.run([daphne_bin, *daphne_args], check=True)
  else:
    subprocess.run([python_bin, "-m", "daphne", *daphne_args], check=True)


if __name__ == "__main__":
  main()
