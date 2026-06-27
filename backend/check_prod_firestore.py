import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from firebase_admin import firestore

db = firestore.client()
doc = db.collection("users").document("2").collection("data").document("stats").get()
if doc.exists:
  print(f"Doc exists: {doc.to_dict()}", flush=True)
else:
  print("Doc does NOT exist", flush=True)
