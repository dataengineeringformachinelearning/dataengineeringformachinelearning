import datetime
import io
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.management.color import no_style
from monitor.models import LighthouseScan, MonitoredService, StatusPage, UserProfile

from telemetry.tasks.lighthouse_scanner import LighthouseScanner
from telemetry.worker.schedulers import run_lighthouse_scans_sync

User = get_user_model()


@pytest.mark.django_db
def test_lighthouse_scheduler_materializes_every_site_with_native_account_scopes() -> None:
  now = datetime.datetime(2026, 7, 15, 19, 37, tzinfo=datetime.timezone.utc)
  scan_bucket = now.replace(minute=0, second=0, microsecond=0)
  user = User.objects.create(username="lighthouse-operator")
  profile = UserProfile.objects.create(user=user, role="Operator")
  user_page = StatusPage.objects.create(
    user=user,
    is_platform=False,
    title="Customer status",
    slug="lighthouse-customer-status",
  )
  shared_user_page = StatusPage.objects.create(
    user=user,
    is_platform=False,
    title="Customer secondary status",
    slug="lighthouse-customer-secondary-status",
  )
  platform_page = StatusPage.objects.create(
    user=None,
    is_platform=True,
    title="Platform status",
    slug="lighthouse-platform-status",
  )
  user_primary_url = "https://customer.example.test/"
  user_secondary_url = "https://api.customer.example.test/health"
  platform_url = "https://platform.example.test/"
  MonitoredService.objects.create(
    status_page=user_page,
    name="Customer web",
    url=user_primary_url,
  )
  MonitoredService.objects.create(
    status_page=user_page,
    name="Customer web duplicate",
    url=user_primary_url,
  )
  MonitoredService.objects.create(
    status_page=user_page,
    name="Customer API",
    url=user_secondary_url,
  )
  MonitoredService.objects.create(
    status_page=shared_user_page,
    name="Shared customer web",
    url=user_primary_url,
  )
  MonitoredService.objects.create(
    status_page=platform_page,
    name="Platform web",
    url=platform_url,
  )

  stdout = io.StringIO()
  with (
    patch("telemetry.worker.schedulers.timezone.now", return_value=now),
    patch.object(
      LighthouseScanner,
      "scan_url",
      return_value={
        "performance": 91.0,
        "accessibility": 92.0,
        "best_practices": 93.0,
        "seo": 94.0,
      },
    ) as scan_url,
  ):
    run_lighthouse_scans_sync(stdout, no_style())
    scan_url.return_value = {
      "performance": 88.5,
      "accessibility": 120.0,
      "best_practices": float("nan"),
      "seo": -2.0,
    }
    run_lighthouse_scans_sync(stdout, no_style())

  assert LighthouseScan.objects.count() == 4
  assert LighthouseScan.objects.filter(status_page=user_page).count() == 2
  assert LighthouseScan.objects.filter(status_page=shared_user_page).count() == 1
  assert LighthouseScan.objects.filter(status_page=platform_page).count() == 1
  assert set(LighthouseScan.objects.values_list("scanned_at", flat=True)) == {scan_bucket}

  user_scans = LighthouseScan.objects.filter(is_platform=False)
  assert user_scans.count() == 3
  assert not user_scans.exclude(user=user, account_id=profile.account_id).exists()
  platform_scan = LighthouseScan.objects.get(is_platform=True)
  assert platform_scan.user is None
  assert platform_scan.account_id == platform_page.id

  for scan in LighthouseScan.objects.all():
    assert scan.performance == 88.5
    assert scan.accessibility == 100.0
    assert scan.best_practices == 0.0
    assert scan.seo == 0.0

  assert scan_url.call_count == 6
  observed_scopes = {(call.args[0], call.kwargs["account_id"]) for call in scan_url.call_args_list}
  assert observed_scopes == {
    (user_primary_url, str(profile.account_id)),
    (user_secondary_url, str(profile.account_id)),
    (platform_url, str(platform_page.id)),
  }
  assert all(account_id != "platform" for _, account_id in observed_scopes)
