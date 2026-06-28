import logging

import requests

logger = logging.getLogger(__name__)


class DarkWebScanner:
  """
  Scans the Dark Web (via Tor Proxy) and public breach databases (HIBP)
  to find credential leaks and brand mentions.
  """

  PROXIES = {
    "http": "socks5h://deml-tor-proxy.railway.internal:9050",
    "https": "socks5h://deml-tor-proxy.railway.internal:9050",
  }

  @classmethod
  def _save_threat(cls, account_id, **kwargs):
    if not account_id:
      return
    from account.context import resolve_scope_from_account_id
    from monitor.models import ThreatIntelligence

    user, is_platform = resolve_scope_from_account_id(account_id)
    ThreatIntelligence.objects.create(user=user, is_platform=is_platform, **kwargs)

  @classmethod
  def check_hibp_breaches(cls, account, account_id=None):
    """Check Have I Been Pwned for an email account."""
    try:
      logger.info(f"[Account: {account_id}] Checking HIBP for {account}...")
      url = f"https://haveibeenpwned.com/api/v3/breachedaccount/{account}"
      headers = {"User-Agent": "DataEngineeringForMachineLearning-OSINT"}
      response = requests.get(url, headers=headers, timeout=10)

      if response.status_code == 200:
        breaches = response.json()
        logger.warning(f"Found {len(breaches)} breaches for {account}!")
        if account_id:
          cls._save_threat(
            account_id,
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

    except requests.exceptions.RequestException as e:
      logger.warning(f"Failed to check HIBP due to network error: {e}")
      return []
    except Exception as e:
      logger.error(f"Failed to check HIBP: {e}")
      return []

  @classmethod
  def search_ahmia(cls, keyword, account_id=None):
    """Search Ahmia (Tor search engine) for a keyword over the Tor proxy."""
    try:
      logger.info(f"[Account: {account_id}] Searching Dark Web for '{keyword}' via Tor...")
      url = (
        f"http://juhanurmihxlp77nkq76byazcldy2hlmovfu2epvl5ankdibsot4csyd.onion/search/?q={keyword}"
      )

      response = requests.get(url, proxies=cls.PROXIES, timeout=30)  # nosemgrep

      if response.status_code == 200:
        logger.info(f"Successfully reached Ahmia for keyword '{keyword}'.")
        if account_id:
          cls._save_threat(
            account_id,
            source="Ahmia Tor Network",
            location=keyword,
            is_malicious=True,
            raw_payload={"status": "mentions_found"},
          )
        return True
      return False

    except requests.exceptions.RequestException as e:
      logger.warning(f"Failed to search Dark Web due to network error: {e}")
      return False
    except Exception as e:
      logger.error(f"Failed to search Dark Web: {e}")
      return False


if __name__ == "__main__":
  DarkWebScanner.check_hibp_breaches("admin@dataengineeringformachinelearning.com", account_id=None)
