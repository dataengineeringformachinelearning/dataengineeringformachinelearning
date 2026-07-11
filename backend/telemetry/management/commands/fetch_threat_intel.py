import json
import logging

import requests
from django.core.management.base import BaseCommand
from django.utils import timezone
from monitor.models import AnalyticsIntegration

logger = logging.getLogger(__name__)


class Command(BaseCommand):
  help = (
    "Fetch location access details and threat intelligence stats from Google and Microsoft APIs"
  )

  def handle(self, *args, **options):
    self.stdout.write("Fetching threat intelligence data from connected analytics integrations...")
    integrations = AnalyticsIntegration.objects.filter(active=True)

    if not integrations.exists():
      self.stdout.write("No active integrations found.")
      return

    for integration in integrations:
      self.stdout.write(
        f"Processing {integration.provider} integration for user: {integration.user.username}"
      )

      try:
        if integration.provider == "google":
          self.sync_google_analytics(integration)
        elif integration.provider == "microsoft":
          self.sync_microsoft_clarity(integration)
        elif integration.provider == "cloudflare":
          self.sync_cloudflare_analytics(integration)

        integration.last_sync = timezone.now()
        integration.save()
      except Exception as e:
        self.stderr.write(self.style.ERROR(f"Sync failed for {integration.provider}: {e!s}"))

  def sync_google_analytics(self, integration):
    credentials = integration.credentials if isinstance(integration.credentials, dict) else {}
    refresh_token = credentials.get("refresh_token")
    if not refresh_token:
      self.stderr.write("No refresh token found. User must re-authenticate.")
      return

    # Refresh Access Token
    from django.conf import settings
    from monitor.services.ga4_scope import (
      build_site_bindings,
      credentials_scope_snapshot,
    )

    client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "mock-client-id")
    client_secret = getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "mock-client-secret")

    refresh_url = "https://oauth2.googleapis.com/token"
    data = {
      "client_id": client_id,
      "client_secret": client_secret,
      "refresh_token": refresh_token,
      "grant_type": "refresh_token",
    }

    response = requests.post(refresh_url, data=data, timeout=10)
    tokens = response.json() if response.content else {}
    access_token = tokens.get("access_token")

    if not access_token:
      self.stderr.write("Failed to refresh Google access token.")
      return

    # Save the updated access token back
    credentials["access_token"] = access_token
    integration.credentials = credentials
    integration.save()

    # Only DEML-configured sites (StatusPage.google_analytics_id + MonitoredService hosts).
    # Never pull every property on the Google account.
    bindings = build_site_bindings(integration.user, access_token)
    credentials["scoped_properties"] = credentials_scope_snapshot(bindings)
    # Drop legacy whole-account property_id so we never re-use an unscoped binding.
    credentials.pop("property_id", None)
    integration.credentials = credentials
    integration.save()

    if not bindings:
      self.stdout.write(
        self.style.WARNING(
          f"No site-scoped GA4 bindings for {integration.user.username}. "
          "Set google_analytics_id on each Status Page and ensure monitored service URLs exist. "
          "Falling back to first-party endpoint telemetry for this user only."
        )
      )
      analytics_rows = self._derive_analytics_from_endpoints(integration)
    else:
      analytics_rows = self._fetch_ga4_report_scoped(access_token, bindings)
      if not analytics_rows:
        self.stdout.write(
          "GA4 returned no rows for scoped hosts; using first-party endpoint fallback."
        )
        analytics_rows = self._derive_analytics_from_endpoints(integration)

    self.stdout.write(
      self.style.SUCCESS(
        f"Fetched {len(analytics_rows)} GA4 geo rows for {integration.user.username} "
        f"({len(bindings)} site binding(s))"
      )
    )
    for row in analytics_rows:
      self.stdout.write(
        f"  - {row.get('host', '')} {row['city']}, {row['country']}: "
        f"{row['active_users']} active users "
        f"({row['suspicious_requests']} suspicious requests)"
      )

    self._publish_threat_rows(integration, analytics_rows, source="google_analytics_threat_intel")

  def _fetch_ga4_report_scoped(self, access_token: str, bindings: list) -> list[dict]:
    """Query only bound properties and filter hostName to DEML site hosts."""
    from monitor.services.ga4_scope import ga4_hostname_filter

    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    merged: list[dict] = []
    # One property may appear on multiple pages if misconfigured; union hosts per property.
    by_property: dict[str, set[str]] = {}
    for binding in bindings:
      by_property.setdefault(binding.property_id, set()).update(binding.hosts)

    for property_id, hosts in by_property.items():
      host_filter = ga4_hostname_filter(hosts)
      if not host_filter:
        continue
      url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
      body = {
        "dimensions": [
          {"name": "hostName"},
          {"name": "country"},
          {"name": "city"},
        ],
        "metrics": [{"name": "activeUsers"}],
        "dateRanges": [{"startDate": "7daysAgo", "endDate": "today"}],
        "dimensionFilter": host_filter,
      }
      try:
        response = requests.post(url, headers=headers, json=body, timeout=15)
        if response.status_code != 200:
          self.stderr.write(
            f"GA4 runReport failed property={property_id} status={response.status_code}"
          )
          continue
        for report_row in (response.json() if response.content else {}).get("rows", []):
          dims = [d.get("value", "") for d in report_row.get("dimensionValues", [])]
          metrics = report_row.get("metricValues", [])
          active = int(metrics[0].get("value", 0)) if metrics else 0
          host = dims[0] if dims else ""
          country = dims[1] if len(dims) > 1 else "Unknown"
          city = dims[2] if len(dims) > 2 else "Unknown"
          # Defense in depth: drop rows whose host is not in the DEML allow-list.
          if host and host.lower() not in {h.lower() for h in hosts}:
            continue
          suspicious = (
            1 if active < 20 and country not in ("United States", "Canada", "United Kingdom") else 0
          )
          merged.append(
            {
              "host": host,
              "country": country,
              "city": city,
              "active_users": active,
              "suspicious_requests": suspicious,
              "property_id": property_id,
            }
          )
      except Exception as exc:
        self.stderr.write(f"GA4 API call failed property={property_id}: {exc}")
    return merged

  def _derive_analytics_from_endpoints(self, integration: AnalyticsIntegration) -> list[dict]:
    """Low-overhead fallback from first-party endpoint telemetry for this user only."""
    from django.utils import timezone as tz
    from monitor.models import Endpoints
    from monitor.services.ga4_scope import normalize_hostname, user_site_hosts

    cutoff = tz.now() - tz.timedelta(hours=24)
    allowed_hosts = user_site_hosts(integration.user)
    endpoints = Endpoints.objects.filter(user=integration.user, last_tested__gte=cutoff)
    by_location: dict[str, dict] = {}
    for ep in endpoints[:500]:
      if allowed_hosts:
        ep_host = normalize_hostname(ep.url)
        if ep_host and ep_host not in allowed_hosts:
          continue
      loc = ep.location or "Unknown"
      bucket = by_location.setdefault(loc, {"active_users": 0, "suspicious_requests": 0})
      bucket["active_users"] += 1
      if ep.status_code in (400, 401, 403, 429) or ep.is_bot:
        bucket["suspicious_requests"] += 1

    rows = []
    for loc, stats in by_location.items():
      parts = loc.split(",")
      city = parts[0].strip() if parts else "Unknown"
      country = parts[-1].strip() if len(parts) > 1 else loc
      rows.append(
        {
          "country": country,
          "city": city,
          "active_users": stats["active_users"],
          "suspicious_requests": stats["suspicious_requests"],
        }
      )
    return rows or [
      {"country": "Unknown", "city": "Unknown", "active_users": 0, "suspicious_requests": 0}
    ]

  def _publish_threat_rows(
    self, integration: AnalyticsIntegration, rows: list[dict], *, source: str
  ) -> None:
    try:
      import asyncio
      import json

      from account.context import account_id_for_user
      from utils.kafka import create_kafka_producer, send_kafka_value

      account_id = account_id_for_user(integration.user)

      async def produce_all():
        producer = create_kafka_producer()
        async with producer:
          for row in rows:
            host = (row.get("host") or "").strip()
            place = f"{row['city']}, {row['country']}"
            location = f"{host} · {place}" if host else place
            payload = {
              "source": source,
              "account_id": account_id,
              "user_id": integration.user.id,
              "location": location,
              "active_users": row["active_users"],
              "suspicious_requests": row["suspicious_requests"],
              "raw_payload": row,
              "timestamp": timezone.now().isoformat(),
            }
            await send_kafka_value(
              producer,
              "app-events",
              json.dumps(payload).encode("utf-8"),
            )

      asyncio.run(produce_all())
    except Exception:
      pass

  def check_ip_reputation(self, ip):
    import os

    abuseipdb_key = os.getenv("ABUSEIPDB_API_KEY")
    otx_key = os.getenv("OTX_API_KEY")
    ipinfo_key = os.getenv("IPINFO_API_KEY")

    reputation = {
      "abuse_score": 0,
      "otx_pulses": 0,
      "isp": "Unknown",
      "is_malicious": False,
      "recon": self.perform_active_recon(ip),
    }

    # IPinfo API Check (for enhanced ISP/organization data)
    if ipinfo_key:
      try:
        url = f"https://ipinfo.io/{ip}/json"
        headers = {"Authorization": f"Bearer {ipinfo_key}", "Accept": "application/json"}
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
          data = response.json()
          if "org" in data:
            reputation["isp"] = data["org"]
      except Exception as e:
        self.stderr.write(f"IPinfo API check failed for {ip}: {e}")

    # AbuseIPDB API Check
    if abuseipdb_key:
      try:
        url = "https://api.abuseipdb.com/api/v2/check"
        headers = {"Key": abuseipdb_key, "Accept": "application/json"}
        params = {"ipAddress": ip, "maxAgeInDays": "90"}
        response = requests.get(url, headers=headers, params=params, timeout=5)
        if response.status_code == 200:
          data = response.json().get("data", {})
          reputation["abuse_score"] = data.get("abuseConfidenceScore", 0)
          reputation["isp"] = data.get("isp", "Unknown")
      except Exception as e:
        self.stderr.write(f"AbuseIPDB API check failed for {ip}: {e}")
    else:
      # Simulation fallback
      if ip == "203.0.113.19":
        reputation["abuse_score"] = 85
        reputation["isp"] = "Test Malicious ISP"
      elif ip == "192.168.1.50":
        reputation["abuse_score"] = 0
        reputation["isp"] = "Local Host"

    # AlienVault OTX API Check
    if otx_key:
      try:
        url = f"https://otx.alienvault.com/api/v1/indicators/IPv4/{ip}/general"
        headers = {"X-OTX-API-KEY": otx_key}
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
          data = response.json()
          pulses = data.get("pulse_info", {}).get("pulses", [])
          reputation["otx_pulses"] = len(pulses)
      except Exception as e:
        self.stderr.write(f"AlienVault OTX API check failed for {ip}: {e}")
    else:
      # Simulation fallback
      if ip == "203.0.113.19":
        reputation["otx_pulses"] = 4
      elif ip == "192.168.1.50":
        reputation["otx_pulses"] = 0

    if reputation["abuse_score"] > 50 or reputation["otx_pulses"] > 0:
      reputation["is_malicious"] = True

    return reputation

  def perform_active_recon(self, ip):
    import re
    import socket
    import subprocess

    recon_data = {"rdns": None, "ping_ms": None, "open_ports": [], "whois_raw": None}

    # 1. Reverse DNS
    try:
      host, _, _ = socket.gethostbyaddr(ip)
      recon_data["rdns"] = host
    except Exception:
      pass

    # 2. ICMP Ping Latency
    try:
      # Mac/Linux compatible: ping -c 1 -W 1 <ip>
      result = subprocess.run(
        ["ping", "-c", "1", "-W", "1", ip], capture_output=True, text=True, timeout=2
      )
      if result.returncode == 0:
        match = re.search(r"time=([\d\.]+)\s*ms", result.stdout)
        if match:
          recon_data["ping_ms"] = float(match.group(1))
    except Exception:
      pass

    # 3. Active Port Probing
    for port in [22, 3389, 8080]:
      try:
        with socket.create_connection((ip, port), timeout=0.5):
          recon_data["open_ports"].append(port)
      except Exception:
        pass

    # 4. WHOIS Data
    try:
      result = subprocess.run(["whois", ip], capture_output=True, text=True, timeout=3)
      if result.returncode == 0 and result.stdout:
        recon_data["whois_raw"] = result.stdout[:1000]
    except Exception:
      pass

    return recon_data

  def _fetch_clarity_sessions(
    self, integration: AnalyticsIntegration, project_id: str, api_key: str
  ) -> list[dict]:
    """Attempt Clarity export API; fall back to endpoint-derived behavioral sessions."""
    try:
      url = f"https://www.clarity.ms/export-data/api/v1/project/{project_id}/sessions"
      headers = {"Authorization": f"Bearer {api_key}", "Accept": "application/json"}
      response = requests.get(url, headers=headers, timeout=15)
      if response.status_code == 200:
        data = response.json()
        sessions = data if isinstance(data, list) else data.get("sessions", [])
        parsed = []
        for item in sessions[:50]:
          parsed.append(
            {
              "session_id": item.get("sessionId") or item.get("id") or "clarity",
              "ip": item.get("ip") or "0.0.0.0",
              "location": item.get("location") or "Unknown",
              "duration_seconds": int(item.get("duration") or item.get("duration_seconds") or 0),
              "scrolled_percent": int(item.get("scrollDepth") or item.get("scrolled_percent") or 0),
            }
          )
        if parsed:
          return parsed
    except Exception as exc:
      self.stderr.write(f"Clarity API unavailable, using derived sessions: {exc}")

    from django.utils import timezone as tz
    from monitor.models import Endpoints

    cutoff = tz.now() - tz.timedelta(hours=24)
    sessions = []
    for ep in Endpoints.objects.filter(user=integration.user, last_tested__gte=cutoff)[:20]:
      ctx = ep.telemetry_context or {}
      behavioral = ctx.get("behavioral") or {}
      sessions.append(
        {
          "session_id": f"derived_{ep.id}",
          "ip": ep.ip_address or "0.0.0.0",
          "location": ep.location or "Unknown",
          "duration_seconds": int(behavioral.get("session_duration_s") or 30),
          "scrolled_percent": int(behavioral.get("scroll_depth_pct") or 50),
        }
      )
    return sessions

  def _fetch_cloudflare_sessions(
    self, integration: AnalyticsIntegration, zone_id: str, api_token: str
  ) -> list[dict]:
    """Cloudflare zone analytics with endpoint-derived fallback."""
    try:
      url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/analytics/dashboard"
      headers = {"Authorization": f"Bearer {api_token}", "Content-Type": "application/json"}
      params = {"since": "-1440", "until": "0"}
      response = requests.get(url, headers=headers, params=params, timeout=15)
      if response.status_code == 200:
        result = response.json().get("result", {})
        totals = result.get("totals", {})
        requests_total = int(totals.get("requests", {}).get("all", 0) or 0)
        if requests_total:
          return [
            {
              "session_id": "cf_aggregate",
              "ip": "0.0.0.0",
              "location": "Cloudflare Edge",
              "duration_seconds": 60,
              "scrolled_percent": 50,
              "requests": requests_total,
            }
          ]
    except Exception as exc:
      self.stderr.write(f"Cloudflare API unavailable, using derived sessions: {exc}")

    return self._fetch_clarity_sessions(integration, zone_id, api_token)

  def sync_microsoft_clarity(self, integration):
    credentials = integration.credentials
    project_id = credentials.get("project_id")
    api_key = credentials.get("api_key")

    if not project_id or not api_key:
      self.stderr.write("Microsoft Clarity credentials incomplete.")
      return

    # Clarity Data Export API when available; otherwise derive sessions from endpoint telemetry
    clarity_sessions = self._fetch_clarity_sessions(integration, project_id, api_key)

    self.stdout.write(
      self.style.SUCCESS(
        f"Processed {len(clarity_sessions)} Clarity sessions for {integration.user.username}"
      )
    )
    from account.context import account_id_for_user

    account_id = account_id_for_user(integration.user)

    for sess in clarity_sessions:
      rep = self.check_ip_reputation(sess["ip"])
      malicious_str = " [MALICIOUS]" if rep["is_malicious"] else ""
      self.stdout.write(
        f"  - Session {sess['session_id']} from {sess['location']} (IP: {sess['ip']}) - {sess['duration_seconds']}s"
        f" | Abuse Score: {rep['abuse_score']}% | OTX Pulses: {rep['otx_pulses']} | ISP: {rep['isp']}{malicious_str}"
      )

      # Ingest to telemetry pipeline (e.g. Redpanda/Kafka) if brokers are set
      try:
        import asyncio

        from utils.kafka import create_kafka_producer, send_kafka_value

        async def produce_telemetry(sess, rep, account_id=account_id):
          producer = create_kafka_producer()
          async with producer:
            payload = {
              "source": "microsoft_clarity_threat_intel",
              "account_id": account_id,
              "user_id": integration.user.id,
              "location": sess["location"],
              "ip": sess["ip"],
              "abuse_confidence_score": rep["abuse_score"],
              "otx_pulses": rep["otx_pulses"],
              "is_malicious": rep["is_malicious"],
              "raw_payload": {"session": sess, "reputation": rep},
              "timestamp": timezone.now().isoformat(),
            }
            await send_kafka_value(
              producer,
              "app-events",
              json.dumps(payload).encode("utf-8"),
            )

        asyncio.run(produce_telemetry(sess, rep))
      except Exception:
        pass

  def sync_cloudflare_analytics(self, integration):
    credentials = integration.credentials
    project_id = credentials.get("project_id")
    api_key = credentials.get("api_key")

    if not project_id or not api_key:
      self.stderr.write("Cloudflare credentials incomplete.")
      return

    # Cloudflare GraphQL analytics when zone configured; endpoint-derived fallback otherwise
    cf_sessions = self._fetch_cloudflare_sessions(integration, project_id, api_key)

    from account.context import account_id_for_user

    account_id = account_id_for_user(integration.user)

    self.stdout.write(
      self.style.SUCCESS(
        f"Processed {len(cf_sessions)} Cloudflare sessions for {integration.user.username}"
      )
    )
    for sess in cf_sessions:
      rep = self.check_ip_reputation(sess["ip"])
      malicious_str = " [MALICIOUS]" if rep["is_malicious"] else ""
      self.stdout.write(
        f"  - Session {sess['session_id']} from {sess['location']} (IP: {sess['ip']}) - {sess['duration_seconds']}s"
        f" | Abuse Score: {rep['abuse_score']}% | OTX Pulses: {rep['otx_pulses']} | ISP: {rep['isp']}{malicious_str}"
      )

      # Ingest to telemetry pipeline (e.g. Redpanda/Kafka) if brokers are set
      try:
        import asyncio

        from utils.kafka import create_kafka_producer, send_kafka_value

        async def produce_telemetry(sess, rep, account_id=account_id):
          producer = create_kafka_producer()
          async with producer:
            payload = {
              "source": "cloudflare_threat_intel",
              "account_id": account_id,
              "user_id": integration.user.id,
              "location": sess["location"],
              "ip": sess["ip"],
              "abuse_confidence_score": rep["abuse_score"],
              "otx_pulses": rep["otx_pulses"],
              "is_malicious": rep["is_malicious"],
              "raw_payload": {"session": sess, "reputation": rep},
              "timestamp": timezone.now().isoformat(),
            }
            await send_kafka_value(
              producer,
              "app-events",
              json.dumps(payload).encode("utf-8"),
            )

        asyncio.run(produce_telemetry(sess, rep))
      except Exception:
        pass
