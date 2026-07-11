"""Tests for DEML-site-scoped GA4 property and hostname filtering."""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model

from monitor.models import MonitoredService, StatusPage, UserProfile
from monitor.services.ga4_scope import (
  build_site_bindings,
  ga4_hostname_filter,
  hostname_aliases,
  normalize_hostname,
  parse_ga_identifier,
  user_site_hosts,
)

User = get_user_model()


@pytest.fixture
def ga_user(db: Any) -> Any:
  user = User.objects.create_user(username="ga-user", password="x")
  UserProfile.objects.create(user=user, role="Operator")
  return user


@pytest.mark.django_db
def test_normalize_and_aliases() -> None:
  assert normalize_hostname("https://www.Example.com/path") == "www.example.com"
  assert "example.com" in hostname_aliases("www.example.com")
  assert "www.example.com" in hostname_aliases("example.com")


@pytest.mark.django_db
def test_parse_ga_identifier() -> None:
  assert parse_ga_identifier("G-ABC123") == ("G-ABC123", None)
  assert parse_ga_identifier("properties/123456") == (None, "123456")
  assert parse_ga_identifier("123456") == (None, "123456")
  assert parse_ga_identifier("") == (None, None)


@pytest.mark.django_db
def test_user_site_hosts_only_monitored_services(ga_user: Any) -> None:
  page = StatusPage.objects.create(
    user=ga_user,
    title="Main",
    slug="main-site",
    google_analytics_id="G-ONLYONE",
  )
  MonitoredService.objects.create(
    status_page=page, name="Web", url="https://app.example.com/health"
  )
  hosts = user_site_hosts(ga_user)
  assert "app.example.com" in hosts
  assert "www.app.example.com" in hosts


@pytest.mark.django_db
def test_build_site_bindings_requires_page_ga_and_hosts(ga_user: Any) -> None:
  page = StatusPage.objects.create(
    user=ga_user,
    title="Main",
    slug="main-bound",
    google_analytics_id="G-ONLYONE",
  )
  MonitoredService.objects.create(status_page=page, name="Web", url="https://only.example.com")

  # Second page has no GA id — must not create a binding.
  other = StatusPage.objects.create(user=ga_user, title="Other", slug="other-no-ga")
  MonitoredService.objects.create(status_page=other, name="Other", url="https://other.example.com")

  with (
    patch(
      "monitor.services.ga4_scope.list_accessible_property_ids",
      return_value=["999"],
    ),
    patch(
      "monitor.services.ga4_scope.resolve_property_id_for_measurement",
      return_value="999",
    ) as resolve,
  ):
    bindings = build_site_bindings(ga_user, "token")

  assert len(bindings) == 1
  assert bindings[0].property_id == "999"
  assert "only.example.com" in bindings[0].hosts
  assert "other.example.com" not in bindings[0].hosts
  resolve.assert_called_once()


@pytest.mark.django_db
def test_build_site_bindings_skips_without_hosts(ga_user: Any) -> None:
  StatusPage.objects.create(
    user=ga_user,
    title="Empty",
    slug="empty-hosts",
    google_analytics_id="G-EMPTY",
  )
  with patch("monitor.services.ga4_scope.list_accessible_property_ids", return_value=[]):
    bindings = build_site_bindings(ga_user, "token")
  assert bindings == []


@pytest.mark.django_db
def test_ga4_hostname_filter() -> None:
  filt = ga4_hostname_filter({"a.com", "www.a.com"})
  assert filt is not None
  assert filt["filter"]["fieldName"] == "hostName"
  values = filt["filter"]["inListFilter"]["values"]
  assert "a.com" in values
  assert "www.a.com" in values


@pytest.mark.django_db
def test_fetch_scoped_drops_unlisted_hosts(ga_user: Any) -> None:
  from telemetry.management.commands.fetch_threat_intel import Command

  binding = MagicMock()
  binding.property_id = "111"
  binding.hosts = frozenset({"allowed.example.com", "www.allowed.example.com"})

  fake_response = MagicMock()
  fake_response.status_code = 200
  fake_response.content = b"{}"
  fake_response.json.return_value = {
    "rows": [
      {
        "dimensionValues": [
          {"value": "allowed.example.com"},
          {"value": "US"},
          {"value": "NYC"},
        ],
        "metricValues": [{"value": "12"}],
      },
      {
        "dimensionValues": [
          {"value": "other-site.example.com"},
          {"value": "US"},
          {"value": "LA"},
        ],
        "metricValues": [{"value": "99"}],
      },
    ]
  }

  cmd = Command()
  with patch(
    "telemetry.management.commands.fetch_threat_intel.requests.post", return_value=fake_response
  ):
    rows = cmd._fetch_ga4_report_scoped("token", [binding])

  assert len(rows) == 1
  assert rows[0]["host"] == "allowed.example.com"
  assert rows[0]["active_users"] == 12
