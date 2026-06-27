from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render


def telemetry_home(request: HttpRequest) -> HttpResponse:
  frontend_url = settings.FRONTEND_URL.rstrip("/")
  return render(
    request,
    "telemetry_home.html",
    {
      "debug": settings.DEBUG,
      "frontend_url": frontend_url,
      "marketing_url": settings.MARKETING_URL.rstrip("/"),
      "design_system_url": f"{frontend_url}/assets/design-system.css",
    },
  )
