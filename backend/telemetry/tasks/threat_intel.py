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
  def fetch_bad_ips(cls, tenant_id=None):
    try:
      logger.info(f"[Tenant: {tenant_id}] Fetching threat intel from abuse.ch...")
      response = requests.get(cls.ABUSE_CH_URL, timeout=10)
      response.raise_for_status()

      bad_ips = []
      for line in response.text.splitlines():
        if line and not line.startswith("#"):
          bad_ips.append(line.strip())

      logger.info(f"Successfully fetched {len(bad_ips)} bad IPs.")

      if tenant_id:
        from django.db import transaction
        from monitor.models import ThreatIntelligence

        records = [
          ThreatIntelligence(
            tenant_id=tenant_id,
            source="abuse.ch",
            ip_address=ip,
            is_malicious=True,
            abuse_confidence_score=100,
          )
          for ip in bad_ips
        ]

        with transaction.atomic():
          # Refresh the abuse.ch blocklist for this tenant
          ThreatIntelligence.objects.filter(tenant_id=tenant_id, source="abuse.ch").delete()
          ThreatIntelligence.objects.bulk_create(records, batch_size=5000)

        logger.info(f"Saved {len(records)} threat intel records to the database.")

      return bad_ips

    except Exception as e:
      logger.error(f"Failed to fetch threat intel: {e}")
      return []


if __name__ == "__main__":
  ThreatIntelFetcher.fetch_bad_ips()
