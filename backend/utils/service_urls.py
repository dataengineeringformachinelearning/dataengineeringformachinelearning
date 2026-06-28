"""Resolve monitored service URLs to stable health-check targets."""

from __future__ import annotations

import re
from urllib.parse import urlparse

from django.conf import settings

# Single source of truth for platform-status monitored rows (name → canonical URL).
PLATFORM_CANONICAL_SERVICE_NAMES: frozenset[str] = frozenset(
  {
    "Django Web Server",
    "Marketing Web Server",
    "Auth User",
    "Auth Register",
    "ML Engine Latest",
    "Telemetry Cookie Consent",
    "Status Pages",
    "Status Pages Slug Platform Status",
  }
)

_LEGACY_PLATFORM_SERVICE_NAMES: frozenset[str] = frozenset(
  {
    "Model Latest",
    "Angular Web App",
    "Landing Page",
    "Status Pages Incidents",
    "Status Pages Services",
    "Redpanda Broker",
  }
)

_STALE_URL_FRAGMENTS: tuple[str, ...] = (
  "/api/v1/auth/register",
  "/api/v1/model/latest",
  "/api/v1/telemetry/cookie-consent",
  "/api/v1/monitor/",
  "/api/v1/system-status/health",
)

_UUID_RE = re.compile(
  r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.IGNORECASE
)


def _frontend_base() -> str:
  return (getattr(settings, "FRONTEND_URL", "") or "https://deml.app").rstrip("/")


def _marketing_base() -> str:
  return (
    getattr(settings, "MARKETING_URL", "") or "https://dataengineeringformachinelearning.com"
  ).rstrip("/")


def get_normalized_service_info(url_str: str) -> tuple[str, str]:
  """Map a raw telemetry or monitored URL to a canonical frontend page + service name."""
  if not url_str:
    return f"{_frontend_base()}/", "Django Web Server"

  if "9092" in url_str:
    return url_str, "Redpanda Broker"

  parsed = urlparse(url_str)
  domain = f"{parsed.scheme}://{parsed.netloc}" if parsed.netloc else _frontend_base()

  base_domain = _frontend_base()
  if "dataengineeringformachinelearning.com" in domain:
    base_domain = _marketing_base()
  elif "deml.app" in domain:
    base_domain = _frontend_base()

  path = parsed.path.strip("/")
  norm_url = f"{base_domain}/"
  name = "Django Web Server"
  if "dataengineeringformachinelearning.com" in base_domain:
    name = "Marketing Web Server"

  if "system-status/health" in path:
    norm_url = f"{base_domain}/"
    name = (
      "Django Web Server"
      if "dataengineeringformachinelearning.com" not in base_domain
      else "Marketing Web Server"
    )
  elif "auth/user" in path:
    norm_url = f"{base_domain}/settings"
    name = "Auth User"
  elif "auth/register" in path:
    norm_url = f"{base_domain}/login"
    name = "Auth Register"
  elif "ml/latest" in path or "model/latest" in path:
    norm_url = f"{_frontend_base()}/api/v1/ml/latest"
    name = "ML Engine Latest"
  elif "telemetry/cookie-consent" in path:
    norm_url = f"{base_domain}/privacy"
    name = "Telemetry Cookie Consent"
  elif "status_pages" in path:
    if "services" in path:
      norm_url = f"{base_domain}/status"
      name = "Status Pages Services"
    elif "incidents" in path:
      norm_url = f"{base_domain}/status"
      name = "Status Pages Incidents"
    elif "slug" in path:
      norm_url = f"{base_domain}/status"
      name = "Status Pages Slug Platform Status"
    else:
      norm_url = f"{base_domain}/settings"
      name = "Status Pages"

  return norm_url, name


