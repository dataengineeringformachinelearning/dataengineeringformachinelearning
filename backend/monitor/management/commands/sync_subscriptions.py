import datetime
import logging

from django.core.management.base import BaseCommand

from monitor.models import UserProfile

logger = logging.getLogger(__name__)


class Command(BaseCommand):
  help = "Sweeps user profiles and syncs subscription status with Stripe"

  def handle(self, *args, **options):
    try:
      import stripe
    except ImportError:
      self.stderr.write(self.style.ERROR("Stripe is not installed"))
      return

    from django.conf import settings

    stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")
    if not stripe.api_key:
      self.stderr.write(self.style.ERROR("STRIPE_SECRET_KEY is not set"))
      return

    self.stdout.write("Starting subscription sweep...")
    from django.db.models import Q

    profiles = (
      UserProfile.objects.select_related("user")
      .exclude(
        Q(tier="Standard")
        & Q(subscription_active=False)
        & Q(stripe_customer_id__isnull=True)
        & (Q(user__email="") | Q(user__email__isnull=True))
        & (Q(linked_emails=[]) | Q(linked_emails__isnull=True))
      )
      .iterator(chunk_size=200)
    )

    checked = 0
    downgraded = 0
    upgraded = 0

    for profile in profiles:
      checked += 1
      user = profile.user
      emails_to_check = set()
      if user.email:
        emails_to_check.add(user.email)

      if profile.linked_emails:
        for linked_email in profile.linked_emails:
          emails_to_check.add(linked_email)

      if not emails_to_check and not profile.stripe_customer_id:
        if profile.stripe_customer_id is None and profile.tier == "Pro":
          if not profile.subscription_active:
            profile.subscription_active = True
            profile.save(update_fields=["subscription_active"])
        else:
          if profile.subscription_active or profile.tier == "Pro":
            profile.tier = "Standard"
            profile.subscription_active = False
            profile.save(update_fields=["tier", "subscription_active"])
            downgraded += 1
        continue

      try:
        customers = []
        if profile.stripe_customer_id:
          try:
            customer = stripe.Customer.retrieve(profile.stripe_customer_id)
            if not getattr(customer, "deleted", False):
              customers.append(customer)
          except Exception:
            pass

        if not customers:
          for email in emails_to_check:
            customers.extend(stripe.Customer.list(email=email, limit=5).data)

        active_sub_found = False

        if customers:
          for customer in customers:
            subscriptions = stripe.Subscription.list(
              customer=customer.id, status="active", limit=1
            ).data
            if subscriptions:
              sub = subscriptions[0]
              profile.tier = "Pro"
              profile.stripe_customer_id = customer.id
              profile.stripe_subscription_id = sub.id
              profile.subscription_active = True
              profile.subscription_current_period_end = datetime.datetime.fromtimestamp(
                sub.current_period_end, tz=datetime.timezone.utc
              )
              profile.save(
                update_fields=[
                  "tier",
                  "stripe_customer_id",
                  "stripe_subscription_id",
                  "subscription_active",
                  "subscription_current_period_end",
                ]
              )
              active_sub_found = True
              upgraded += 1
              self.stdout.write(
                self.style.SUCCESS(f"Synced active subscription for {user.username}")
              )
              break

        if not active_sub_found:
          if profile.stripe_customer_id is None and profile.tier == "Pro":
            if not profile.subscription_active:
              profile.subscription_active = True
              profile.save(update_fields=["subscription_active"])
            continue

          if profile.subscription_active or profile.tier == "Pro":
            profile.tier = "Standard"
            profile.subscription_active = False
            profile.save(update_fields=["tier", "subscription_active"])
            downgraded += 1
            self.stdout.write(
              self.style.WARNING(f"Downgraded user {user.username} - no active subscription found")
            )

      except Exception as e:
        logger.error(f"Error syncing profile {profile.account_id}: {e}")
        self.stderr.write(self.style.ERROR(f"Error syncing {user.username}: {e}"))

    self.stdout.write(
      self.style.SUCCESS(
        f"Subscription sweep completed. Checked {checked} profiles "
        f"({upgraded} upgraded, {downgraded} downgraded)."
      )
    )
