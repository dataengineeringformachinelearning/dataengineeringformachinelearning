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
  def scan_url(cls, url, account_id=None):
    try:
      logger.info("[Account: %s] Running Lighthouse scan for %s...", account_id, url)

      # Categories we want Lighthouse to audit
      categories = ["performance", "accessibility", "best-practices", "seo"]

      import os

      # Add categories to params manually since requests doesn't handle duplicate keys well
      req_url = cls.PAGESPEED_API_URL + "?url=" + requests.utils.quote(url) + "&strategy=mobile"
      for cat in categories:
        req_url += f"&category={cat}"

      api_key = os.getenv("PAGESPEED_API_KEY") or os.getenv("GOOGLE_API_KEY")
      if api_key:
        req_url += f"&key={api_key}"

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

        logger.info("Scan complete for %s: %s", url, scores)
        return scores
      elif response.status_code == 429:
        logger.warning(f"Lighthouse API quota exceeded (429) for {url}. Skipping scan.")
        return None
      else:
        logger.error(f"Lighthouse API error: {response.status_code} - {response.text}")
        return None

    except Exception as e:
      logger.error(f"Failed to run Lighthouse scan: {e}")
      return None


if __name__ == "__main__":
  scores = LighthouseScanner.scan_url("https://dataengineeringformachinelearning.com")
  print(scores)
