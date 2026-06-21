import logging

import requests

logger = logging.getLogger(__name__)


class LighthouseScanner:
  """
  Scans a given URL using the Google PageSpeed Insights API (which runs Lighthouse)
  to collect Performance, Accessibility, Best Practices, and SEO metrics.
  """

  # In production, you would want to pass an API key
  # https://www.googleapis.com/pagespeedonline/v5/runPagespeed
  PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

  @classmethod
  def scan_url(cls, url, tenant_id=None):
    try:
      logger.info(f"[Tenant: {tenant_id}] Running Lighthouse scan for {url}...")

      # Categories we want Lighthouse to audit
      categories = ["performance", "accessibility", "best-practices", "seo"]

      # Add categories to params manually since requests doesn't handle duplicate keys well
      req_url = cls.PAGESPEED_API_URL + "?url=" + requests.utils.quote(url) + "&strategy=mobile"
      for cat in categories:
        req_url += f"&category={cat}"

      response = requests.get(req_url, timeout=30)

      if response.status_code == 200:
        data = response.json()
        lighthouse_result = data.get("lighthouseResult", {})
        categories_result = lighthouse_result.get("categories", {})

        scores = {
          "performance": categories_result.get("performance", {}).get("score", 0) * 100,
          "accessibility": categories_result.get("accessibility", {}).get("score", 0) * 100,
          "best_practices": categories_result.get("best-practices", {}).get("score", 0) * 100,
          "seo": categories_result.get("seo", {}).get("score", 0) * 100,
        }

        logger.info(f"Scan complete for {url}: {scores}")
        return scores
      else:
        logger.error(f"Lighthouse API error: {response.status_code} - {response.text}")
        return None

    except Exception as e:
      logger.error(f"Failed to run Lighthouse scan: {e}")
      return None


if __name__ == "__main__":
  scores = LighthouseScanner.scan_url("https://dataengineeringformachinelearning.com")
  print(scores)
