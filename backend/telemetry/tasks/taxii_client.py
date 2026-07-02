import logging
from typing import Any

import aiohttp
from asgiref.sync import sync_to_async
from monitor.models import ThreatIntelligence

logger = logging.getLogger(__name__)


class TAXIIClient:
  """
  Client for polling TAXII 2.1 servers for STIX bundles.
  Used for ingesting Threat Intelligence feeds (e.g., malicious IPs).
  """

  def __init__(self, discovery_url: str, username: str | None = None, password: str | None = None):
    self.discovery_url = discovery_url
    self.auth = aiohttp.BasicAuth(username, password) if username and password else None
    self.headers = {"Accept": "application/taxii+json;version=2.1"}

  async def fetch_indicators(self, collection_url: str) -> list[dict[str, Any]]:
    """
    Poll the given TAXII collection for STIX 2.1 indicator objects.
    """
    try:
      async with aiohttp.ClientSession(auth=self.auth, headers=self.headers) as session:
        async with session.get(collection_url) as response:
          if response.status == 200:
            bundle = await response.json()
            # A STIX bundle contains an 'objects' list
            objects = bundle.get("objects", [])
            indicators = [obj for obj in objects if obj.get("type") == "indicator"]
            return indicators
          else:
            logger.error(
              f"Failed to fetch TAXII collection {collection_url}: Status {response.status}"
            )
            return []
    except Exception as e:
      logger.error(f"Error polling TAXII server: {e}")
      return []

  async def ingest_to_db(self, indicators: list[dict[str, Any]], source_name: str) -> None:
    """
    Parse STIX indicators and store them in the ThreatIntelligence model.
    """
    if not indicators:
      return

    def _bulk_insert():
      threats = []
      for indicator in indicators:
        pattern = indicator.get("pattern", "")
        # Very basic parsing for demonstration (STIX patterns are complex)
        # e.g., [ipv4-addr:value = '198.51.100.1']
        ip_address = None
        if "ipv4-addr:value" in pattern:
          parts = pattern.split("'")
          if len(parts) >= 3:
            ip_address = parts[1]

        if ip_address:
          threats.append(
            ThreatIntelligence(
              source=source_name,
              ip_address=ip_address,
              abuse_confidence_score=100,  # Defaulting high for direct indicators
              is_malicious=True,
              raw_payload=indicator,
            )
          )

      if threats:
        # Use ignore_conflicts in production to avoid duplicates
        ThreatIntelligence.objects.bulk_create(threats, ignore_conflicts=True)
        logger.info("Ingested %d threat intelligence records from %s", len(threats), source_name)

    await sync_to_async(_bulk_insert)()
