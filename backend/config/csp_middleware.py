from collections.abc import Callable

from django.http import HttpRequest, HttpResponse


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
        "worker-src 'self' blob:; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://*.jsdelivr.net https://apis.google.com https://*.firebaseapp.com; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.jsdelivr.net https://fonts.googleapis.com https://deml.app https://*.deml.app; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "connect-src 'self' https://cdn.jsdelivr.net https://*.jsdelivr.net https://*.googleapis.com https://*.firebaseio.com; "
        "img-src 'self' data: blob: https://deml.app https://*.deml.app; "
        "frame-src 'self' https://*.firebaseapp.com;"
      )
      response["Content-Security-Policy"] = csp_policy
      response["X-Frame-Options"] = "SAMEORIGIN"
      response["X-Content-Type-Options"] = "nosniff"
      response["X-XSS-Protection"] = "1; mode=block"
      response["Referrer-Policy"] = "strict-origin-when-cross-origin"
      response["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    return response
