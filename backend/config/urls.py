from django.contrib import admin
from django.urls import path, converters
from . import views
from django.contrib.sitemaps.views import sitemap
from .sitemaps import StaticViewSitemap

# Django 6 / Django-Ninja Workaround: Unregister 'uuid' path converter before importing Ninja
if 'uuid' in converters.DEFAULT_CONVERTERS:
    del converters.DEFAULT_CONVERTERS['uuid']
if 'uuid' in converters.REGISTERED_CONVERTERS:
    del converters.REGISTERED_CONVERTERS['uuid']
converters.get_converters.cache_clear()

from .api import api

sitemaps = {
    'static': StaticViewSitemap,
}

urlpatterns = [
    path('', views.home, name='home'),
    path('api/v1/', api.urls), # Using /api/v1/ for the ninja router
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
]
