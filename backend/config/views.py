from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render


def home(request: HttpRequest) -> HttpResponse:
  return render(
    request,
    "home.html",
    {
      "debug": settings.DEBUG,
      "frontend_url": settings.FRONTEND_URL.rstrip("/"),
      "marketing_url": settings.MARKETING_URL.rstrip("/"),
    },
  )


def custom_404(request: HttpRequest, exception: Exception) -> HttpResponse:
  return render(
    request,
    "404.html",
    {
      "debug": settings.DEBUG,
      "frontend_url": settings.FRONTEND_URL.rstrip("/"),
      "marketing_url": settings.MARKETING_URL.rstrip("/"),
    },
    status=404,
  )


def robots_txt(request: HttpRequest) -> HttpResponse:
  sitemap_url = request.build_absolute_uri("/sitemap.xml")
  lines = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "",
    f"Sitemap: {sitemap_url}",
  ]
  return HttpResponse("\n".join(lines), content_type="text/plain")
