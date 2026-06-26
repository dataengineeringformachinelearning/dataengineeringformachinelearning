import datetime
import logging

from django.core.management.base import BaseCommand

from monitor.models import Tenant

logger = logging.getLogger(__name__)


class Command(BaseCommand):
  help = "Sweeps all tenants and syncs their subscription status with Stripe"

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
    tenants = Tenant.objects.all()

    for tenant in tenants:
      # Find owner email
      owner_membership = tenant.members.filter(role="Owner").first()
      if not owner_membership:
        continue

      email = owner_membership.user.email
      if not email:
        continue

      try:
        customers = stripe.Customer.list(email=email).data
        active_sub_found = False

        if customers:
          for customer in customers:
            subscriptions = stripe.Subscription.list(customer=customer.id, status="active").data
            if subscriptions:
              sub = subscriptions[0]
              tenant.tier = "Pro"
              tenant.stripe_customer_id = customer.id
              tenant.stripe_subscription_id = sub.id
              tenant.subscription_active = True
              tenant.subscription_current_period_end = datetime.datetime.fromtimestamp(
                sub.current_period_end, tz=datetime.timezone.utc
              )
              tenant.save()
              active_sub_found = True
              self.stdout.write(
                self.style.SUCCESS(f"Synced active subscription for {tenant.name} ({email})")
              )
              break

        if not active_sub_found:
          # If we used to have an active sub or if it's currently marked active but shouldn't be
          if tenant.subscription_active or tenant.tier == "Pro":
            tenant.tier = "Standard"
            tenant.subscription_active = False
            tenant.save()
            self.stdout.write(
              self.style.WARNING(
                f"Downgraded tenant {tenant.name} ({email}) - no active subscription found"
              )
            )

      except Exception as e:
        logger.error(f"Error syncing tenant {tenant.id} ({email}): {e}")
        self.stderr.write(self.style.ERROR(f"Error syncing {tenant.name}: {e}"))

    self.stdout.write(self.style.SUCCESS("Subscription sweep completed."))
