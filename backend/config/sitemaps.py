# Sitemaps — Antigravity - Claude Opus 4.6
from django.contrib.sitemaps import Sitemap
from django.urls import reverse


class StaticViewSitemap(Sitemap):
  priority = 0.5
  changefreq = "daily"

  def items(self):
    return ["home", "documentation"]

  def location(self, item):
    return reverse(item)


class APIDocsSitemap(Sitemap):
  """API docs stay reachable for humans but are not advertised to crawlers."""

  priority = 0.1
  changefreq = "yearly"

  def items(self):
    return []

  def location(self, item):
    return item
