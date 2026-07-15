from __future__ import annotations

import asyncio
from typing import Any

from django.core.management.base import BaseCommand, CommandParser

from telemetry.services.firecrawl_technology import enrich_all_validated_sites


class Command(BaseCommand):
  help = "Extract public web technologies with Firecrawl and compare them to CPE/CVE data."

  def add_arguments(self, parser: CommandParser) -> None:
    parser.add_argument("--limit", type=int, default=None)

  def handle(self, *args: Any, **options: Any) -> None:
    results = asyncio.run(enrich_all_validated_sites(limit=options["limit"]))
    observed = sum(result.observed_count for result in results)
    cpe_matches = sum(result.cpe_match_count for result in results)
    cve_matches = sum(result.cve_match_count for result in results)
    self.stdout.write(
      self.style.SUCCESS(
        f"Firecrawl enriched {len(results)} site(s): "
        f"{observed} technologies, {cpe_matches} CPE matches, {cve_matches} CVE matches."
      )
    )
