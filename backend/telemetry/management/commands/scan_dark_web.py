import logging

from account.platform import PLATFORM_ACCOUNT_ID, get_platform_status_page
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from telemetry.tasks.dark_web_scanner import DarkWebScanner
from telemetry.tasks.osint_scanner import OSINTScanner
from telemetry.tasks.threat_intel import ThreatIntelFetcher

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
  help = "Scans the dark web and OSINT sources for leaked credentials and brand mentions."

  def _scan_scope(
    self,
    dark_scanner,
    osint_scanner,
    threat_fetcher,
    label,
    account_id,
    domain_to_check,
    brand_keyword,
  ):
    self.stdout.write(f"\n--- Scanning for {label} ---")

    if domain_to_check:
      self.stdout.write(f"Checking HIBP for domain: {domain_to_check}")
      breaches = dark_scanner.check_hibp_breaches(domain_to_check, account_id=account_id)
      if breaches:
        self.stdout.write(
          self.style.WARNING(f"Found {len(breaches)} breaches for {domain_to_check}!")
        )
      else:
        self.stdout.write(self.style.SUCCESS(f"No breaches found for {domain_to_check}."))
    else:
      self.stdout.write("No domain specified for HIBP scan. Skipping.")

    self.stdout.write(f"Searching Ahmia (Tor) for mentions of: {brand_keyword}")
    mentions = dark_scanner.search_ahmia(brand_keyword, account_id=account_id)
    if mentions:
      self.stdout.write(self.style.WARNING("Found mentions on the dark web!"))
    else:
      self.stdout.write(
        self.style.SUCCESS(f"No mentions found on the dark web for {brand_keyword}.")
      )

    if domain_to_check:
      self.stdout.write(f"Running OSINT Scan for domain: {domain_to_check}")
      osint_subdomains = osint_scanner.scan_domain(domain_to_check, account_id=account_id)
      self.stdout.write(self.style.SUCCESS(f"Found {len(osint_subdomains)} exposed subdomains."))

    self.stdout.write(f"Fetching Global Abuse.ch Threat Intel for {label}...")
    threat_fetcher.fetch_bad_ips(account_id=account_id)

  def handle(self, *args, **options):
    self.stdout.write("Starting Dynamic Multi-Account Dark Web and OSINT Scan...")

    dark_scanner = DarkWebScanner()
    osint_scanner = OSINTScanner()
    threat_fetcher = ThreatIntelFetcher()

    users = User.objects.filter(profile__isnull=False).select_related("profile")
    if not users.exists():
      self.stdout.write(self.style.WARNING("No active users found for scanning."))

    for user in users:
      from monitor.models import MonitoredService, StatusPage, ValidatedSite

      domain_to_check = None
      site = ValidatedSite.objects.filter(user=user).first()
      if site:
        domain_to_check = site.domain
      else:
        page = StatusPage.objects.filter(user=user, is_platform=False).first()
        if page:
          service = MonitoredService.objects.filter(status_page=page).first()
          if service and service.url:
            domain_to_check = (
              service.url.replace("https://", "").replace("http://", "").split("/")[0]
            )

      self._scan_scope(
        dark_scanner,
        osint_scanner,
        threat_fetcher,
        label=user.username,
        account_id=str(user.profile.account_id),
        domain_to_check=domain_to_check,
        brand_keyword=user.username,
      )

    platform_page = get_platform_status_page()
    if platform_page:
      service = platform_page.services.first()
      domain_to_check = None
      if service and service.url:
        domain_to_check = service.url.replace("https://", "").replace("http://", "").split("/")[0]
      self._scan_scope(
        dark_scanner,
        osint_scanner,
        threat_fetcher,
        label="platform",
        account_id=PLATFORM_ACCOUNT_ID,
        domain_to_check=domain_to_check or "deml.app",
        brand_keyword="platform",
      )

    self.stdout.write(
      self.style.SUCCESS("\nDark Web and OSINT Scan completed successfully for all accounts.")
    )
