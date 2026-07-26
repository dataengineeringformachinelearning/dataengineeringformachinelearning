"""Session touch throttling — cut write amplification under dashboard poll."""

from __future__ import annotations

from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.utils import timezone

from utils.session_registry import TOUCH_MIN_INTERVAL_SECONDS, touch_session


def test_touch_session_skips_write_when_recently_touched() -> None:
  now = timezone.now()
  filter_qs = MagicMock()
  filter_qs.update.return_value = 0
  exists_qs = MagicMock()
  exists_qs.exists.return_value = True

  browser = MagicMock()
  browser.objects.filter.side_effect = [filter_qs, exists_qs]

  with patch("monitor.models.BrowserSession", browser):
    assert touch_session("sess-1") is True

  first_kwargs = browser.objects.filter.call_args_list[0].kwargs
  assert first_kwargs["session_id"] == "sess-1"
  assert "last_seen__lt" in first_kwargs
  assert first_kwargs["last_seen__lt"] <= now - timedelta(seconds=TOUCH_MIN_INTERVAL_SECONDS - 5)
  filter_qs.update.assert_called_once()
  exists_qs.exists.assert_called_once()


def test_touch_session_writes_when_stale() -> None:
  filter_qs = MagicMock()
  filter_qs.update.return_value = 1
  browser = MagicMock()
  browser.objects.filter.return_value = filter_qs

  with patch("monitor.models.BrowserSession", browser):
    assert touch_session("sess-2") is True

  filter_qs.update.assert_called_once()
  assert browser.objects.filter.call_count == 1
