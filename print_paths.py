import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from config.api import api

schema = api.get_openapi_schema()
print(list(schema.get("paths", {}).keys()))
