import asyncio
import logging
from typing import Any

from asgiref.sync import sync_to_async
from monitor.models import Asset
from Wappalyzer import Wappalyzer, WebPage

logger = logging.getLogger(__name__)


class AssetDiscoveryScanner:
  """
  Automated Asset Discovery using Wappalyzer.
  This component scans endpoints associated with an Asset to discover
  the technology stack, frameworks, and CMS in use.
  """

  def __init__(self):
    # Initialize Wappalyzer with the latest signatures
    self.wappalyzer = Wappalyzer.latest()

  async def scan_asset(self, asset: Asset) -> dict[str, Any] | None:
    """
    Scan a given asset and return the discovered technologies.
    """
    try:
      # Assuming hostname provides the target URL
      url = f"https://{asset.hostname}"
      logger.info(f"Initiating asset discovery scan for: {url}")

      # Wappalyzer's WebPage generation and scanning is synchronous,
      # so we run it in a separate thread to avoid blocking the event loop.
      def _run_scan() -> dict[str, Any]:
        try:
          webpage = WebPage.new_from_url(url)
          # analyze returns a dictionary of discovered technologies
          return self.wappalyzer.analyze(webpage)
        except Exception as e:
          logger.error(f"Error during Wappalyzer HTTP request for {url}: {e}")
          return {}

      results = await asyncio.to_thread(_run_scan)

      if results:
        logger.info(f"Discovered technologies for {asset.hostname}: {list(results.keys())}")
        # Save the raw results to the asset metadata
        await sync_to_async(self._save_results)(asset, results)

      return results

    except Exception as e:
      logger.error(f"Failed to scan asset {asset.hostname}: {e}")
      return None

  def _save_results(self, asset: Asset, results: dict[str, Any]) -> None:
    """
    Persist discovered technology stack data to the Asset record.
    """
    # Ensure metadata is a dictionary
    if not isinstance(asset.metadata, dict):
      asset.metadata = {}

    asset.metadata["discovered_tech_stack"] = list(results.keys())
    # Provide a timestamp for the discovery
    from django.utils import timezone

    asset.metadata["last_discovery_scan"] = timezone.now().isoformat()
    asset.save(update_fields=["metadata"])
