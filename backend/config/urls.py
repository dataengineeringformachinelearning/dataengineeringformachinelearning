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

from forjd.live import live_updates_stream
from forjd.views import (
  analytics_overview_proxy,
  analytics_tenants_proxy,
  compliance_soc_proxy,
  dlq_retry_proxy,
  export_detail_proxy,
  export_download_proxy,
  exports_collection_proxy,
  forjd_capabilities_proxy,
  incident_case_detail_proxy,
  incident_cases_proxy,
  ingest_processing_status_proxy,
  integrations_security_alert_proxy,
  ml_latest_proxy,
  ml_temporal_forecast_proxy,
  ml_threat_report_proxy,
  native_forjd_proxy,
  native_status_page_proxy,
  playbook_action_ack_proxy,
  playbook_action_retry_proxy,
  playbook_detail_proxy,
  playbook_execute_proxy,
  playbook_runs_proxy,
  playbooks_proxy,
  session_revoke_proxy,
  siem_signals_proxy,
  status_incident_delete_proxy,
  status_page_detail_proxy,
  status_page_incidents_proxy,
  status_page_services_proxy,
  status_pages_list_proxy,
  status_service_delete_proxy,
  unsupported_forjd_proxy,
  vulnerabilities_list_proxy,
  vulnerability_detail_proxy,
)
from monitor.integrations import (
  clarity_save,
  cloudflare_save,
  google_auth_url,
  google_callback,
  integration_delete,
  integrations_list,
)
from monitor.views import cookie_consent, newsletter

from .api import api

sitemaps = {
  "static": StaticViewSitemap,
  "api_docs": APIDocsSitemap,
}

