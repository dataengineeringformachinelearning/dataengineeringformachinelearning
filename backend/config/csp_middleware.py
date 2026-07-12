from collections.abc import Callable

from django.conf import settings
from django.core.cache import cache
from django.http import HttpRequest, HttpResponse

# Shared third-party allowlists for HTML CSP (keep in sync with firebase.json + frontend/nginx.conf).
_CSP_SCRIPT_SRC = (
  "'self' 'unsafe-inline' 'unsafe-eval' "
  "https://cdn.jsdelivr.net https://*.jsdelivr.net "
  "https://apis.google.com https://*.firebaseapp.com "
  "https://www.googletagmanager.com https://*.googletagmanager.com "
  "https://www.clarity.ms https://*.clarity.ms "
  "https://static.cloudflareinsights.com "
  "https://experiences.cdn.algolia.com "
  "https://ui.dataengineeringformachinelearning.com https://*.ui.dataengineeringformachinelearning.com"
)
_CSP_CONNECT_SRC = (
  "'self' "
  "https://cdn.jsdelivr.net https://*.jsdelivr.net "
  "https://*.googleapis.com https://*.firebaseio.com "
  "https://static.cloudflareinsights.com https://cloudflareinsights.com "
  "https://*.cloudflareinsights.com "
  "https://*.algolia.net https://*.algolianet.com https://*.algolia.io "
  "https://experiences.resolver.algolia.com https://experiences.cdn.algolia.com "
  "https://experiences.algolia.com "
  "https://deml.app https://*.deml.app "
  "wss://deml.app wss://*.deml.app "
  "https://backend.deml.app https://*.backend.deml.app "
  "wss://backend.deml.app wss://*.backend.deml.app "
  "https://dataengineeringformachinelearning.com https://*.dataengineeringformachinelearning.com "
  "wss://ui.dataengineeringformachinelearning.com "
  "https://*.ui.dataengineeringformachinelearning.com "
  "wss://*.ui.dataengineeringformachinelearning.com "
  "https://analytics.google.com https://*.analytics.google.com "
  "https://*.google-analytics.com https://*.googletagmanager.com "
  "https://*.clarity.ms https://*.bing.com"
)
_CSP_IMG_SRC = (
  "'self' data: blob: "
  "https://deml.app https://*.deml.app "
  "https://backend.deml.app https://*.backend.deml.app "
  "https://dataengineeringformachinelearning.com https://*.dataengineeringformachinelearning.com "
  "https://c.clarity.ms https://*.clarity.ms "
  "https://*.google-analytics.com https://*.googletagmanager.com "
  "https://*.bing.com"
)
_CSP_FRAME_SRC = (
  "'self' https://*.firebaseapp.com https://deml.app https://*.deml.app "
  "https://dataengineeringformachinelearning.com https://*.dataengineeringformachinelearning.com"
)


def _get_dynamic_csp_domains() -> list[str]:
  """
  Fetch verified domains from ValidatedSite to allow telemetry connections/assets.
  Caches the list for 1 hour to prevent DB overhead on every request.
  """
  cache_key = "csp_allowed_domains"
  domains = cache.get(cache_key)
  if domains is None:
    try:
      from monitor.models import ValidatedSite

      domains = list(
        ValidatedSite.objects.filter(is_verified=True).values_list("domain", flat=True)
      )
      cache.set(cache_key, domains, timeout=3600)
    except Exception:
      domains = []
  return domains


class ContentSecurityPolicyMiddleware:
  def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
    self.get_response = get_response

  def __call__(self, request: HttpRequest) -> HttpResponse:
    response = self.get_response(request)

    # Inject security headers on text/html responses
    content_type = response.get("Content-Type", "")
    if "text/html" in content_type:
      dynamic_domains = _get_dynamic_csp_domains()
      schemes = ("https",) if not settings.DEBUG else ("https", "http")
      extra_connect = " ".join(
        f"{scheme}://{domain}" for domain in dynamic_domains for scheme in schemes
      )
      extra_img = extra_connect

      csp_policy = (
        "default-src 'self'; "
        "worker-src 'self' blob:; "
        f"script-src {_CSP_SCRIPT_SRC}; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.jsdelivr.net "
        "https://fonts.googleapis.com https://deml.app https://*.deml.app "
        "https://ui.dataengineeringformachinelearning.com https://*.ui.dataengineeringformachinelearning.com; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        f"connect-src {_CSP_CONNECT_SRC} {extra_connect}; "
        f"img-src {_CSP_IMG_SRC} {extra_img}; "
        f"frame-src {_CSP_FRAME_SRC}; "
        "upgrade-insecure-requests; block-all-mixed-content;"
      )
      response["Content-Security-Policy"] = csp_policy.strip()
      response["X-Content-Type-Options"] = "nosniff"
      response["X-XSS-Protection"] = "1; mode=block"
      response["Referrer-Policy"] = "strict-origin-when-cross-origin"
      response["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    return response
