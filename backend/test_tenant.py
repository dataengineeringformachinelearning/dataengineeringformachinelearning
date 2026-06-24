import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from monitor.models import Tenant

try:
  Tenant.objects.get(id="example-tenant-id")
  print("Found")
except Tenant.DoesNotExist:
  print("Not found")
