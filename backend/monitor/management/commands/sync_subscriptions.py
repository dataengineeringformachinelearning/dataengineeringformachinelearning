"""Reconcile DEML Pro entitlements against Stripe subscription state."""

from __future__ import annotations

import datetime
import logging
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from monitor.models import UserLifecycleJob, UserProfile

logger = logging.getLogger(__name__)

_ACTIVE_STATUSES = frozenset({"active", "trialing"})


def _period_end(subscription: Any) -> int | None:
  from billing.api import _subscription_period_end

  return _subscription_period_end(subscription)


def _status(subscription: Any) -> str:
  if isinstance(subscription, dict):
    return str(subscription.get("status") or "")
  return str(getattr(subscription, "status", "") or "")


class Command(BaseCommand):
  help = "Sync UserProfile Pro entitlements from Stripe subscription state"

  def add_arguments(self, parser) -> None:
    parser.add_argument(
      "--dry-run",
      action="store_true",
      help="Report changes without writing UserProfile rows",
    )

  def handle(self, *args, **options) -> None:
    dry_run = bool(options["dry_run"])
    try:
      import stripe
    except ImportError:
      self.stderr.write(self.style.ERROR("Stripe SDK is not installed"))
      return

    api_key = str(getattr(settings, "STRIPE_SECRET_KEY", "") or "").strip()
    if not api_key:
      self.stderr.write(self.style.ERROR("STRIPE_SECRET_KEY is not configured"))
      return
    stripe.api_key = api_key

    profiles = (
      UserProfile.objects.filter(user__is_active=True)
      .filter(
        Q(tier="Pro") | (Q(stripe_subscription_id__isnull=False) & ~Q(stripe_subscription_id=""))
      )
      .select_related("user")
      .order_by("pk")
    )

    upgraded = 0
    downgraded = 0
    unchanged = 0
    skipped = 0
    errors = 0

    for profile in profiles.iterator(chunk_size=100):
      if UserLifecycleJob.objects.filter(
        account_id=profile.account_id,
        job_type=UserLifecycleJob.JobType.DELETION,
      ).exists():
        skipped += 1
        continue

      try:
        result = self._sync_one(stripe, profile, dry_run=dry_run)
      except Exception as exc:
        errors += 1
        logger.exception(
          "sync_subscriptions failed account=%s error_type=%s",
          profile.account_id,
          type(exc).__name__,
        )
        continue

      if result == "upgraded":
        upgraded += 1
      elif result == "downgraded":
        downgraded += 1
      else:
        unchanged += 1

    self.stdout.write(
      self.style.SUCCESS(
        "sync_subscriptions complete "
        f"upgraded={upgraded} downgraded={downgraded} unchanged={unchanged} "
        f"skipped={skipped} errors={errors} dry_run={dry_run}"
      )
    )

  def _sync_one(self, stripe: Any, profile: UserProfile, *, dry_run: bool) -> str:
    subscription_id = str(profile.stripe_subscription_id or "").strip()
    subscription: Any | None = None
    if subscription_id:
      try:
        subscription = stripe.Subscription.retrieve(subscription_id)
      except Exception as exc:
        from billing.api import _stripe_resource_is_missing

        if not _stripe_resource_is_missing(exc):
          raise
        subscription = None

    active = subscription is not None and _status(subscription) in _ACTIVE_STATUSES
    with transaction.atomic():
      locked = UserProfile.objects.select_for_update().select_related("user").get(pk=profile.pk)
      if not locked.user.is_active:
        return "unchanged"
      if UserLifecycleJob.objects.filter(
        account_id=locked.account_id,
        job_type=UserLifecycleJob.JobType.DELETION,
      ).exists():
        return "unchanged"

      if active:
        was_pro = locked.tier == "Pro" and locked.subscription_active
        if dry_run:
          return "unchanged" if was_pro else "upgraded"
        locked.tier = "Pro"
        locked.subscription_active = True
        period_end = _period_end(subscription)
        update_fields = ["tier", "subscription_active"]
        if period_end:
          locked.subscription_current_period_end = datetime.datetime.fromtimestamp(
            period_end, tz=datetime.timezone.utc
          )
          update_fields.append("subscription_current_period_end")
        locked.save(update_fields=update_fields)
        return "unchanged" if was_pro else "upgraded"

      was_standard = locked.tier == "Standard" and not locked.subscription_active
      if dry_run:
        return "unchanged" if was_standard else "downgraded"
      locked.tier = "Standard"
      locked.subscription_active = False
      locked.save(update_fields=["tier", "subscription_active"])
      return "unchanged" if was_standard else "downgraded"
