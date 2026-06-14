import os
import subprocess
import sys


def main():
  # Run migrations
  print("Running migrations...", flush=True)
  subprocess.run([sys.executable, "manage.py", "migrate"], check=True)

  # Train initial ML models
  print("Training models...", flush=True)
  subprocess.run([sys.executable, "manage.py", "train_all_models"], check=True)

  # Start Gunicorn server
  print("Starting Gunicorn...", flush=True)
  port = os.getenv("PORT", "8000")
  # Use full path to gunicorn in the virtual env
  gunicorn_bin = os.path.join(os.path.dirname(sys.executable), "gunicorn")
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
