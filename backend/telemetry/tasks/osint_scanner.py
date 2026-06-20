import logging

import requests

logger = logging.getLogger(__name__)


class OSINTScanner:
  """
  Automates Open Source Intelligence gathering.
  Queries certificate transparency logs (crt.sh) and public APIs
  to find exposed subdomains and assets for the company's domains.
  """

  @classmethod
  def scan_domain(cls, domain, tenant_id="platform"):
    try:
      logger.info(f"[Tenant: {tenant_id}] Running OSINT scan for domain: {domain}")
      # Example using crt.sh (Certificate Transparency logs)
      url = f"https://crt.sh/?q={domain}&output=json"
      response = requests.get(url, timeout=15)
      response.raise_for_status()

      subdomains = set()
      for entry in response.json():
        name_value = entry.get("name_value", "")
        for name in name_value.split("\n"):
          if name.endswith(domain) and "*" not in name:
            subdomains.add(name.strip())

      logger.info(f"Discovered {len(subdomains)} subdomains for {domain}.")
      # TODO: Push to ClickHouse `osint_assets` table
      return list(subdomains)

    except Exception as e:
      logger.error(f"OSINT scan failed for {domain}: {e}")
      return []


if __name__ == "__main__":
  # Example usage
  OSINTScanner.scan_domain("dataengineeringformachinelearning.com", tenant_id="platform")
