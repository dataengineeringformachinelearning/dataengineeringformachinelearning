import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from django.contrib.auth.models import User
from monitor.models import (
  AnalyticsIntegration,
  APIKey,
  AuditLog,
  IncidentCase,
  StatusPage,
  ThreatIntelligence,
)

primary_id = 22
old_ids = [18, 19]
primary_user = User.objects.get(id=primary_id)

for old_id in old_ids:
  print(f"Merging user {old_id} into {primary_id}")
  StatusPage.objects.filter(user_id=old_id).update(user=primary_user)
  AnalyticsIntegration.objects.filter(user_id=old_id).update(user=primary_user)
  APIKey.objects.filter(user_id=old_id).update(user=primary_user)
  AuditLog.objects.filter(user_id=old_id).update(user=primary_user)
  IncidentCase.objects.filter(assigned_to_id=old_id).update(assigned_to=primary_user)
  ThreatIntelligence.objects.filter(user_id=old_id).update(user=primary_user)
print("Done merging accounts.")
