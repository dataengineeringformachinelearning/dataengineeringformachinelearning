import logging
import re

import requests
from django.core.cache import cache

logger = logging.getLogger(__name__)


def parse_user_agent(ua_string):
  """
  Parses a User-Agent string to extract device, OS, browser, and bot status using native regex.
  """
  if not ua_string:
    return {
      "device_type": "Unknown",
      "os_name": "Unknown",
      "browser_name": "Unknown",
      "is_bot": False,
    }

  ua_lower = ua_string.lower()

  # Bot detection
  is_bot = bool(re.search(r"bot|spider|crawl|slurp|wget|curl", ua_lower))

  # Device type detection
  device_type = "Desktop"
  if is_bot:
    device_type = "Bot"
  elif re.search(r"tablet|ipad|playbook|silk", ua_lower):
    device_type = "Tablet"
  elif re.search(r"mobile|android|iphone|ipod|windows phone", ua_lower):
    device_type = "Mobile"

  # Basic OS detection
  os_name = "Unknown"
  if "windows" in ua_lower:
    os_name = "Windows"
  elif "mac os x" in ua_lower or "macintosh" in ua_lower:
    os_name = "Mac OS X"
  elif "android" in ua_lower:
    os_name = "Android"
  elif "ios" in ua_lower or "iphone" in ua_lower or "ipad" in ua_lower:
    os_name = "iOS"
  elif "linux" in ua_lower:
    os_name = "Linux"

  # Basic Browser detection
  browser_name = "Unknown"
  if "chrome" in ua_lower and "edg" not in ua_lower and "opr" not in ua_lower:
    browser_name = "Chrome"
  elif "safari" in ua_lower and "chrome" not in ua_lower:
    browser_name = "Safari"
  elif "firefox" in ua_lower:
    browser_name = "Firefox"
  elif "edg" in ua_lower:
    browser_name = "Edge"
  elif "opr" in ua_lower or "opera" in ua_lower:
    browser_name = "Opera"

  return {
    "device_type": device_type,
    "os_name": os_name,
    "browser_name": browser_name,
    "is_bot": is_bot,
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

  # GeoIP lookup using ipwho.is (Supports HTTPS for free tier)
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

  # Cache for 24 hours
  cache.set(cache_key, enrichment_data, 60 * 60 * 24)

  return enrichment_data
