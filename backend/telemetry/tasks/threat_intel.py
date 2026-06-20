import logging

import requests

logger = logging.getLogger(__name__)


class ThreatIntelFetcher:
  """
  Fetches open-source threat lists (e.g., abuse.ch, AlienVault)
  to populate a ClickHouse table for real-time network enrichment.
  """

  ABUSE_CH_URL = "https://feodotracker.abuse.ch/downloads/ipblocklist.txt"

  @classmethod
  def fetch_bad_ips(cls):
    try:
      logger.info("Fetching threat intel from abuse.ch...")
      response = requests.get(cls.ABUSE_CH_URL, timeout=10)
      response.raise_for_status()

      bad_ips = []
      for line in response.text.splitlines():
        if line and not line.startswith("#"):
          bad_ips.append(line.strip())

      logger.info(f"Successfully fetched {len(bad_ips)} bad IPs.")
      # TODO: Push to ClickHouse `threat_intel` table
      return bad_ips

    except Exception as e:
      logger.error(f"Failed to fetch threat intel: {e}")
      return []


if __name__ == "__main__":
  ThreatIntelFetcher.fetch_bad_ips()
