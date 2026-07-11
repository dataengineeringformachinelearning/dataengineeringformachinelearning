"""Database optimizer - runs VACUUM ANALYZE on Postgres tables.

NOTE: This command is now Rust-native. The deml-daemon:scheduler executes
run_optimize_database directly. This file remains as fallback for PYTHON_EMBEDDED_SCHEDULERS_ENABLED=1.
"""

from typing import Any

from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
  help = "Runs the database optimizer as a durable scheduled task (Rust-native fallback)"

  def handle(self, *args: Any, **options: Any) -> None:
    self.stdout.write(
      "NOTE: optimize_database is now Rust-native. In production with "
      "PYTHON_EMBEDDED_SCHEDULERS_ENABLED=0, this command is not used."
    )
    if connection.vendor == "postgresql":
      with connection.cursor() as cursor:
        connection.autocommit = True
        try:
          cursor.execute("VACUUM ANALYZE;")
        finally:
          connection.autocommit = False
    elif connection.vendor == "sqlite":
      with connection.cursor() as cursor:
        cursor.execute("VACUUM;")
    else:
      self.stdout.write(self.style.WARNING(f"Unsupported database vendor: {connection.vendor}"))
      return
    self.stdout.write(self.style.SUCCESS("Database optimization completed."))
