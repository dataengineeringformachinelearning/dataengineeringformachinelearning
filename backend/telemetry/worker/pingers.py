"""Active HTTP pingers for monitored services."""

from __future__ import annotations

import asyncio
import datetime
import ssl
import time
import urllib.error
import urllib.request

from asgiref.sync import sync_to_async
from django.db import close_old_connections
from monitor.models import Endpoints, MonitoredService
from utils.service_urls import (
  ensure_platform_monitored_services,
  endpoint_storage_url,
  resolve_ping_url,
)


def ensure_platform_services(stdout, style) -> int:
  count = ensure_platform_monitored_services()
  if count:
    stdout.write(style.SUCCESS(f"Synced {count} platform-status monitored service(s)"))
  return count


@sync_to_async
def ping_services():
  close_old_connections()
  try:
    services = MonitoredService.objects.select_related("status_page").all()
    scope_targets: dict = {}

    for s in services:
      page = s.status_page
      if not page or not s.url:
        continue
      scope_key = ("platform", None) if page.is_platform else ("user", page.user_id)
      if scope_key not in scope_targets:
        scope_targets[scope_key] = {
          "user": page.user,
          "is_platform": page.is_platform,
          "targets": {},
        }
      ping_url = resolve_ping_url(s.url, s.name)
      store_url = endpoint_storage_url(s.url, is_platform=page.is_platform)
      scope_targets[scope_key]["targets"][ping_url] = store_url

    for scope in scope_targets.values():
      for ping_url, store_url in scope["targets"].items():
        start_time = time.time()
        status_code = 503
        is_active = False
        try:
          req = urllib.request.Request(
            ping_url, headers={"User-Agent": "PlatformStatusAutoPinger/1.0"}
          )
          ctx = ssl.create_default_context()
          ctx.check_hostname = False
          ctx.verify_mode = ssl.CERT_NONE
          # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
          with urllib.request.urlopen(req, timeout=5, context=ctx) as response:
            status_code = response.getcode()
            is_active = 200 <= status_code < 500
        except urllib.error.HTTPError as e:
          status_code = e.code
          is_active = 200 <= status_code < 500
        except Exception:
          status_code = 503
          is_active = False

        duration = datetime.timedelta(seconds=(time.time() - start_time))
        user = scope["user"]
        is_platform = scope["is_platform"]
        if not is_platform and not user:
          continue

        Endpoints.objects.create(
          user=None if is_platform else user,
          is_platform=is_platform,
          url=store_url,
          status_code=status_code,
          response_time=duration,
          ip_address="127.0.0.1",
          location="Localhost",
          asn="N/A",
          isp="Local Network",
          device_type="Bot",
          os_name="Unknown",
          browser_name="Unknown",
          is_bot=True,
          is_active=is_active,
        )
  finally:
    close_old_connections()


async def active_pinger_scheduler(stdout, stderr, style):
  stdout.write(style.SUCCESS("Starting active pinger scheduler..."))
  await sync_to_async(ensure_platform_services)(stdout, style)
  await asyncio.sleep(15)
  while True:
    try:
      await ping_services()
    except Exception as e:
      stderr.write(style.ERROR(f"Error in automatic pinger task: {e}"))
    await asyncio.sleep(30)
