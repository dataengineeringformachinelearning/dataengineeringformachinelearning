import datetime
import logging
import os
import threading
import time
import urllib.error
import urllib.request

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class MonitorConfig(AppConfig):
  default_auto_field = "django.db.models.BigAutoField"
  name = "monitor"

  def ready(self):
    # Only start background thread in the main thread (skip Django reloader)
    if os.environ.get("RUN_MAIN") == "true" or not os.environ.get("DJANGO_SETTINGS_MODULE"):
      threading.Thread(target=self.start_pinger, daemon=True).start()

  def start_pinger(self):
    # Give the app database and server a moment to boot
    time.sleep(10)
    while True:
      try:
        self.ping_services()
      except Exception as e:
        logger.error(f"Error in automatic pinger thread: {e}")
      time.sleep(30)

  def ping_services(self):
    from monitor.models import Endpoints, MonitoredService

    services = MonitoredService.objects.all()
    urls = {s.url for s in services if s.url}

    for url in urls:
      start_time = time.time()
      status_code = 503
      is_active = False
      try:
        req = urllib.request.Request(url, headers={"User-Agent": "PlatformStatusAutoPinger/1.0"})
        import ssl

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

      Endpoints.objects.create(
        url=url,
        status_code=status_code,
        response_time=duration,
        ip_address="127.0.0.1",
        is_active=is_active,
      )
