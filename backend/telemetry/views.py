from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render


def telemetry_home(request: HttpRequest) -> HttpResponse:
  return render(
    request,
    "telemetry_home.html",
    {
      "debug": settings.DEBUG,
      "frontend_url": settings.FRONTEND_URL.rstrip("/"),
      "marketing_url": settings.MARKETING_URL.rstrip("/"),
    },
  )
