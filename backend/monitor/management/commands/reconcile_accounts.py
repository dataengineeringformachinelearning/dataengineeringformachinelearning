from typing import Any

from account.lifecycle import reconcile_all_accounts
from django.core.management.base import BaseCommand


class Command(BaseCommand):
  help = (
    "Reconcile user accounts: validated sites, orphaned status pages, "
    "Stripe subscriptions, and pending deletion jobs."
  )

  def handle(self, *args: Any, **options: Any) -> None:
    stats = reconcile_all_accounts()
    self.stdout.write(self.style.SUCCESS(f"Account reconciliation complete: {stats}"))
