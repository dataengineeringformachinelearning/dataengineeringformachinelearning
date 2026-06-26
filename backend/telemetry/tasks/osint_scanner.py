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
  def scan_domain(cls, domain, tenant_id=None):
    try:
      import datetime

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

      if tenant_id:
        from monitor.models import Endpoints

        for sub in subdomains:
          Endpoints.objects.get_or_create(
            tenant_id=tenant_id,
            url=f"https://{sub}",
            defaults={
              "status_code": 0,
              "response_time": datetime.timedelta(seconds=0),
              "is_active": True,
            },
          )

      return list(subdomains)

    except requests.exceptions.RequestException as e:
      logger.warning(f"OSINT scan failed for {domain} due to network error: {e}")
      return []
    except Exception as e:
      logger.error(f"OSINT scan failed for {domain}: {e}")
      return []


if __name__ == "__main__":
  # Example usage
  OSINTScanner.scan_domain("dataengineeringformachinelearning.com", tenant_id=None)
