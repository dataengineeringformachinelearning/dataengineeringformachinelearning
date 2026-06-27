import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

import stripe
from django.conf import settings

stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")

try:
  print(f"Key is: {stripe.api_key}")
  print("Testing Stripe customer list...")
  customers = stripe.Customer.list(email="test@example.com").data
  print(f"Success! Customers: {customers}")
except Exception as e:
  print(f"Error: {e}")
