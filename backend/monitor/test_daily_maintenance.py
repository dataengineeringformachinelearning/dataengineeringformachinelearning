"""Daily maintenance command — Stripe sweep gating + retention purge."""

from __future__ import annotations

from datetime import timedelta
from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.utils import timezone

from monitor.management.commands.daily_maintenance import run_retention_purge
from monitor.models import AuthHandoffToken, BrowserSession, HeadlessRateLimitBucket


# --- Retention purge ---
@pytest.mark.django_db
def test_retention_purge_deletes_expired_identity_hot_data() -> None:
  now = timezone.now()
  BrowserSession.objects.create(
    session_id="expired",
    firebase_uid="uid-1",
    user_id=1,
    expires_at=now - timedelta(hours=1),
  )
  BrowserSession.objects.create(
    session_id="live",
    firebase_uid="uid-1",
    user_id=1,
    expires_at=now + timedelta(hours=1),
  )
  AuthHandoffToken.objects.create(
    token_hash="a" * 64,
    user_id=1,
    expires_at=now - timedelta(days=2),
  )
  AuthHandoffToken.objects.create(
    token_hash="b" * 64,
    user_id=1,
    expires_at=now + timedelta(minutes=5),
  )
  HeadlessRateLimitBucket.objects.create(
    scope_key="stale",
    tokens=1.0,
    updated_at=now - timedelta(days=30),
  )

  purged = run_retention_purge()

  assert purged["browser_sessions"] == 1
  assert purged["auth_handoff_tokens"] == 1
  assert purged["rate_limit_buckets"] == 1
  assert BrowserSession.objects.filter(session_id="live").exists()
  assert AuthHandoffToken.objects.filter(token_hash="b" * 64).exists()


# --- Stripe sweep gating ---
@pytest.mark.django_db
def test_stripe_sweep_skipped_without_secret_key(settings) -> None:
  settings.STRIPE_SECRET_KEY = ""
  out = StringIO()
  with patch("monitor.management.commands.daily_maintenance.call_command") as sweep:
    call_command("daily_maintenance", stdout=out)
  sweep.assert_not_called()
  assert "Stripe not configured" in out.getvalue()


@pytest.mark.django_db
def test_stripe_sweep_runs_when_configured(settings) -> None:
  settings.STRIPE_SECRET_KEY = "sk_test_x"  # pragma: allowlist secret
  with patch("monitor.management.commands.daily_maintenance.call_command") as sweep:
    call_command("daily_maintenance")
  sweep.assert_called_once_with("sync_subscriptions")


@pytest.mark.django_db
def test_sweep_failure_does_not_block_retention(settings) -> None:
  settings.STRIPE_SECRET_KEY = "sk_test_x"  # pragma: allowlist secret
  now = timezone.now()
  BrowserSession.objects.create(
    session_id="expired",
    firebase_uid="uid-1",
    user_id=1,
    expires_at=now - timedelta(hours=1),
  )
  with patch(
    "monitor.management.commands.daily_maintenance.call_command",
    side_effect=RuntimeError("stripe down"),
  ):
    call_command("daily_maintenance")
  assert not BrowserSession.objects.filter(session_id="expired").exists()
