import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from monitor.models import Endpoints, MonitoredService, StatusPage, Tenant

t = Tenant.objects.filter(is_platform_tenant=True).first()
if not t:
  print("No platform tenant found!")
else:
  print(f"Platform Tenant: {t.name}")
  pages = StatusPage.objects.filter(tenant=t)
  print(f"Status Pages count: {pages.count()}")
  for p in pages:
    print(f" - Page: {p.name}")
  urls = list(MonitoredService.objects.filter(status_page__in=pages).values_list("url", flat=True))
  print(f"MonitoredService URLs: {urls}")
  eps = Endpoints.objects.filter(url__in=urls).count()
  print(f"Endpoints matching URLs count: {eps}")
  print(f"Total Endpoints count: {Endpoints.objects.count()}")

  print("Sample Endpoints (up to 5):")
  for e in Endpoints.objects.all()[:5]:
    print(f"  {e.url} (status={e.status_code}, tested={e.last_tested})")
