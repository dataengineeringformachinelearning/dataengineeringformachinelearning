import logging

from django.core.management.base import BaseCommand

from telemetry.tasks.dark_web_scanner import DarkWebScanner
from telemetry.tasks.osint_scanner import OSINTScanner
from telemetry.tasks.threat_intel import ThreatIntelFetcher

logger = logging.getLogger(__name__)


class Command(BaseCommand):
  help = "Scans the dark web and OSINT sources for leaked credentials and brand mentions."

  def handle(self, *args, **options):
    from monitor.models import Tenant

    self.stdout.write("Starting Dynamic Multi-Tenant Dark Web and OSINT Scan...")

    dark_scanner = DarkWebScanner()
    osint_scanner = OSINTScanner()
    threat_fetcher = ThreatIntelFetcher()

    # Iterate over all tenants, including the Platform (Tenant0)
    tenants = Tenant.objects.all()

    if not tenants.exists():
      self.stdout.write(self.style.WARNING("No active tenants found for scanning."))
      return

    for tenant in tenants:
      self.stdout.write(f"\n--- Scanning for Tenant: {tenant.name} ---")

      # 1. Check HIBP for known company email breaches
      domain_to_check = (
        tenant.target_url.replace("https://", "").replace("http://", "").split("/")[0]
        if tenant.target_url
        else None
      )
      if domain_to_check:
        self.stdout.write(f"Checking HIBP for domain: {domain_to_check}")
        breaches = dark_scanner.check_hibp_breaches(domain_to_check, tenant_id=tenant.id)
        if breaches:
          self.stdout.write(
            self.style.WARNING(f"Found {len(breaches)} breaches for {domain_to_check}!")
          )
        else:
          self.stdout.write(self.style.SUCCESS(f"No breaches found for {domain_to_check}."))
      else:
        self.stdout.write("No target_url specified for HIBP scan. Skipping.")

      # 2. Search Tor network via Ahmia for brand mentions
      brand_keyword = tenant.slug or tenant.name
      self.stdout.write(f"Searching Ahmia (Tor) for mentions of: {brand_keyword}")
      mentions = dark_scanner.search_ahmia(brand_keyword, tenant_id=tenant.id)
      if mentions:
        self.stdout.write(self.style.WARNING("Found mentions on the dark web!"))
      else:
        self.stdout.write(
          self.style.SUCCESS(f"No mentions found on the dark web for {brand_keyword}.")
        )

      # 3. OSINT domain scan
      if domain_to_check:
        self.stdout.write(f"Running OSINT Scan for domain: {domain_to_check}")
        osint_subdomains = osint_scanner.scan_domain(domain_to_check, tenant_id=tenant.id)
        self.stdout.write(self.style.SUCCESS(f"Found {len(osint_subdomains)} exposed subdomains."))

      # 4. Threat Intel (Abuse.ch)
      self.stdout.write(f"Fetching Global Abuse.ch Threat Intel for {tenant.name}...")
      threat_fetcher.fetch_bad_ips(tenant_id=tenant.id)

    self.stdout.write(
      self.style.SUCCESS("\nDark Web and OSINT Scan completed successfully for all tenants.")
    )
