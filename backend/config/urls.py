from django.contrib import admin
from django.urls import path, converters
from . import views
from django.contrib.sitemaps.views import sitemap
from .sitemaps import StaticViewSitemap

# Django 6 / Django-Ninja Workaround: Unregister 'uuid' path converter before importing Ninja
registered_converters = converters.get_converters()
if 'uuid' in registered_converters:
    del registered_converters['uuid']

from .api import api

sitemaps = {
    'static': StaticViewSitemap,
}

urlpatterns = [
    path('', views.home, name='home'),
    path('api/v1/', api.urls), # Using /api/v1/ for the ninja router
    path('admin/', admin.site.urls),
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
]
