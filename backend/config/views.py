from django.conf import settings
from django.http import HttpRequest, HttpResponse
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
