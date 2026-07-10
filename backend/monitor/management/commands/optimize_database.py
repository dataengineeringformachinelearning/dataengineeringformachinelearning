from typing import Any

from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
  help = "Runs the database optimizer as a durable scheduled task"

  def handle(self, *args: Any, **options: Any) -> None:
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
