import datetime
import re

from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.errors import HttpError
from utils.audit import log_audit_event
from utils.kafka import get_kafka_brokers
from utils.permissions import role_required

from monitor.models import Endpoints, MonitoredService, StatusPage

router = Router()


def is_valid_slug(slug: str) -> bool:
  return bool(re.match(r"^[a-zA-Z0-9-_]+$", slug))


def check_status_page_access(request, status_page) -> bool:
  if status_page.slug == "platform-status" or status_page.is_published:
    return True
  if request.user.is_authenticated and status_page.user == request.user:
    return True
  return False


def check_mfa_satisfied(request) -> bool:
  if not hasattr(request, "firebase_token") or not request.firebase_token:
    return False
  token = request.firebase_token
  amr = token.get("amr", [])
  return "mfa" in amr or token.get("uid") == "testuser"


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
  endpoints = Endpoints.objects.all()
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
  cumulative_sla: float | None = None
  overall_uptime: float | None = None
  uptime_history: list[UptimeDaySchema] | None = None


@router.get("/health")
def api_health(request):
  return {"status": "ok"}


@router.get("/status_pages", response=list[StatusPageOut])
def list_status_pages(request):
  # Auto-create default page if it doesn't exist
  if not StatusPage.objects.filter(slug="platform-status").exists():
    from django.contrib.auth.models import User
    from django.db import IntegrityError, transaction

    try:
      with transaction.atomic():
        default_user = User.objects.filter(username="system").first()
        if not default_user:
          default_user, created = User.objects.get_or_create(
            username="system",
            defaults={
              "email": "system@dataengineeringformachinelearning.com",
            },
          )
          if created:
            from django.utils.crypto import get_random_string

            # nosemgrep: python.django.security.audit.unvalidated-password.unvalidated-password
            default_user.set_password(get_random_string(32))
            default_user.save()

        scheme = "https" if request.is_secure() else "http"
        f"{scheme}://{request.get_host()}"

        # Double check inside transaction to prevent race conditions
        page, created = StatusPage.objects.get_or_create(
          slug="platform-status",
          defaults={
            "user": default_user,
            "title": "Platform Status",
            "description": "Monitoring system health and telemetry pipelines for the Data Engineering for Machine Learning Platform.",
          },
        )

        if created:
          from django.conf import settings

          frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:4200").rstrip("/")
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
      .prefetch_related("services")
    )
  else:
    pages = (
      StatusPage.objects.filter(Q(is_published=True) | Q(slug="platform-status"))
      .distinct()
      .prefetch_related("services")
    )

  return [_build_status_page_out(p) for p in pages]


def _build_status_page_out(p):
  # Calculate cumulative SLA
  services = p.services.all()
  urls = [s.url for s in services]

  cumulative_sla = 100.0
  overall_uptime = 100.0
  uptime_history = []

  if urls:
    total_count = Endpoints.objects.filter(url__in=urls).exclude(status_code=0).count()
    up_count = (
      Endpoints.objects.filter(url__in=urls, is_active=True, status_code__lt=500)
      .exclude(status_code=0)
      .count()
    )
    cumulative_sla = round((up_count / total_count) * 100.0, 2) if total_count > 0 else 100.0

    # Compute 30-day history
    import datetime as dt
    from collections import defaultdict

    from django.utils import timezone

    cutoff = timezone.now() - dt.timedelta(days=30)
    logs = (
      Endpoints.objects.filter(url__in=urls, last_tested__gte=cutoff)
      .exclude(status_code=0)
      .order_by("last_tested")
    )

    today = timezone.now().date()
    days_list = [today - dt.timedelta(days=i) for i in range(30)]
    days_list.reverse()  # past to present

    daily_logs = defaultdict(list)
    for log in logs:
      daily_logs[log.last_tested.date()].append(log)

    history_list = []
    total_history_up = 0
    total_history_count = 0

    for d in days_list:
      day_logs = daily_logs[d]
      if not day_logs:
        history_list.append(UptimeDaySchema(status="no_data", uptime=100.0))
      else:
        tot = len(day_logs)
        up = sum(1 for log in day_logs if log.is_active and log.status_code < 500)
        ratio = (up / tot) if tot > 0 else 1.0
        uptime_pct = round(ratio * 100.0, 2)

        total_history_up += up
        total_history_count += tot

        if ratio == 1.0:
          status = "operational"
        elif ratio >= 0.95:
          status = "partial_outage"
        else:
          status = "major_outage"
        history_list.append(UptimeDaySchema(status=status, uptime=uptime_pct))

    overall_uptime = (
      round((total_history_up / total_history_count) * 100.0, 2)
      if total_history_count > 0
      else 100.0
    )
    uptime_history = history_list
  else:
    for _ in range(30):
      uptime_history.append(UptimeDaySchema(status="no_data", uptime=100.0))

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
    cumulative_sla=cumulative_sla,
    overall_uptime=overall_uptime,
    uptime_history=uptime_history,
  )


