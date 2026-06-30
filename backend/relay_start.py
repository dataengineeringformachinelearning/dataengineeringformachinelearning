import os
import subprocess
import sys


def main() -> None:
  """Run migrations then start the outbox relay daemon (Railway deml-relay entrypoint)."""
  python_bin = "/opt/venv/bin/python"
  if not os.path.exists(python_bin):
    python_bin = sys.executable

  print("Running migrations...", flush=True)
  subprocess.run([python_bin, "manage.py", "migrate", "--noinput"], check=True)

  print("Starting outbox relay...", flush=True)
  subprocess.run([python_bin, "manage.py", "outbox_relay"], check=True)


if __name__ == "__main__":
  main()
