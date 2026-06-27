import logging
from datetime import timedelta

from django.utils import timezone
from ninja import Router

logger = logging.getLogger(__name__)
router = Router()


@router.get("/tenants")
def get_user_tenants(request):
  if not request.user.is_authenticated:
    from ninja.errors import HttpError

    raise HttpError(401, "Not authenticated")

  from monitor.models import TenantMembership

  memberships = TenantMembership.objects.filter(user=request.user).select_related("tenant")
  tenants = [
    {
      "id": str(m.tenant.id),
      "name": m.tenant.name,
      "slug": m.tenant.slug,
      "is_platform": m.tenant.is_platform_tenant,
      "role": m.role,
    }
    for m in memberships
  ]
  return {"status": "success", "data": tenants}


@router.get("/overview")
def get_analytics_overview(request, tenant_id: str | None = None, site_url: str | None = None):
  if not request.user.is_authenticated:
    from ninja.errors import HttpError

    raise HttpError(401, "Not authenticated")

  now = timezone.now()
  last_24h = now - timedelta(days=1)

  from monitor.models import Tenant, TenantMembership

  # Determine which tenant context to load
  target_tenant = None
  if tenant_id:
    membership = (
      TenantMembership.objects.filter(user=request.user, tenant_id=tenant_id)
      .select_related("tenant")
      .first()
    )
    if not membership:
      from ninja.errors import HttpError

      raise HttpError(403, "Access denied to this tenant")
    target_tenant = membership.tenant
  else:
    membership = TenantMembership.objects.filter(user=request.user).select_related("tenant").first()
    if membership:
      target_tenant = membership.tenant
    else:
      target_tenant = Tenant.objects.filter(is_platform_tenant=True).first()

  # ==========================================
  # 1. GLOBAL CES (Anonymized & Aggregated)
  # ==========================================
  from monitor.models import AggregatedAnalytics

  global_analytics = list(
    AggregatedAnalytics.objects.filter(
      tenant__isnull=True, timestamp__gte=last_24h, bucket_size="1h"
    )
  )
  if global_analytics:
    global_buckets = len(global_analytics)
    global_p99 = (
      sum(b.p99_latency_ms for b in global_analytics) / global_buckets if global_buckets else 0
    )
    global_incidents = global_analytics[-1].active_incidents if global_analytics else 0
    global_uptime = 100 - (sum(b.error_rate_percent for b in global_analytics) / global_buckets)
  else:
    global_p99 = 45
    global_incidents = 0
    global_uptime = 99.9

  # Calculate CES mathematically from global anonymous aggregates for sub-components
  ces_threat_level = min(100, global_incidents * 20 + (30 if global_p99 > 500 else 0))
  ces_sla_level = max(0, global_uptime - (5 if global_p99 > 800 else 0))
  ces_stability_level = max(0, 100 - global_incidents * 10 - (15 if global_p99 > 300 else 0))

  # ML-driven Countermeasure Effectiveness Score (CES)
  import os

  import torch
  from ml.ml_services import CESModel, get_ces_model_path

  # Approximate fr, sr for inference based on global uptime/incidents,
  # or in a real app, query Endpoints similar to train_ces_model
  fr = max(0.0, 1.0 - (global_uptime / 100.0))
  sr = min(1.0, (global_incidents * 0.1) + (0.05 if global_p99 > 500 else 0.01))

  try:
    model_path = get_ces_model_path()
    if os.path.exists(model_path):
      model = CESModel()
      model.load_state_dict(torch.load(model_path))
      model.eval()
      with torch.no_grad():
        x = torch.tensor([[fr, sr, float(global_incidents)]], dtype=torch.float32)
        ces_level = model(x).item()
    else:
      # Fallback math if model isn't trained yet
      ces_level = max(
        0,
        min(100, ces_sla_level * 0.5 + ces_stability_level * 0.4 + (100 - ces_threat_level) * 0.1),
      )
  except Exception:
    ces_level = max(
      0, min(100, ces_sla_level * 0.5 + ces_stability_level * 0.4 + (100 - ces_threat_level) * 0.1)
    )

  # ==========================================
  # 2. STRICT USER TENANCY (Isolated Metrics)
  # ==========================================
  from monitor.models import (
    AnalyticsIntegration,
    CookieConsent,
    Endpoints,
    Incident,
    MonitoredService,
    StatusPage,
    ThreatIntelligence,
    Vulnerability,
  )

  user_pages = StatusPage.objects.filter(tenant=target_tenant)
  user_urls = list(
    MonitoredService.objects.filter(status_page__in=user_pages).values_list("url", flat=True)
  )
  available_sites = user_urls.copy()

  if site_url and site_url != "All":
    user_urls = [u for u in user_urls if u == site_url]

  endpoints = Endpoints.objects.filter(url__in=user_urls, last_tested__gte=last_24h).exclude(
    status_code=0
  )
  total_reqs = endpoints.count()
  up_reqs = endpoints.filter(is_active=True, status_code__lt=500).count()
  uptime_percent = round((up_reqs / total_reqs) * 100.0, 2) if total_reqs > 0 else 100.0

  active_incidents = Incident.objects.filter(
    tenant=target_tenant, status__in=["Investigating", "Identified"]
  ).count()

  latencies = list(
    endpoints.values_list("response_time", flat=True).order_by("-last_tested")[:5000]
  )
  if latencies and any(latencies):
    ms_list = sorted([lat.total_seconds() * 1000 for lat in latencies if lat])
    p99_idx = int(len(ms_list) * 0.99)
    p99_latency = round(ms_list[p99_idx if p99_idx < len(ms_list) else -1], 2)
    average_latency_ms = round(sum(ms_list) / len(ms_list), 2)
  else:
    p99_latency = 0.0
    average_latency_ms = 0.0

  error_rate_percent = (
    round(((total_reqs - up_reqs) / total_reqs) * 100.0, 2) if total_reqs > 0 else 0.0
  )

  threats = ThreatIntelligence.objects.filter(tenant=target_tenant, timestamp__gte=last_24h)
  active_threat_count = threats.count()

  # Basic safe fallbacks if no data exists
  if total_reqs == 0:
    time_series = [
      {"time": (now - timedelta(hours=24 - i)).strftime("%H:00"), "latency": 0} for i in range(24)
    ]
    request_frequency = [
      {"time": (now - timedelta(hours=24 - i)).strftime("%H:00"), "requests": 0} for i in range(24)
    ]
    candlestick_data = [
      {
        "time": (now - timedelta(hours=24 - i)).strftime("%H:00"),
        "open": 0,
        "high": 0,
        "low": 0,
        "close": 0,
      }
      for i in range(24)
    ]
    origin_distribution = []
    http_statuses = []
    endpoint_counts = []
  else:
    # Build isolated time series manually (simplified for summary)
    time_series = [
      {"time": (now - timedelta(hours=24 - i)).strftime("%H:00"), "latency": p99_latency}
      for i in range(24)
    ]
    request_frequency = [
      {"time": (now - timedelta(hours=24 - i)).strftime("%H:00"), "requests": total_reqs // 24}
      for i in range(24)
    ]

    # Build Candlestick Data (bucketed by hour)
    eps = list(endpoints.values("last_tested", "response_time").order_by("-last_tested")[:5000])
    candlestick_data = []
    for i in range(24):
      start = now - timedelta(hours=24 - i)
      end = now - timedelta(hours=23 - i)
      bucket = [
        e["response_time"].total_seconds() * 1000
        for e in eps
        if e["last_tested"] >= start and e["last_tested"] < end and e["response_time"]
      ]

      if bucket:
        bucket.sort()
        low = round(bucket[0], 2)
        high = round(bucket[-1], 2)
        open_val = round(bucket[len(bucket) // 4], 2)  # pseudo-open (p25)
        close_val = round(bucket[(len(bucket) * 3) // 4], 2)  # pseudo-close (p75)
      else:
        low = high = open_val = close_val = p99_latency

      candlestick_data.append(
        {
          "time": start.strftime("%H:00"),
          "open": open_val,
          "high": high,
          "low": low,
          "close": close_val,
        }
      )
    origin_distribution = [
      {
        "origin": "Ashburn, VA (us-east-1)",
        "lat": 39.0438,
        "lng": -77.4874,
        "count": total_reqs // 2,
      },
      {
        "origin": "Frankfurt (eu-central-1)",
        "lat": 50.1109,
        "lng": 8.6821,
        "count": total_reqs // 4,
      },
      {
        "origin": "Tokyo (ap-northeast-1)",
        "lat": 35.6762,
        "lng": 139.6503,
        "count": total_reqs // 4,
      },
    ]
    http_statuses = [
      {"status": "200", "count": up_reqs},
      {"status": "5xx", "count": total_reqs - up_reqs},
    ]
    from django.db.models import Count

    ep_counts_qs = endpoints.values("url").annotate(count=Count("id"))
    endpoint_counts = [{"endpoint": item["url"], "count": item["count"]} for item in ep_counts_qs]

  # Retrieve provider integrations
  active_providers = list(
    AnalyticsIntegration.objects.filter(user=request.user, active=True).values_list(
      "provider", flat=True
    )
  )

  # Cookie Consents for the tenant (global or isolated to their nodes)
  cookies_analytical = CookieConsent.objects.filter(
    tenant=target_tenant, analytical=True, created_at__gte=last_24h
  ).count()
  cookies_marketing = CookieConsent.objects.filter(
    tenant=target_tenant, marketing=True, created_at__gte=last_24h
  ).count()

  # Unique Visitors (Optimized for speed by scanning recent endpoints)
  recent_ips = endpoints.values_list("ip_address", flat=True).order_by("-last_tested")[:5000]
  unique_visitors = len(set(ip for ip in recent_ips if ip))

  # Widget Interactions from telemetry_context
  widget_interactions = 0
  telemetry_data = (
    endpoints.exclude(telemetry_context__isnull=True)
    .values_list("telemetry_context", flat=True)
    .order_by("-last_tested")[:5000]
  )
  for context in telemetry_data:
    try:
      if isinstance(context, dict):
        ga_data = context.get("global_agent_data", {})
        widget_interactions += ga_data.get("clicks", 0)
    except Exception:
      pass

  # Incorporate vulnerabilities into security alerts
  vulns = Vulnerability.objects.filter(tenant=target_tenant, created_at__gte=last_24h)
  security_alerts = [
    {
      "time": (now - timedelta(hours=24 - i)).strftime("%H:00"),
      "count": (threats.count() + vulns.count()) // 24,
    }
    for i in range(24)
  ]
  threat_severity = []
  if threats.exists() or vulns.exists():
    # Summarize severities
    severities = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    severities["Medium"] += threats.count()  # default threats to medium
    for v in vulns:
      severities[v.severity] = severities.get(v.severity, 0) + 1
    threat_severity = [{"severity": k, "count": v} for k, v in severities.items() if v > 0]

  # API Usage / Rate Limit logic
  quota = 60
  usage = 0
  try:
    import time

    from utils.rate_limit import get_tenant_rate_limit, redis_client

    quota = get_tenant_rate_limit(target_tenant)
    if redis_client:
      key = f"rate_limit:tenant:{target_tenant.id}"
      current_time = int(time.time())
      window_start = current_time - 60
      pipe = redis_client.pipeline()
      pipe.zremrangebyscore(key, 0, window_start)
      pipe.zcard(key)
      results = pipe.execute()
      usage = results[1]
  except Exception as e:
    logger.warning(f"Could not fetch rate limit usage: {e}")

  data = {
    "ces": {
      "level": round(ces_level, 2),
      "threat": round(ces_threat_level, 2),
      "sla": round(ces_sla_level, 2),
      "stability": round(ces_stability_level, 2),
    },
    "user_metrics": {
      "p99_latency_ms": p99_latency,
      "average_latency_ms": average_latency_ms,
      "uptime_percent": uptime_percent,
      "error_rate_percent": error_rate_percent,
      "total_requests_24h": total_reqs,
      "active_incidents": active_incidents,
      "active_threats": active_threat_count,
      "time_series": time_series,
      "candlestick_data": candlestick_data,
      "origin_distribution": origin_distribution,
      "request_frequency": request_frequency,
      "http_statuses": http_statuses,
      "endpoint_counts": endpoint_counts,
      "threat_severity": threat_severity,
      "security_alerts": security_alerts,
      "cookie_consents": {"analytical": cookies_analytical, "marketing": cookies_marketing},
      "widget_interactions": widget_interactions,
      "unique_visitors": unique_visitors,
      "active_providers": active_providers,
      "available_sites": available_sites,
      "api_usage": {
        "quota_per_minute": quota,
        "usage_current_minute": usage,
        "tier": getattr(target_tenant, "tier", "Standard"),
      },
    },
  }

  return {"status": "success", "data": data}
