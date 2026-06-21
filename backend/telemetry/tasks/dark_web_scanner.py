import logging

import requests

logger = logging.getLogger(__name__)


class DarkWebScanner:
  """
  Scans the Dark Web (via Tor Proxy) and public breach databases (HIBP)
  to find credential leaks and brand mentions.
  """

  # Ensure this matches the tor-proxy service port in docker-compose.yml
  PROXIES = {"http": "socks5h://tor-proxy:9050", "https": "socks5h://tor-proxy:9050"}

  @classmethod
  def check_hibp_breaches(cls, account, tenant_id=None):
    """Check Have I Been Pwned for an email account."""
    try:
      logger.info(f"[Tenant: {tenant_id}] Checking HIBP for {account}...")
      url = f"https://haveibeenpwned.com/api/v3/breachedaccount/{account}"
      headers = {
        # In production, use the actual API key from environment variables
        # 'hibp-api-key': os.getenv('HIBP_API_KEY'),
        "User-Agent": "DataEngineeringForMachineLearning-OSINT"
      }
      response = requests.get(url, headers=headers, timeout=10)

      if response.status_code == 200:
        breaches = response.json()
        logger.warning(f"Found {len(breaches)} breaches for {account}!")
        if tenant_id:
          from monitor.models import ThreatIntelligence

          ThreatIntelligence.objects.create(
            tenant_id=tenant_id,
            source="HIBP",
            location=account,
            is_malicious=True,
            raw_payload={"breaches": breaches},
          )
        return breaches
      elif response.status_code == 404:
        logger.info(f"No breaches found for {account}.")
        return []
      else:
        logger.error(f"HIBP API error: {response.status_code}")
        return []

    except Exception as e:
      logger.error(f"Failed to check HIBP: {e}")
      return []

  @classmethod
  def search_ahmia(cls, keyword, tenant_id=None):
    """Search Ahmia (Tor search engine) for a keyword over the Tor proxy."""
    try:
      logger.info(f"[Tenant: {tenant_id}] Searching Dark Web for '{keyword}' via Tor...")
      # Ahmia's onion address (example, subject to change)
      # Alternatively, Ahmia has a clearnet address, but we use Tor for OPSEC
      url = (
        f"http://juhanurmihxlp77nkq76byazcldy2hlmovfu2epvl5ankdibsot4csyd.onion/search/?q={keyword}"
      )

      # Using the tor-proxy to route the request
      response = requests.get(url, proxies=cls.PROXIES, timeout=30)  # nosemgrep

      if response.status_code == 200:
        logger.info(f"Successfully reached Ahmia for keyword '{keyword}'.")
        if tenant_id:
          from monitor.models import ThreatIntelligence

          ThreatIntelligence.objects.create(
            tenant_id=tenant_id,
            source="Ahmia Tor Network",
            location=keyword,
            is_malicious=True,
            raw_payload={"status": "mentions_found"},
          )
        return True
      return False

    except Exception as e:
      logger.error(f"Failed to search Dark Web: {e}")
      return False


if __name__ == "__main__":
  DarkWebScanner.check_hibp_breaches("admin@dataengineeringformachinelearning.com", tenant_id=None)
