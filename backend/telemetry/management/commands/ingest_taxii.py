import asyncio
import os
from typing import Any

from django.core.management.base import BaseCommand

from telemetry.tasks.taxii_client import TAXIIClient


class Command(BaseCommand):
  help = "Runs one configured TAXII feed ingestion pass"

  def handle(self, *args: Any, **options: Any) -> None:
    asyncio.run(self._run())

  async def _run(self) -> None:
    collection_url = os.getenv("TAXII_COLLECTION_URL")
    if not collection_url:
      self.stdout.write("TAXII_COLLECTION_URL is not configured; skipping.")
      return
    client = TAXIIClient(
      discovery_url=os.getenv("TAXII_DISCOVERY_URL", collection_url),
      username=os.getenv("TAXII_USERNAME"),
      password=os.getenv("TAXII_PASSWORD"),
    )
    indicators = await client.fetch_indicators(collection_url)
    await client.ingest_to_db(
      indicators,
      source_name=os.getenv("TAXII_SOURCE_NAME", "taxii_feed"),
    )
    self.stdout.write(self.style.SUCCESS(f"Ingested {len(indicators)} TAXII indicators."))
