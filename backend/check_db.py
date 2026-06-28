import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from account.platform import get_platform_status_page
from monitor.models import Endpoints, MonitoredService, StatusPage

page = get_platform_status_page()
if not page:
  print("No platform status page found!")
else:
  print(f"Platform Status Page: {page.title}")
  pages = StatusPage.objects.filter(is_platform=True)
  print(f"Status Pages count: {pages.count()}")
  for p in pages:
    print(f" - Page: {p.title}")
  urls = list(MonitoredService.objects.filter(status_page=page).values_list("url", flat=True))
  print(f"MonitoredService URLs: {urls}")
  eps = Endpoints.objects.filter(url__in=urls, is_platform=True).count()
  print(f"Endpoints matching URLs count: {eps}")
  print(f"Total Endpoints count: {Endpoints.objects.count()}")

  print("Sample Endpoints (up to 5):")
  for e in Endpoints.objects.all()[:5]:
    print(f"  {e.url} (status={e.status_code}, tested={e.last_tested})")