def resolve_ping_url(url_str: str, service_name: str | None = None) -> str:
  """Return the URL the active pinger should request for a monitored service."""
  if not url_str:
    return f"{_frontend_base()}/"

  parsed = urlparse(url_str)
  path = parsed.path or "/"

  # Legacy/stale MonitoredService rows may store raw API paths — rewrite before probing.
  if "/api/v1/auth/register" in path:
    return f"{_frontend_base()}/login"
  if "/api/v1/model/latest" in path:
    return url_str.replace("/model/latest", "/ml/latest")
  if "/api/v1/telemetry/cookie-consent" in path:
    return f"{_frontend_base()}/api/v1/telemetry/cookie-consent"
  if "/api/v1/auth/user" in path:
    return url_str

  normalized, _ = get_normalized_service_info(url_str)
  if service_name and service_name in {
    "Auth Register",
    "Telemetry Cookie Consent",
    "ML Engine Latest",
    "Auth User",
  }:
    return normalized

  return normalized if normalized != f"{_frontend_base()}/" or not parsed.path else url_str


def metrics_url_for_service(url_str: str, *, is_platform: bool) -> str:
  """URL key used for Endpoints / SLA lookups (normalized on platform-status only)."""
  if not is_platform:
    return url_str
  canonical, _ = get_normalized_service_info(url_str)
  return canonical


def _platform_canonical_rows() -> list[tuple[str, str]]:
  frontend = _frontend_base()
  marketing = _marketing_base()
  return [
    ("Django Web Server", f"{frontend}/"),
    ("Marketing Web Server", f"{marketing}/"),
    ("Auth User", f"{frontend}/settings"),
    ("Auth Register", f"{frontend}/login"),
    ("ML Engine Latest", f"{frontend}/api/v1/ml/latest"),
    ("Telemetry Cookie Consent", f"{frontend}/privacy"),
    (
      "Status Pages Slug Platform Status",
      f"{frontend}/api/v1/system-status/status_pages/slug/platform-status",
    ),
    ("Status Pages", f"{frontend}/api/v1/system-status/status_pages"),
  ]


def _is_stale_platform_service(name: str, url: str) -> bool:
  if name in _LEGACY_PLATFORM_SERVICE_NAMES:
    return True
  if name not in PLATFORM_CANONICAL_SERVICE_NAMES:
    return True
  if _UUID_RE.search(name) or _UUID_RE.search(url or ""):
    return True
  if any(fragment in (url or "") for fragment in _STALE_URL_FRAGMENTS):
    return True
  return False


def _dedupe_platform_services_by_name(page) -> int:
  """Remove duplicate MonitoredService rows (same name) — get_or_create raises on multiples."""
  from monitor.models import MonitoredService

  removed = 0
  for name in (
    MonitoredService.objects.filter(status_page=page).values_list("name", flat=True).distinct()
  ):
    qs = MonitoredService.objects.filter(status_page=page, name=name).order_by("-created_at")
    if qs.count() > 1:
      keep = qs.first()
      removed += qs.exclude(id=keep.id).delete()[0]
  return removed


def ensure_platform_monitored_services() -> int:
  """Upsert canonical platform-status services and prune telemetry/auto-created duplicates."""
  from account.platform import ensure_platform_status_page
  from monitor.models import MonitoredService

  page = ensure_platform_status_page()
  canonical = _platform_canonical_rows()
  canonical_names = {name for name, _ in canonical}

  updated = _dedupe_platform_services_by_name(page)

  for name, url in canonical:
    qs = MonitoredService.objects.filter(status_page=page, name=name).order_by("-created_at")
    service = qs.first()
    if service is None:
      MonitoredService.objects.create(status_page=page, name=name, url=url)
      updated += 1
    else:
      if service.url != url:
        service.url = url
        service.save(update_fields=["url"])
        updated += 1
      if qs.count() > 1:
        updated += qs.exclude(id=service.id).delete()[0]

  for service in MonitoredService.objects.filter(status_page=page):
    if service.name not in canonical_names or _is_stale_platform_service(
      service.name, service.url or ""
    ):
      service.delete()
      updated += 1

  return updated
