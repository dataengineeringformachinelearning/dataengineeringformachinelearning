"""Resolve monitored service URLs to stable health-check targets."""

from __future__ import annotations

from urllib.parse import urlparse

from django.conf import settings


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


def ensure_platform_monitored_services() -> int:
  """Upsert canonical platform-status services and remove stale API-path duplicates."""
  from django.contrib.auth.models import User
  from monitor.models import MonitoredService, StatusPage, Tenant

  frontend = _frontend_base()
  marketing = _marketing_base()

  tenant = Tenant.objects.filter(is_platform_tenant=True).first()
  if not tenant:
    return 0

  page = StatusPage.objects.filter(slug="platform-status").first()
  if not page:
    default_user = User.objects.first()
    if not default_user:
      return 0
    page = StatusPage.objects.create(
      tenant=tenant,
      user=default_user,
      title="Platform Status",
      slug="platform-status",
      description="Monitoring system health and telemetry pipelines for the DEML platform.",
      is_published=True,
    )

  canonical = [
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

  updated = 0
  for name, url in canonical:
    service, created = MonitoredService.objects.get_or_create(
      status_page=page,
      name=name,
      defaults={"url": url},
    )
    if not created and service.url != url:
      service.url = url
      service.save(update_fields=["url"])
      updated += 1
    elif created:
      updated += 1

  stale_paths = (
    "/api/v1/auth/register",
    "/api/v1/model/latest",
    "/api/v1/telemetry/cookie-consent",
  )
  for service in MonitoredService.objects.filter(status_page=page):
    if any(fragment in (service.url or "") for fragment in stale_paths):
      service.delete()
      updated += 1

  return updated
