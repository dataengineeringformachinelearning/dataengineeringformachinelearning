import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

import json

from config.api import api

with open("openapi.json", "w") as f:
  json.dump(api.get_openapi_schema(), f)
print("Schema dumped")
