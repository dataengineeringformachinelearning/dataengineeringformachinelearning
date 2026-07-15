import asyncio
import logging
from typing import Any

from asgiref.sync import sync_to_async
from monitor.models import Asset, ValidatedSite, WebTechnologyObservation

from telemetry.services.firecrawl_technology import (
  TechnologyEvidence,
  compare_and_persist_site_technologies,
  normalize_technology_name,
  normalize_version,
  validate_public_site_url,
)

logger = logging.getLogger(__name__)


class AssetDiscoveryScanner:
  """Discover public web technologies with Wappalyzer signatures."""

  def __init__(self) -> None:
    from Wappalyzer import Wappalyzer

    self.wappalyzer = Wappalyzer.latest()

  @sync_to_async
  def _validated_site_for_asset(self, asset: Asset) -> ValidatedSite | None:
    return (
      ValidatedSite.objects.filter(
        user=asset.user,
        domain__iexact=asset.hostname,
        is_verified=True,
      )
      .select_related("user", "user__profile")
      .first()
    )

  def _run_scan(self, source_url: str) -> dict[str, Any]:
    try:
      from Wappalyzer import WebPage

      webpage = WebPage.new_from_url(source_url)
      detailed_analyzer = getattr(self.wappalyzer, "analyze_with_versions_and_categories", None)
      if callable(detailed_analyzer):
        detailed = detailed_analyzer(webpage)
        if isinstance(detailed, dict):
          return detailed
      basic = self.wappalyzer.analyze(webpage)
      if isinstance(basic, dict):
        return basic
      return {str(name): {} for name in basic}
    except Exception as exc:
      logger.error("Wappalyzer request failed for %s: %s", source_url, exc)
      return {}

  @staticmethod
  def _technology_evidence(results: dict[str, Any]) -> list[TechnologyEvidence]:
    observations: list[TechnologyEvidence] = []
    for name, details in results.items():
      normalized_name = normalize_technology_name(str(name))
      if not normalized_name:
        continue
      raw_versions = details.get("versions", []) if isinstance(details, dict) else []
      versions = raw_versions if isinstance(raw_versions, list | tuple | set) else []
      normalized_versions = [normalize_version(version) for version in versions] or [""]
      observations.extend(
        TechnologyEvidence(
          name=str(name)[:255],
          normalized_name=normalized_name,
          version=version,
          confidence=1.0,
          evidence=("Wappalyzer signature match",),
        )
        for version in dict.fromkeys(normalized_versions)
      )
    return observations

  async def scan_asset(self, asset: Asset) -> dict[str, Any] | None:
    """Scan only assets backed by an exact, verified public site registration."""
    try:
      site = await self._validated_site_for_asset(asset)
      if site is None:
        logger.warning("Skipping unverified asset discovery target %s", asset.id)
        return None

      source_url = await asyncio.to_thread(
        validate_public_site_url,
        f"https://{site.domain}/",
        site.domain,
      )
      logger.info("Initiating asset discovery scan for verified site %s", site.id)
      results = await asyncio.to_thread(self._run_scan, source_url)
      technologies = self._technology_evidence(results)
      if technologies:
        await compare_and_persist_site_technologies(
          site,
          source_url,
          WebTechnologyObservation.Source.WAPPALYZER,
          technologies,
        )
      return results
    except (ValueError, RuntimeError) as exc:
      logger.error("Failed to scan asset %s: %s", asset.id, exc)
      return None
