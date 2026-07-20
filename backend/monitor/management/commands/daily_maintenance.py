"""Daily control-plane maintenance — Stripe entitlement sweep + retention purge.

Replaces the retired deml-workers scheduler for the two daily jobs BOOK.md
Appendix D assigns to the control plane: the Stripe ``sync_subscriptions``
sweep (heals missed webhooks) and identity-adjacent retention cleanup
(expired browser sessions, spent auth-handoff tokens, stale rate-limit
buckets). All jobs are idempotent, so overlapping machines during a rolling
deploy are safe. Run with ``--watch`` under start.py supervision.
"""

from __future__ import annotations

import logging
import time
from datetime import timedelta

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import close_old_connections
from django.utils import timezone
from utils.session_registry import purge_expired_sessions

logger = logging.getLogger(__name__)

# Stale headless rate-limit buckets refill long before this horizon.
RATE_LIMIT_BUCKET_MAX_AGE_DAYS = 7
# Handoff tokens are one-time and short-TTL; keep a small forensic grace.
HANDOFF_TOKEN_GRACE_HOURS = 24


# --- Retention purge (identity-adjacent hot data only; FORJD owns sealed data) ---
def run_retention_purge() -> dict[str, int]:
  from monitor.models import AuthHandoffToken, HeadlessRateLimitBucket

  purged: dict[str, int] = {}
  purged["browser_sessions"] = purge_expired_sessions()

  cutoff = timezone.now() - timedelta(hours=HANDOFF_TOKEN_GRACE_HOURS)
  deleted, _ = AuthHandoffToken.objects.filter(expires_at__lte=cutoff).delete()
  purged["auth_handoff_tokens"] = int(deleted)

  bucket_cutoff = timezone.now() - timedelta(days=RATE_LIMIT_BUCKET_MAX_AGE_DAYS)
  deleted, _ = HeadlessRateLimitBucket.objects.filter(updated_at__lte=bucket_cutoff).delete()
  purged["rate_limit_buckets"] = int(deleted)
  return purged


class Command(BaseCommand):
  help = "Run daily maintenance: Stripe sync_subscriptions sweep + retention purge"

  def add_arguments(self, parser) -> None:
    parser.add_argument("--watch", action="store_true")
    parser.add_argument(
      "--interval",
      type=float,
      default=86400.0,
      help="Seconds between watch-mode runs (min 3600)",
    )

  def handle(self, *args, **options) -> None:
    interval = max(3600.0, float(options["interval"]))
    while True:
      self._run_once()
      if not options["watch"]:
        return
      close_old_connections()
      time.sleep(interval)

  def _run_once(self) -> None:
    # Stripe sweep first: entitlements are the user-visible half of the job.
    if str(getattr(settings, "STRIPE_SECRET_KEY", "") or "").strip():
      try:
        call_command("sync_subscriptions")
      except Exception:
        logger.exception("daily_maintenance: sync_subscriptions failed")
    else:
      self.stdout.write("daily_maintenance: Stripe not configured; sweep skipped")

    try:
      purged = run_retention_purge()
      self.stdout.write(self.style.SUCCESS(f"daily_maintenance: retention purge {purged}"))
    except Exception:
      logger.exception("daily_maintenance: retention purge failed")
