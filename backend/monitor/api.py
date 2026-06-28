import datetime
import logging

logger = logging.getLogger(__name__)

from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.errors import HttpError
from utils.audit import log_audit_event
from utils.kafka import get_kafka_brokers
from utils.permissions import require_auth, require_owner_page, role_required

from monitor.access import (
  check_mfa_satisfied,
  check_status_page_access,
  forbid_platform_page,
  is_valid_slug,
)
from monitor.models import Endpoints, MonitoredService, StatusPage
from monitor.services.metrics import MetricsService

router = Router()

from monitor.routers.integrations import router as integrations_router

router.add_router("/integrations", integrations_router)


class EndpointOut(Schema):
  id: str
  url: str
  last_tested: datetime.datetime
  status_code: int
  response_time: str
  ip_address: str | None
  is_active: bool


@router.get("/endpoints", response=list[EndpointOut])
def get_all_endpoints(request):
  if not request.user.is_authenticated:
    return []

  user_pages = StatusPage.objects.filter(user=request.user)
  user_urls = MonitoredService.objects.filter(status_page__in=user_pages).values_list(
    "url", flat=True
  )
  endpoints = Endpoints.objects.filter(url__in=user_urls)
  data = []
  for endpoint in endpoints:
    data.append(
      {
        "id": str(endpoint.id),
        "url": endpoint.url,
        "last_tested": endpoint.last_tested,
        "status_code": endpoint.status_code,
        "response_time": str(endpoint.response_time),
        "ip_address": endpoint.ip_address,
        "is_active": endpoint.is_active,
      }
    )
  return data


class StatusPageIn(Schema):
  title: str
  slug: str
  description: str | None = ""
  is_published: bool | None = False
  google_analytics_id: str | None = None
  microsoft_clarity_id: str | None = None
  cloudflare_analytics_id: str | None = None


class UptimeDaySchema(Schema):
  status: str
  uptime: float


class StatusPageOut(Schema):
  id: str
  title: str
  slug: str
  description: str
  is_published: bool
  google_analytics_id: str | None = None
  microsoft_clarity_id: str | None = None
  cloudflare_analytics_id: str | None = None
  created_at: datetime.datetime
  user_id: int | None = None
  is_pro_verified: bool = False
  cumulative_sla: float | None = None
  overall_uptime: float | None = None
  uptime_history: list[UptimeDaySchema] | None = None
  p99_latency: float | None = None
  total_requests: int | None = None


@router.get("/health")
def api_health(request):
  return {"status": "ok"}


