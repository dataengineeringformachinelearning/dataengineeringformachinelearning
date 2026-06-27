import os
import sys

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from firebase_admin import firestore

# Usage: python check_prod_firestore.py [uid]
# Targets the named "deml" database used by Event Projections flows.
uid = sys.argv[1] if len(sys.argv) > 1 else os.getenv("TEST_UID", "test-uid")

db = firestore.client(database_id="deml")
doc_ref = db.collection("users").document(uid).collection("data").document("stats")
doc = doc_ref.get()
if doc.exists:
  print(f"Doc exists for {uid} in 'deml' DB: {doc.to_dict()}", flush=True)
else:
  print(f"Doc does NOT exist for {uid} in 'deml' DB.", flush=True)

# Also show recent events if any
print("\nRecent events (last 3):")
events = db.collection("events").limit(3).stream()
for e in events:
  print(e.to_dict())
