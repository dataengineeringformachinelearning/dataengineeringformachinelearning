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
  def fetch_bad_ips(cls, account_id=None):
    try:
      logger.info("[Account: %s] Fetching threat intel from abuse.ch...", account_id)
      response = requests.get(cls.ABUSE_CH_URL, timeout=10)
      response.raise_for_status()

      bad_ips = []
      for line in response.text.splitlines():
        if line and not line.startswith("#"):
          bad_ips.append(line.strip())

      logger.info("Successfully fetched %d bad IPs.", len(bad_ips))

      if account_id:
        from account.context import resolve_scope_from_account_id
        from django.db import transaction
        from monitor.models import ThreatIntelligence

        user, is_platform = resolve_scope_from_account_id(account_id)
        records = [
          ThreatIntelligence(
            user=user,
            is_platform=is_platform,
            source="abuse.ch",
            ip_address=ip,
            is_malicious=True,
            abuse_confidence_score=100,
          )
          for ip in bad_ips
        ]

        with transaction.atomic():
          ThreatIntelligence.objects.filter(
            user=user, is_platform=is_platform, source="abuse.ch"
          ).delete()
          ThreatIntelligence.objects.bulk_create(records, batch_size=5000)

        logger.info("Saved %d threat intel records to the database.", len(records))

      return bad_ips

    except Exception as e:
      logger.error(f"Failed to fetch threat intel: {e}")
      return []


if __name__ == "__main__":
  ThreatIntelFetcher.fetch_bad_ips()
