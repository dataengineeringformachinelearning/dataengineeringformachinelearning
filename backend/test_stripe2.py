import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
import stripe
from django.conf import settings

stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")

try:
  stripe.Customer.list(email="")
  print("Empty email works")
except Exception as e:
  print(f"Empty email error: {e}")

try:
  stripe.Customer.list(email=None)
  print("None email works")
except Exception as e:
  print(f"None email error: {e}")
