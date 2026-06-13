from django.conf import settings
from django.shortcuts import render


def home(request):
  return render(
    request,
    "home.html",
    {"debug": settings.DEBUG, "frontend_url": settings.FRONTEND_URL.rstrip("/")},
  )
