import logging

import requests
from django.core.cache import cache
from ipwhois import IPWhois
from user_agents import parse

logger = logging.getLogger(__name__)


def parse_user_agent(ua_string):
  """
  Parses a User-Agent string to extract device, OS, browser, and bot status.
  """
  if not ua_string:
    return {
      "device_type": "Unknown",
      "os_name": "Unknown",
      "browser_name": "Unknown",
      "is_bot": False,
    }

  try:
    user_agent = parse(ua_string)

    device_type = "Desktop"
    if user_agent.is_mobile:
      device_type = "Mobile"
    elif user_agent.is_tablet:
      device_type = "Tablet"
    elif user_agent.is_bot:
      device_type = "Bot"

    return {
      "device_type": device_type,
      "os_name": user_agent.os.family,
      "browser_name": user_agent.browser.family,
      "is_bot": user_agent.is_bot,
    }
  except Exception as e:
    logger.warning(f"Error parsing User-Agent '{ua_string}': {e}")
    return {
      "device_type": "Unknown",
      "os_name": "Unknown",
      "browser_name": "Unknown",
      "is_bot": False,
    }


def get_ip_enrichment(ip_address):
  """
  Looks up IP metadata using free providers. Uses Django caching to prevent
  rate limits from being hit for frequent IPs.
  Returns a dict with location, asn, and isp.
  """
  if not ip_address or ip_address in ["127.0.0.1", "localhost", "::1"]:
    return {"location": "Localhost", "asn": "N/A", "isp": "Local Network"}

  cache_key = f"ip_enrich_{ip_address}"
  cached_data = cache.get(cache_key)
  if cached_data:
    return cached_data

  enrichment_data = {"location": "Unknown", "asn": "Unknown", "isp": "Unknown"}

  # 1. GeoIP lookup using ipwho.is (Supports HTTPS for free tier)
  try:
    response = requests.get(f"https://ipwho.is/{ip_address}", timeout=3)
    if response.status_code == 200:
      data = response.json()
      if data.get("success") is True:
        country = data.get("country", "")
        city = data.get("city", "")
        enrichment_data["location"] = f"{city}, {country}".strip(", ")

        connection = data.get("connection", {})
        enrichment_data["isp"] = connection.get("isp", "Unknown")
        asn_num = connection.get("asn")
        enrichment_data["asn"] = f"AS{asn_num}" if asn_num else "Unknown"
  except Exception as e:
    logger.warning(f"GeoIP lookup failed for IP {ip_address}: {e}")

  # 2. Fallback to IPWhois if ASN is missing
  if enrichment_data["asn"] == "Unknown":
    try:
      obj = IPWhois(ip_address)
      res = obj.lookup_rdap(depth=1)
      enrichment_data["asn"] = f"AS{res.get('asn')}" if res.get("asn") else "Unknown"
      # Get the first network's description as a fallback for ISP
      network_desc = None
      if res.get("network") and res["network"].get("name"):
        network_desc = res["network"]["name"]
      enrichment_data["isp"] = network_desc or "Unknown"
    except Exception as e:
      logger.warning(f"IPWhois lookup failed for IP {ip_address}: {e}")

  # Cache for 24 hours
  cache.set(cache_key, enrichment_data, 60 * 60 * 24)

  return enrichment_data
