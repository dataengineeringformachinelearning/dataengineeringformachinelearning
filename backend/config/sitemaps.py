# Sitemaps — Antigravity - Claude Opus 4.6
from django.contrib.sitemaps import Sitemap
from django.urls import reverse


class StaticViewSitemap(Sitemap):
  priority = 0.5
  changefreq = "daily"

  def items(self):
    return ["home", "telemetry_home"]

  def location(self, item):
    return reverse(item)


class APIDocsSitemap(Sitemap):
  """Expose the Swagger docs page for SEO crawlers."""

  priority = 0.3
  changefreq = "weekly"

  def items(self):
    return ["/api/v1/docs"]

  def location(self, item):
    return item
