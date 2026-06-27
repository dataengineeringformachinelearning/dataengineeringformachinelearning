import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
import traceback

from telemetry.management.commands.telemetry_worker import Command

try:
  cmd = Command()
  cmd.execute()
except Exception as e:
  print(f"ERROR: {e}", flush=True)
  traceback.print_exc()
