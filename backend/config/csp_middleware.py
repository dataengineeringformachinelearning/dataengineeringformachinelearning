from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

# Shared third-party allowlists for HTML CSP (keep in sync with frontend/vercel.json + nginx.conf).
# Prefer hashes/nonces later; keep 'unsafe-inline' for current shell scripts — no 'unsafe-eval'.
# jsDelivr remains for Algolia Experiences / published viking-ui widget snippets (not swagger/redoc).
_CSP_SCRIPT_SRC = (
  "'self' 'unsafe-inline' "
  "https://cdn.jsdelivr.net "
  "https://apis.google.com https://*.firebaseapp.com "
  "https://www.googletagmanager.com https://*.googletagmanager.com "
  "https://www.clarity.ms https://*.clarity.ms "
  "https://cdn.rollbar.com "
  "https://browser.sentry-cdn.com https://js.sentry-cdn.com "
  "https://static.cloudflareinsights.com "
  "https://deml.app https://backend.deml.app "
  "https://dataengineeringformachinelearning.com"
)
_CSP_CONNECT_SRC = (
  "'self' "
  "https://cdn.jsdelivr.net "
  "https://*.googleapis.com "
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
  "https://analytics.google.com https://*.analytics.google.com "
  "https://*.google-analytics.com https://*.googletagmanager.com "
  "https://*.clarity.ms https://*.bing.com "
  "https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io "
  "https://api.rollbar.com https://*.rollbar.com"
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


class ContentSecurityPolicyMiddleware:
  def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
    self.get_response = get_response

  def __call__(self, request: HttpRequest) -> HttpResponse:
    response = self.get_response(request)

    # Inject security headers on text/html responses
    content_type = response.get("Content-Type", "")
    if "text/html" in content_type:
      csp_policy = (
        "default-src 'self'; "
        "base-uri 'self'; "
        "object-src 'none'; "
        "frame-ancestors 'none'; "
        "form-action 'self'; "
        "worker-src 'self' blob:; "
        f"script-src {_CSP_SCRIPT_SRC}; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net "
        "https://deml.app https://backend.deml.app "
        "https://dataengineeringformachinelearning.com; "
        "font-src 'self' data:; "
        f"connect-src {_CSP_CONNECT_SRC}; "
        f"img-src {_CSP_IMG_SRC}; "
        f"frame-src {_CSP_FRAME_SRC}; "
        "upgrade-insecure-requests; block-all-mixed-content;"
      )
      response["Content-Security-Policy"] = csp_policy.strip()
      response["X-Content-Type-Options"] = "nosniff"
      response["X-XSS-Protection"] = "1; mode=block"
      response["Referrer-Policy"] = "strict-origin-when-cross-origin"
      response["Permissions-Policy"] = (
        "geolocation=(), microphone=(), camera=(), payment=(), usb=(), "
        "bluetooth=(), interest-cohort=(), browsing-topics=()"
      )

    return response
