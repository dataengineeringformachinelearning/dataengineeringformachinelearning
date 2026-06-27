import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db.models import Avg
from monitor.models import Endpoints

total_reqs = Endpoints.objects.count()
print(f"Total reqs: {total_reqs}")
agg = Endpoints.objects.aggregate(avg=Avg("response_time"))
print(f"Avg: {agg['avg']}")

if total_reqs > 0:
  latencies_qs = Endpoints.objects.values_list("response_time", flat=True).order_by("response_time")
  p99_idx = int(total_reqs * 0.99)
  # p99 is at the 99th percentile when sorted ascending
  p99_latency_obj = latencies_qs[p99_idx]
  print(f"P99 obj: {p99_latency_obj}")
