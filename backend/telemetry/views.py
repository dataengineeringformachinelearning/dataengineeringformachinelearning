from django.conf import settings
from django.shortcuts import render


def telemetry_home(request):
  return render(
    request,
    "telemetry_home.html",
    {"debug": settings.DEBUG, "frontend_url": settings.FRONTEND_URL.rstrip("/")},
  )
