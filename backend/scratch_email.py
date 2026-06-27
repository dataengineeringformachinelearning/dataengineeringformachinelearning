import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from utils.email import send_alert_email

send_alert_email("Test Alert", "This is a test of the resend API.")
print("Done")
