"""Unit tests for analytics provider sync helpers."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from monitor.analytics_sync import (
  _fetch_clarity_metrics,
  _fetch_cloudflare_metrics,
  _fetch_google_metrics,
  _region_for_provider,
)


def test_region_for_provider() -> None:
  assert _region_for_provider("google") == "ga4"
  assert _region_for_provider("microsoft") == "clarity"
  assert _region_for_provider("cloudflare") == "cloudflare"


def test_fetch_google_missing_token() -> None:
  result = _fetch_google_metrics({})
  assert result["ok"] is False
  assert result["detail"] == "missing_access_token"


def test_fetch_clarity_missing_creds() -> None:
  result = _fetch_clarity_metrics({"project_id": "x"})
  assert result["ok"] is False


@patch("monitor.analytics_sync.SESSION")
def test_fetch_cloudflare_parses_graphql(mock_session: MagicMock) -> None:
  mock_response = MagicMock()
  mock_response.status_code = 200
  mock_response.json.return_value = {
    "data": {
      "viewer": {
        "zones": [
          {
            "httpRequests1dGroups": [
              {"sum": {"requests": 120, "pageViews": 40}},
            ]
          }
        ]
      }
    }
  }
  mock_session.post.return_value = mock_response
  result = _fetch_cloudflare_metrics({"project_id": "zone-1", "api_key": "tok"})
  assert result["ok"] is True
  assert result["requests"] == 120
  assert result["pageviews"] == 40