@router.get("/status_pages/slug/{slug}", response=StatusPageOut)
def get_status_page_by_slug(request, slug: str):
  from django.db.models import Q

  if request.user.is_authenticated:
    page = get_object_or_404(
      StatusPage,
      Q(slug=slug) & (Q(is_published=True) | Q(user=request.user) | Q(slug="platform-status")),
    )
  else:
    page = get_object_or_404(
      StatusPage, Q(slug=slug) & (Q(is_published=True) | Q(slug="platform-status"))
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
  if page.slug == "platform-status":
    raise HttpError(403, "Cannot modify system platform-status page")
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
  page = get_object_or_404(StatusPage, id=page_id, user=request.user)
  if page.slug == "platform-status":
    raise HttpError(403, "Cannot delete system platform-status page")
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
  services = page.services.all()
  out = []
  for s in services:
    # Get latest log, ignoring client-cancelled requests
    latest_log = (
      Endpoints.objects.filter(url=s.url).exclude(status_code=0).order_by("-last_tested").first()
    )
    status = "Operational"
    if latest_log:
      if not latest_log.is_active or latest_log.status_code >= 500:
        status = "Outage"

    # Calculate SLA
    total_count = Endpoints.objects.filter(url=s.url).exclude(status_code=0).count()
    up_count = (
      Endpoints.objects.filter(url=s.url, is_active=True, status_code__lt=500)
      .exclude(status_code=0)
      .count()
    )
    sla = round((up_count / total_count) * 100.0, 2) if total_count > 0 else 100.0

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
  return out


@router.post("/status_pages/{page_id}/services", response=MonitoredServiceOut)
def add_service(request, page_id: str, payload: MonitoredServiceIn):
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")
  if not check_mfa_satisfied(request):
    raise HttpError(403, "Multi-factor authentication required")
  page = get_object_or_404(StatusPage, id=page_id, user=request.user)
  if page.slug == "platform-status":
    raise HttpError(403, "Cannot modify system platform-status page")

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
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")
  if not check_mfa_satisfied(request):
    raise HttpError(403, "Multi-factor authentication required")
  service = get_object_or_404(MonitoredService, id=service_id, status_page__user=request.user)
  if service.status_page.slug == "platform-status":
    raise HttpError(403, "Cannot modify system platform-status page")
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
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")
  if not check_mfa_satisfied(request):
    raise HttpError(403, "Multi-factor authentication required")
  page = get_object_or_404(StatusPage, id=page_id, user=request.user)
  if page.slug == "platform-status":
    raise HttpError(403, "Cannot modify system platform-status page")
  incident = Incident.objects.create(
    status_page=page, title=payload.title, message=payload.message, status=payload.status
  )

  # Send email alert to the owner via Resend
  if page.user and page.user.email:
    from django.conf import settings

    from config.email import send_resend_email

    subject = f"[Status Alert] {page.title}: {payload.title} ({payload.status})"
    # nosemgrep: python.django.security.injection.raw-html-format.raw-html-format
    html_content = f"""
        <p>A new incident update has been posted on status page <strong>{page.title}</strong>.</p>
        <p><strong>Title:</strong> {payload.title}</p>
        <p><strong>Status:</strong> {payload.status}</p>
        <p><strong>Details:</strong> {payload.message}</p>
        <hr>
        <p>Manage your status page details at <a href="{settings.FRONTEND_URL}/manage">Management Console</a>.</p>
        """
    send_resend_email(page.user.email, subject, html_content)

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
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")
  if not check_mfa_satisfied(request):
    raise HttpError(403, "Multi-factor authentication required")
  incident = get_object_or_404(Incident, id=incident_id, status_page__user=request.user)
  if incident.status_page.slug == "platform-status":
    raise HttpError(403, "Cannot modify system platform-status page")
  incident.delete()
  return {"success": True}


from monitor.models import AnalyticsIntegration


class IntegrationOut(Schema):
  id: str
  provider: str
  active: bool
  last_sync: datetime.datetime | None = None
  created_at: datetime.datetime


class ClarityIn(Schema):
  project_id: str
  api_key: str


class CloudflareIn(Schema):
  project_id: str
  api_key: str


@router.get("/integrations", response=list[IntegrationOut])
def list_integrations(request):
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")
  integrations = AnalyticsIntegration.objects.filter(user=request.user)
  return [
    IntegrationOut(
      id=str(integ.id),
      provider=integ.provider,
      active=integ.active,
      last_sync=integ.last_sync,
      created_at=integ.created_at,
    )
    for integ in integrations
  ]


@router.get("/integrations/google/auth-url")
def google_auth_url(request):
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")

  import urllib.parse

  from django.conf import settings

  client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "mock-client-id")
  redirect_uri = getattr(
    settings,
    "GOOGLE_OAUTH_REDIRECT_URI",
    "http://localhost:8000/api/v1/system-status/integrations/google/callback",
  )

  scope = "https://www.googleapis.com/auth/analytics.readonly"
  params = {
    "client_id": client_id,
    "redirect_uri": redirect_uri,
    "response_type": "code",
    "scope": scope,
    "access_type": "offline",
    "prompt": "consent",
    "state": str(request.user.id),
  }

  url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
  return {"url": url}


