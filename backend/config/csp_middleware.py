from collections.abc import Callable

from django.core.cache import cache
from django.http import HttpRequest, HttpResponse


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
      extra_connect = " ".join(f"https://{d} http://{d}" for d in dynamic_domains)
      extra_img = " ".join(f"https://{d} http://{d}" for d in dynamic_domains)

      csp_policy = (
        "default-src 'self'; "
        "worker-src 'self' blob:; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://*.jsdelivr.net https://apis.google.com https://*.firebaseapp.com; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.jsdelivr.net https://fonts.googleapis.com https://deml.app https://*.deml.app; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        f"connect-src 'self' https://cdn.jsdelivr.net https://*.jsdelivr.net https://*.googleapis.com https://*.firebaseio.com {extra_connect}; "
        f"img-src 'self' data: blob: https://deml.app https://*.deml.app {extra_img}; "
        "frame-src 'self' https://*.firebaseapp.com;"
      )
      response["Content-Security-Policy"] = csp_policy.strip()
      response["X-Content-Type-Options"] = "nosniff"
      response["X-XSS-Protection"] = "1; mode=block"
      response["Referrer-Policy"] = "strict-origin-when-cross-origin"
      response["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    return response
