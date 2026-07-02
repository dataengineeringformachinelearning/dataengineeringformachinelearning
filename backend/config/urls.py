from django.contrib.sitemaps.views import sitemap
from django.urls import converters, path

from telemetry.views import telemetry_home

from . import views
from .sitemaps import APIDocsSitemap, StaticViewSitemap

# Django 6 / Django-Ninja Workaround: Unregister 'uuid' path converter before importing Ninja
if "uuid" in converters.DEFAULT_CONVERTERS:
  del converters.DEFAULT_CONVERTERS["uuid"]
if "uuid" in converters.REGISTERED_CONVERTERS:
  del converters.REGISTERED_CONVERTERS["uuid"]
converters.get_converters.cache_clear()

from .api import api

sitemaps = {
  "static": StaticViewSitemap,
  "api_docs": APIDocsSitemap,
}

urlpatterns = [
  path("", views.home, name="home"),
  path("telemetry/", telemetry_home, name="telemetry_home"),
  path("api/v1/", api.urls),  # Using /api/v1/ for the ninja router
  path("robots.txt", views.robots_txt, name="robots_txt"),
  path(
    "sitemap.xml", sitemap, {"sitemaps": sitemaps}, name="django.contrib.sitemaps.views.sitemap"
  ),
]

handler404 = "config.views.custom_404"
