from django.contrib.sitemaps.views import sitemap
from django.urls import converters, path, re_path

from . import views
from .sitemaps import APIDocsSitemap, StaticViewSitemap

# Django 6 / Django-Ninja Workaround: Unregister 'uuid' path converter before importing Ninja
if "uuid" in converters.DEFAULT_CONVERTERS:
  del converters.DEFAULT_CONVERTERS["uuid"]
if "uuid" in converters.REGISTERED_CONVERTERS:
  del converters.REGISTERED_CONVERTERS["uuid"]
converters.get_converters.cache_clear()

from forjd.views import (
  analytics_overview_proxy,
  dlq_retry_proxy,
  exports_collection_proxy,
  integrations_security_alert_proxy,
  ml_latest_proxy,
  native_forjd_proxy,
  native_status_page_proxy,
  session_revoke_proxy,
  status_pages_list_proxy,
  unsupported_forjd_proxy,
  vulnerabilities_list_proxy,
)
from monitor.views import cookie_consent, newsletter

from .api import api

sitemaps = {
  "static": StaticViewSitemap,
  "api_docs": APIDocsSitemap,
}

urlpatterns = [
  path("", views.home, name="home"),
  path("assets/<path:path>", views.serve_asset, name="serve_asset"),
  path("api/v1/telemetry/cookie-consent", cookie_consent, name="cookie-consent"),
  path("api/v1/telemetry/subscribe", newsletter, name="newsletter-subscribe"),
  path(
    "api/v1/system-status/health",
    native_forjd_proxy,
    {
      "target_path": "/health",
      "allowed_methods": ("GET",),
      "public": True,
    },
    name="forjd-health-adapter",
  ),
  path(
    "api/v1/system-status/ready",
    native_forjd_proxy,
    {
      "target_path": "/ready",
      "allowed_methods": ("GET",),
      "public": True,
    },
    name="forjd-readiness-adapter",
  ),
  path(
    "api/v1/system-status/status_pages/slug/<str:slug>",
    native_status_page_proxy,
    name="forjd-public-status-page-adapter",
  ),
  path(
    "api/v1/system-status/status_pages",
    status_pages_list_proxy,
    name="forjd-status-pages-list-adapter",
  ),
  path(
    "api/v1/analytics/overview",
    analytics_overview_proxy,
    name="forjd-analytics-overview-adapter",
  ),
  path(
    "api/v1/ingest",
    native_forjd_proxy,
    {
      "target_path": "/api/v1/ingest",
      "allowed_methods": ("POST",),
      "tenant_binding": "sealed",
    },
    name="forjd-sealed-ingest-adapter",
  ),
  path(
    "api/v1/ingest/events:batch",
    native_forjd_proxy,
    {
      "target_path": "/api/v1/ingest/events:batch",
      "allowed_methods": ("POST",),
      "tenant_binding": "sealed_batch",
    },
    name="forjd-sealed-ingest-batch-adapter",
  ),
  path(
    "api/v1/ingest/events",
    native_forjd_proxy,
    {
      "target_path": "/api/v1/ingest/events",
      "allowed_methods": ("GET", "POST"),
      "tenant_binding": "sealed_method",
    },
    name="forjd-sealed-events-adapter",
  ),
  path(
    "api/v1/ingest/results",
    native_forjd_proxy,
    {
      "target_path": "/api/v1/ingest/results",
      "allowed_methods": ("GET",),
      "tenant_binding": "query",
    },
    name="forjd-ingest-results-adapter",
  ),
  re_path(
    r"^api/v1/sessions/?$",
    native_forjd_proxy,
    {
      "target_path": "/api/v1/sessions",
      "allowed_methods": ("GET", "POST"),
      "tenant_binding": "method",
    },
    name="forjd-sessions-adapter",
  ),
  path(
    "api/v1/sessions/<str:session_id>",
    session_revoke_proxy,
    name="forjd-session-revoke-adapter",
  ),
  re_path(
    r"^api/v1/projections/?$",
    native_forjd_proxy,
    {
      "target_path": "/api/v1/projections",
      "allowed_methods": ("GET",),
      "tenant_binding": "query",
    },
    name="forjd-projections-adapter",
  ),
  path(
    "api/v1/projections/checkpoints",
    native_forjd_proxy,
    {
      "target_path": "/api/v1/projections/checkpoints",
      "allowed_methods": ("GET",),
      "tenant_binding": "query",
    },
    name="forjd-projection-checkpoints-adapter",
  ),
  path(
    "api/v1/projections/run",
    native_forjd_proxy,
    {
      "target_path": "/api/v1/projections/run",
      "allowed_methods": ("POST",),
      "tenant_binding": "body",
    },
    name="forjd-projection-run-adapter",
  ),
  re_path(
    r"^api/v1/replay/?$",
    native_forjd_proxy,
    {
      "target_path": "/api/v1/replay",
      "allowed_methods": ("POST",),
      "tenant_binding": "body",
    },
    name="forjd-replay-adapter",
  ),
  path(
    "api/v1/replay/dlq",
    native_forjd_proxy,
    {
      "target_path": "/api/v1/replay/dlq",
      "allowed_methods": ("GET",),
      "tenant_binding": "query",
    },
    name="forjd-dlq-adapter",
  ),
  path(
    "api/v1/replay/dlq/<str:dlq_id>/retry",
    dlq_retry_proxy,
    name="forjd-dlq-retry-adapter",
  ),
  path(
    "api/v1/agent/vulnerabilities",
    vulnerabilities_list_proxy,
    name="forjd-vulnerabilities-adapter",
  ),
  path(
    "api/v1/exports/",
    exports_collection_proxy,
    name="forjd-exports-adapter",
  ),
  path(
    "api/v1/exports",
    exports_collection_proxy,
    name="forjd-exports-adapter-noslash",
  ),
  path(
    "api/v1/ml/latest",
    ml_latest_proxy,
    name="forjd-ml-latest-adapter",
  ),
  path(
    "api/v1/integrations/security-alert",
    integrations_security_alert_proxy,
    name="forjd-integrations-security-alert-adapter",
  ),
  re_path(
    r"^api/v1/(?P<capability>system-status|analytics|telemetry|ml|exports|integrations|model)(?:/.*)?$",
    unsupported_forjd_proxy,
    name="forjd-unsupported-domain",
  ),
  re_path(
    r"^api/v1/agent/(?P<capability>vulnerabilities)(?:/.*)?$",
    unsupported_forjd_proxy,
    name="forjd-unsupported-agent",
  ),
  re_path(
    r"^api/v1/(?P<capability>ingest|predict)(?:/.*)?$",
    unsupported_forjd_proxy,
    name="forjd-unsupported-native-route",
  ),
  path("api/v1/", api.urls),
  path("robots.txt", views.robots_txt, name="robots_txt"),
  path(
    "sitemap.xml", sitemap, {"sitemaps": sitemaps}, name="django.contrib.sitemaps.views.sitemap"
  ),
]

handler404 = "config.views.custom_404"