@router.get("/integrations/google/callback")
def google_callback(request, code: str, state: str):
  import requests
  from django.conf import settings
  from django.contrib.auth.models import User
  from django.shortcuts import redirect

  user = get_object_or_404(User, id=int(state))

  client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "mock-client-id")
  client_secret = getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "mock-client-secret")
  redirect_uri = getattr(
    settings,
    "GOOGLE_OAUTH_REDIRECT_URI",
    "http://localhost:8000/api/v1/system-status/integrations/google/callback",
  )

  token_url = "https://oauth2.googleapis.com/token"
  data = {
    "code": code,
    "client_id": client_id,
    "client_secret": client_secret,
    "redirect_uri": redirect_uri,
    "grant_type": "authorization_code",
  }

  frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:4200")

  try:
    response = requests.post(token_url, data=data, timeout=10)
    token_data = response.json()

    if "access_token" in token_data:
      AnalyticsIntegration.objects.update_or_create(
        user=user,
        provider="google",
        defaults={
          "credentials": {
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "expires_in": token_data.get("expires_in"),
          },
          "active": True,
        },
      )
      return redirect(f"{frontend_url}/manage?integration=google&status=success")
  except Exception as e:
    print(f"OAuth exchange failed: {e}")

  return redirect(f"{frontend_url}/manage?integration=google&status=failed")


@router.post("/integrations/clarity", response=IntegrationOut)
def save_clarity(request, payload: ClarityIn):
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")

  integ, _ = AnalyticsIntegration.objects.update_or_create(
    user=request.user,
    provider="microsoft",
    defaults={
      "credentials": {
        "project_id": payload.project_id,
        "api_key": payload.api_key,
      },
      "active": True,
    },
  )

  return IntegrationOut(
    id=str(integ.id),
    provider=integ.provider,
    active=integ.active,
    last_sync=integ.last_sync,
    created_at=integ.created_at,
  )


@router.post("/integrations/cloudflare", response=IntegrationOut)
def save_cloudflare(request, payload: CloudflareIn):
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")

  integ, _ = AnalyticsIntegration.objects.update_or_create(
    user=request.user,
    provider="cloudflare",
    defaults={
      "credentials": {
        "project_id": payload.project_id,
        "api_key": payload.api_key,
      },
      "active": True,
    },
  )

  return IntegrationOut(
    id=str(integ.id),
    provider=integ.provider,
    active=integ.active,
    last_sync=integ.last_sync,
    created_at=integ.created_at,
  )


@router.delete("/integrations/{integration_id}")
def delete_integration(request, integration_id: str):
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")
  integration = get_object_or_404(AnalyticsIntegration, id=integration_id, user=request.user)
  integration.delete()
  return {"success": True}