urlpatterns = [
  path("", views.home, name="home"),
  path("documentation", views.documentation, name="documentation"),
  path("assets/<path:path>", views.serve_asset, name="serve_asset"),
  path("api/v1/telemetry/cookie-consent", cookie_consent, name="cookie-consent"),
  path("api/v1/telemetry/subscribe", newsletter, name="newsletter-subscribe"),
  path(
    "api/v1/forjd/capabilities",
    forjd_capabilities_proxy,
    name="forjd-capabilities-adapter",
  ),
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
    "api/v1/system-status/status_pages/slug/<str:slug>/",
    native_status_page_proxy,
    name="forjd-public-status-page-adapter-slash",
  ),
  path(
    "api/v1/system-status/status_pages/slug/<str:slug>",
    native_status_page_proxy,
    name="forjd-public-status-page-adapter",
  ),
  path(
    "api/v1/system-status/status_pages/<str:page_id>/services/",
    status_page_services_proxy,
    name="forjd-status-page-services-adapter-slash",
  ),
  path(
    "api/v1/system-status/status_pages/<str:page_id>/services",
    status_page_services_proxy,
    name="forjd-status-page-services-adapter",
  ),
  path(
    "api/v1/system-status/status_pages/<str:page_id>/incidents/",
    status_page_incidents_proxy,
    name="forjd-status-page-incidents-adapter-slash",
  ),
  path(
    "api/v1/system-status/status_pages/<str:page_id>/incidents",
    status_page_incidents_proxy,
    name="forjd-status-page-incidents-adapter",
  ),
  path(
    "api/v1/system-status/status_pages/<str:page_id>/",
    status_page_detail_proxy,
    name="forjd-status-page-detail-adapter-slash",
  ),
  path(
    "api/v1/system-status/status_pages/<str:page_id>",
    status_page_detail_proxy,
    name="forjd-status-page-detail-adapter",
  ),
  path(
    "api/v1/system-status/status_pages/",
    status_pages_list_proxy,
    name="forjd-status-pages-list-adapter-slash",
  ),
  path(
    "api/v1/system-status/status_pages",
    status_pages_list_proxy,
    name="forjd-status-pages-list-adapter",
  ),
  path(
    "api/v1/system-status/services/<str:service_id>",
    status_service_delete_proxy,
    name="forjd-status-service-delete-adapter",
  ),
  path(
    "api/v1/system-status/incidents/<str:incident_id>",
    status_incident_delete_proxy,
    name="forjd-status-incident-delete-adapter",
  ),
  path(
    "api/v1/analytics/overview",
    analytics_overview_proxy,
    name="forjd-analytics-overview-adapter",
  ),
  path(
    "api/v1/analytics/tenants",
    analytics_tenants_proxy,
    name="forjd-analytics-tenants-adapter",
  ),
  path(
    "api/v1/analytics/live",
    live_updates_stream,
    name="forjd-analytics-live-stream",
  ),
  path(
    "api/v1/analytics/incidents/<str:case_id>",
    incident_case_detail_proxy,
    name="forjd-incident-case-detail-adapter",
  ),
  path(
    "api/v1/analytics/incidents",
    incident_cases_proxy,
    name="forjd-incident-cases-adapter",
  ),
  path(
    "api/v1/analytics/playbooks/<str:playbook_id>/execute",
    playbook_execute_proxy,
    name="forjd-playbook-execute-adapter",
  ),
  path(
    "api/v1/analytics/playbooks/<str:playbook_id>",
    playbook_detail_proxy,
    name="forjd-playbook-detail-adapter",
  ),
  path(
    "api/v1/analytics/playbooks",
    playbooks_proxy,
    name="forjd-playbooks-adapter",
  ),
  path(
    "api/v1/analytics/playbook-runs/<str:run_id>/actions/<str:action_result_id>/ack",
    playbook_action_ack_proxy,
    name="forjd-playbook-action-ack-adapter",
  ),
  path(
    "api/v1/analytics/playbook-runs/<str:run_id>/actions/<str:action_result_id>/retry",
    playbook_action_retry_proxy,
    name="forjd-playbook-action-retry-adapter",
  ),
  path(
    "api/v1/analytics/playbook-runs",
    playbook_runs_proxy,
    name="forjd-playbook-runs-adapter",
  ),
  path(
    "api/v1/siem/signals",
    siem_signals_proxy,
    name="forjd-siem-signals-adapter",
  ),
  path(
    "api/v1/ml/compliance/soc-status",
    compliance_soc_proxy,
    name="forjd-compliance-soc-adapter",
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
    "api/v1/ingest/processing/<str:batch_id>",
    ingest_processing_status_proxy,
    name="forjd-ingest-processing-status-adapter",
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
    "api/v1/agent/vulnerabilities/<str:vulnerability_id>",
    vulnerability_detail_proxy,
    name="forjd-vulnerability-detail-adapter",
  ),
  path(
    "api/v1/agent/vulnerabilities",
    vulnerabilities_list_proxy,
    name="forjd-vulnerabilities-adapter",
  ),
  path(
    "api/v1/exports/<str:export_id>/download",
    export_download_proxy,
    name="forjd-export-download-adapter",
  ),
  path(
    "api/v1/exports/<str:export_id>",
    export_detail_proxy,
    name="forjd-export-detail-adapter",
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
    "api/v1/ml/temporal-forecast",
    ml_temporal_forecast_proxy,
    name="forjd-ml-temporal-forecast-adapter",
  ),
  path(
    "api/v1/ml/threat-intel/report",
    ml_threat_report_proxy,
    name="forjd-ml-threat-report-adapter",
  ),
  path(
    "api/v1/integrations/security-alert",
    integrations_security_alert_proxy,
    name="forjd-integrations-security-alert-adapter",
  ),
  # --- Analytics integrations (DEML-local sealed credentials; GA / Clarity / Cloudflare) ---
  path(
    "api/v1/system-status/integrations",
    integrations_list,
    name="analytics-integrations-list",
  ),
  path(
    "api/v1/system-status/integrations/google/auth-url",
    google_auth_url,
    name="analytics-integrations-google-auth-url",
  ),
  path(
    "api/v1/system-status/integrations/google/callback",
    google_callback,
    name="analytics-integrations-google-callback",
  ),
  path(
    "api/v1/system-status/integrations/clarity",
    clarity_save,
    name="analytics-integrations-clarity",
  ),
  path(
    "api/v1/system-status/integrations/cloudflare",
    cloudflare_save,
    name="analytics-integrations-cloudflare",
  ),
  path(
    "api/v1/system-status/integrations/<str:integration_id>",
    integration_delete,
    name="analytics-integrations-delete",
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
