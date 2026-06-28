"""Platform showcase scope — not a login account; public metrics only."""

from __future__ import annotations

PLATFORM_STATUS_SLUG = "platform-status"
PLATFORM_ACCOUNT_ID = "platform"


def get_platform_status_page():
  from monitor.models import StatusPage

  return StatusPage.objects.filter(slug=PLATFORM_STATUS_SLUG, is_platform=True).first()


def ensure_platform_status_page():
  """Ensure the public platform-status page exists (user=null, no login)."""
  from monitor.models import StatusPage

  page, _ = StatusPage.objects.get_or_create(
    slug=PLATFORM_STATUS_SLUG,
    defaults={
      "user": None,
      "is_platform": True,
      "title": "Platform Status",
      "description": ("Monitoring system health and telemetry pipelines for the DEML platform."),
      "is_published": True,
    },
  )
  if not page.is_platform:
    page.is_platform = True
    page.is_published = True
    page.save(update_fields=["is_platform", "is_published"])
  return page