@router.get("/status_pages", response=list[StatusPageOut])
def list_status_pages(request):
  # Auto-create default page if it doesn't exist
  if not StatusPage.objects.filter(slug="platform-status").exists():
    from account.platform import ensure_platform_status_page
    from django.db import IntegrityError, transaction

    try:
      with transaction.atomic():
        page = ensure_platform_status_page()
        if not MonitoredService.objects.filter(status_page=page).exists():
          from django.conf import settings

          frontend_url = (getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")
          MonitoredService.objects.get_or_create(
            status_page=page,
            name="Django Web Server",
            defaults={"url": f"{frontend_url}/"},
          )

          brokers = get_kafka_brokers()
          broker_host = brokers.split(",")[0]
          broker_url = (
            broker_host
            if (broker_host.startswith("http://") or broker_host.startswith("https://"))
            else f"http://{broker_host}"
          )

          MonitoredService.objects.get_or_create(
            status_page=page, name="Redpanda Broker", defaults={"url": broker_url}
          )
    except IntegrityError:
      # If another thread/worker created it concurrently, we can safely ignore and proceed
      pass

  from django.db.models import Q

  if request.user.is_authenticated:
    pages = (
      StatusPage.objects.filter(
        Q(is_published=True) | Q(user=request.user) | Q(slug="platform-status")
      )
      .distinct()
      .select_related("user__profile")
      .prefetch_related("services")
    )
  else:
    pages = (
      StatusPage.objects.filter(Q(is_published=True) | Q(slug="platform-status"))
      .distinct()
      .select_related("user__profile")
      .prefetch_related("services")
    )

  return [_build_status_page_out(p) for p in pages]


def _build_status_page_out(p: StatusPage) -> StatusPageOut:
  """Project status page + rollup metrics (AggregatedAnalytics first for 24h)."""
  from monitor.subscription import owner_has_pro_subscription

  urls = list(p.services.values_list("url", flat=True))
  metrics = MetricsService.for_urls(
    urls,
    user=p.user,
    is_platform=p.is_platform or p.slug == "platform-status",
  )
  return StatusPageOut(
    id=str(p.id),
    title=p.title,
    slug=p.slug,
    description=p.description,
    is_published=p.is_published,
    google_analytics_id=p.google_analytics_id,
    microsoft_clarity_id=p.microsoft_clarity_id,
    cloudflare_analytics_id=p.cloudflare_analytics_id,
    created_at=p.created_at,
    user_id=p.user_id,
    is_pro_verified=owner_has_pro_subscription(p),
    cumulative_sla=metrics.cumulative_sla,
    overall_uptime=metrics.overall_uptime,
    uptime_history=[
      UptimeDaySchema(status=day.status, uptime=day.uptime) for day in metrics.uptime_history
    ],
    p99_latency=metrics.p99_latency,
    total_requests=metrics.total_requests,
  )


@router.get("/status_pages/slug/{slug}", response=StatusPageOut)
def get_status_page_by_slug(request, slug: str):
  from django.db.models import Q

  if request.user.is_authenticated:
    page = get_object_or_404(
      StatusPage.objects.select_related("user__profile").prefetch_related("services"),
      Q(slug=slug) & (Q(is_published=True) | Q(user=request.user) | Q(slug="platform-status")),
    )
  else:
    page = get_object_or_404(
      StatusPage.objects.select_related("user__profile").prefetch_related("services"),
      Q(slug=slug) & (Q(is_published=True) | Q(slug="platform-status")),
    )
  return _build_status_page_out(page)


@router.post("/status_pages", response=StatusPageOut)
@role_required(["Operator", "Security Admin"])
def create_status_page(request, payload: StatusPageIn):
  if not check_mfa_satisfied(request):
    raise HttpError(403, "Multi-factor authentication required")
  if not is_valid_slug(payload.slug):
    raise HttpError(
      400,
      "Invalid slug format. Only alphanumeric characters, hyphens, and underscores are allowed.",
    )
  if StatusPage.objects.filter(slug=payload.slug).exists():
    raise HttpError(400, "Slug already exists")
  page = StatusPage.objects.create(
    user=request.user,
    title=payload.title,
    slug=payload.slug,
    description=payload.description or "",
    is_published=payload.is_published or False,
    google_analytics_id=payload.google_analytics_id,
    microsoft_clarity_id=payload.microsoft_clarity_id,
    cloudflare_analytics_id=payload.cloudflare_analytics_id,
  )
  log_audit_event(
    request,
    "STATUS_PAGE_CREATE",
    resource_id=str(page.id),
    details={"title": page.title, "slug": page.slug},
  )
  return _build_status_page_out(page)


@router.put("/status_pages/{page_id}", response=StatusPageOut)
@role_required(["Operator", "Security Admin"])
def update_status_page(request, page_id: str, payload: StatusPageIn):
  if not check_mfa_satisfied(request):
    raise HttpError(403, "Multi-factor authentication required")
  if not is_valid_slug(payload.slug):
    raise HttpError(
      400,
      "Invalid slug format. Only alphanumeric characters, hyphens, and underscores are allowed.",
    )
  page = get_object_or_404(StatusPage, id=page_id, user=request.user)
  forbid_platform_page(page)
  if StatusPage.objects.filter(slug=payload.slug).exclude(id=page.id).exists():
    raise HttpError(400, "Slug already exists")

  page.title = payload.title
  page.slug = payload.slug
  page.description = payload.description or ""
  if payload.is_published is not None:
    page.is_published = payload.is_published
  page.google_analytics_id = payload.google_analytics_id
  page.microsoft_clarity_id = payload.microsoft_clarity_id
  page.cloudflare_analytics_id = payload.cloudflare_analytics_id
  page.save()
  log_audit_event(
    request,
    "STATUS_PAGE_UPDATE",
    resource_id=str(page.id),
    details={"title": page.title, "slug": page.slug, "is_published": page.is_published},
  )
  return _build_status_page_out(page)


@router.delete("/status_pages/{page_id}")
@role_required(["Operator", "Security Admin"])
def delete_status_page(request, page_id: str):
  if not check_mfa_satisfied(request):
    raise HttpError(403, "Multi-factor authentication required")
  page = get_object_or_404(StatusPage, id=page_id)
  if page.slug == "platform-status" or page.is_platform:
    raise HttpError(403, "Cannot delete system platform-status page")
  if page.user_id != request.user.id:
    raise HttpError(404, "Status page not found")
  log_audit_event(
    request,
    "STATUS_PAGE_DELETE",
    resource_id=page_id,
    details={"title": page.title, "slug": page.slug},
  )
  page.delete()
  return {"success": True}


class MonitoredServiceIn(Schema):
  name: str
  url: str


class MonitoredServiceOut(Schema):
  id: str
  name: str
  url: str
  status_page_id: str
  created_at: datetime.datetime
  status: str | None = "Operational"
  sla: float | None = 100.0


@router.get("/status_pages/{page_id}/services", response=list[MonitoredServiceOut])
def list_services(request, page_id: str):
  page = get_object_or_404(StatusPage, id=page_id)
  if not check_status_page_access(request, page):
    raise HttpError(403, "Permission denied")
  is_platform = page.is_platform or page.slug == "platform-status"
  if is_platform:
    from utils.service_urls import ensure_platform_monitored_services

    ensure_platform_monitored_services()
  services = page.services.order_by("name")
  from utils.service_urls import metrics_url_for_service

  out = []
  for s in services:
    metrics_url = metrics_url_for_service(s.url, is_platform=is_platform)
    endpoint_qs = Endpoints.objects.filter(url=metrics_url).exclude(status_code=0)
    if is_platform:
      endpoint_qs = endpoint_qs.filter(is_platform=True, user__isnull=True)
    elif page.user_id:
      endpoint_qs = endpoint_qs.filter(user=page.user, is_platform=False)
    latest_log = endpoint_qs.order_by("-last_tested").first()
    status = "Operational"
    if latest_log and (not latest_log.is_active or latest_log.status_code >= 500):
      status = "Outage"

    sla = MetricsService.for_urls(
      [metrics_url], user=page.user, is_platform=is_platform
    ).cumulative_sla

    out.append(
      MonitoredServiceOut(
        id=str(s.id),
        name=s.name,
        url=s.url,
        status_page_id=str(s.status_page_id),
        created_at=s.created_at,
        status=status,
        sla=sla,
      )
    )

  # Surface automated synthetic checks (e.g. the Event Projections loop) as components
  # on the platform status page. These are recorded by the telemetry worker, not pinged
  # over HTTP, so they live in SyntheticMonitor rather than MonitoredService/Endpoints.
  if is_platform:
    from django.utils import timezone

    from monitor.models import SyntheticMonitor

    # If the worker stops reporting, the loop is effectively down.
    stale_after = datetime.timedelta(minutes=5)
    for sm in SyntheticMonitor.objects.all():
      sm_status = sm.status
      if timezone.now() - sm.checked_at > stale_after:
        sm_status = "Outage"
      out.append(
        MonitoredServiceOut(
          id=str(sm.id),
          name=sm.name,
          url="",
          status_page_id=str(page.id),
          created_at=sm.checked_at,
          status=sm_status,
          sla=100.0 if sm_status == "Operational" else 0.0,
        )
      )
  return out


@router.post("/status_pages/{page_id}/services", response=MonitoredServiceOut)
def add_service(request, page_id: str, payload: MonitoredServiceIn):
  require_auth(request)
  if not check_mfa_satisfied(request):
    raise HttpError(403, "Multi-factor authentication required")
  page = require_owner_page(page_id, request)

  # Check if a monitored service with this URL is already added to this status page
  if MonitoredService.objects.filter(status_page=page, url=payload.url).exists():
    raise HttpError(400, "This service URL is already monitored on this status page.")

  service = MonitoredService.objects.create(status_page=page, name=payload.name, url=payload.url)
  return MonitoredServiceOut(
    id=str(service.id),
    name=service.name,
    url=service.url,
    status_page_id=str(service.status_page_id),
    created_at=service.created_at,
    status="Operational",
    sla=100.0,
  )


@router.delete("/services/{service_id}")
def delete_service(request, service_id: str):
  require_auth(request)
  if not check_mfa_satisfied(request):
    raise HttpError(403, "Multi-factor authentication required")
  service = get_object_or_404(MonitoredService, id=service_id, status_page__user=request.user)
  forbid_platform_page(service.status_page)
  service.delete()
  return {"success": True}


from monitor.models import Incident


class IncidentIn(Schema):
  title: str
  message: str
  status: str


class IncidentOut(Schema):
  id: str
  title: str
  message: str
  status: str
  created_at: datetime.datetime
  updated_at: datetime.datetime
  status_page_id: str


@router.get("/status_pages/{page_id}/incidents", response=list[IncidentOut])
def list_incidents(request, page_id: str):
  page = get_object_or_404(StatusPage, id=page_id)
  if not check_status_page_access(request, page):
    raise HttpError(403, "Permission denied")
  incidents = page.incidents.all()
  out = []
  for inc in incidents:
    out.append(
      IncidentOut(
        id=str(inc.id),
        title=inc.title,
        message=inc.message,
        status=inc.status,
        created_at=inc.created_at,
        updated_at=inc.updated_at,
        status_page_id=str(inc.status_page_id),
      )
    )
  return out


@router.post("/status_pages/{page_id}/incidents", response=IncidentOut)
def create_incident(request, page_id: str, payload: IncidentIn):
  require_auth(request)
  if not check_mfa_satisfied(request):
    raise HttpError(403, "Multi-factor authentication required")
  page = require_owner_page(page_id, request)
  incident = Incident.objects.create(
    status_page=page, title=payload.title, message=payload.message, status=payload.status
  )

  # Send email alert to the owner via Resend
  if page.user and page.user.email:
    from config.email import send_resend_email
    from django.conf import settings

    subject = f"[Status Alert] {page.title}: {payload.title} ({payload.status})"
    # nosemgrep: python.django.security.injection.raw-html-format.raw-html-format
    html_content = f"""
        <p>A new incident update has been posted on status page <strong>{page.title}</strong>.</p>
        <p><strong>Title:</strong> {payload.title}</p>
        <p><strong>Status:</strong> {payload.status}</p>
        <p><strong>Details:</strong> {payload.message}</p>
        <hr>
        <p>Manage your status page details at <a href="{settings.FRONTEND_URL}/settings">Settings Console</a>.</p>
        """
    try:
      send_resend_email(page.user.email, subject, html_content)
    except Exception as e:
      logger.error("Failed to send email via Resend: %s", e)

  return IncidentOut(
    id=str(incident.id),
    title=incident.title,
    message=incident.message,
    status=incident.status,
    created_at=incident.created_at,
    updated_at=incident.updated_at,
    status_page_id=str(incident.status_page_id),
  )


@router.delete("/incidents/{incident_id}")
def delete_incident(request, incident_id: str):
  require_auth(request)
  if not check_mfa_satisfied(request):
    raise HttpError(403, "Multi-factor authentication required")
  incident = get_object_or_404(Incident, id=incident_id, status_page__user=request.user)
  forbid_platform_page(incident.status_page)
  incident.delete()
  return {"success": True}
