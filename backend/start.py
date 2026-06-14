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
  subprocess.run([python_bin, "manage.py", "migrate"], check=True)

  # Train initial ML models
  print("Training models...", flush=True)
  subprocess.run([python_bin, "manage.py", "train_all_models"], check=True)

  # Start Gunicorn server
  print("Starting Gunicorn...", flush=True)
  port = os.getenv("PORT", "8000")

  # Prefer the virtualenv's gunicorn binary
  gunicorn_bin = "/opt/venv/bin/gunicorn"
  if not os.path.exists(gunicorn_bin):
    gunicorn_bin = os.path.join(os.path.dirname(python_bin), "gunicorn")

  subprocess.run(
    [
      gunicorn_bin,
      "--bind",
      f"0.0.0.0:{port}",
      "config.wsgi:application",
      "--workers",
      "3",
      "--timeout",
      "120",
    ],
    check=True,
  )


if __name__ == "__main__":
  main()
