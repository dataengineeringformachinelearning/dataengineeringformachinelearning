import mimetypes

from django.conf import settings
from django.http import FileResponse, Http404, HttpRequest, HttpResponse
from django.shortcuts import render


def home(request: HttpRequest) -> HttpResponse:
  frontend_url = settings.FRONTEND_URL.rstrip("/")
  return render(
    request,
    "home.html",
    {
      "debug": settings.DEBUG,
      "frontend_url": frontend_url,
      "marketing_url": settings.MARKETING_URL.rstrip("/"),
    },
  )


def honeypot_trap(request: HttpRequest, path: str) -> HttpResponse:
  """Catch crawlers/scanners at decoy paths and log the interaction.

  This catch-all view checks if the requested path is a registered honeypot trap.
  If so, it logs the interaction for later threat analysis and ML training.
  """
  from monitor.models import HoneypotEndpoint
  from ml.ml_services import log_honeypot_interaction

  # Check if this is a registered honeypot trap
  honeypot = HoneypotEndpoint.objects.filter(
    path=f"/{path}", is_active=True
  ).first()

  if honeypot:
    source_ip = (
      request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR", "unknown"))
      .split(",")[0]
      .strip()
    )
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    log_honeypot_interaction(
      honeypot=honeypot,
      source_ip=source_ip,
      user_agent=user_agent,
      method=request.method,
      request_headers=dict(request.headers),
    )

  # Always return 404 to appear like a real dead-end
  return HttpResponse(status=404)


def custom_404(request: HttpRequest, exception: Exception) -> HttpResponse:
  frontend_url = settings.FRONTEND_URL.rstrip("/")
  return render(
    request,
    "404.html",
    {
      "debug": settings.DEBUG,
      "frontend_url": frontend_url,
      "marketing_url": settings.MARKETING_URL.rstrip("/"),
    },
    status=404,
  )


def serve_asset(request: HttpRequest, path: str) -> FileResponse:
  """Serve shared JSON/CSS assets at /assets/* (marketing + widget parity)."""
  assets_root = (settings.BASE_DIR / "static" / "assets").resolve()
  file_path = (assets_root / path).resolve()
  if not str(file_path).startswith(str(assets_root)) or not file_path.is_file():
    raise Http404
  content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
  return FileResponse(file_path.open("rb"), content_type=content_type)


def robots_txt(request: HttpRequest) -> HttpResponse:
  """Serve robots.txt with sitemap reference. — Antigravity - Claude Opus 4.6"""
  sitemap_url = request.build_absolute_uri("/sitemap.xml")
  lines = [
    "User-agent: *",
    "Allow: /",
    "Allow: /api/v1/docs",
    "Disallow: /api/",
    "",
    f"Sitemap: {sitemap_url}",
  ]
  return HttpResponse("\n".join(lines), content_type="text/plain")
