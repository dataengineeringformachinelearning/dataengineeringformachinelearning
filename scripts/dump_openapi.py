#!/usr/bin/env python3
"""Dump Django Ninja OpenAPI schema to frontend/openapi.json.

Schema is kept for API docs and contract inspection. The Angular OpenAPI
client under frontend/src/app/api was retired; the app uses hand-rolled
HttpClient services instead.
"""

from __future__ import annotations

import json
import os
import sys


def main() -> None:
  script_dir = os.path.dirname(os.path.abspath(__file__))
  root_dir = os.path.dirname(script_dir)
  backend_dir = os.path.join(root_dir, "backend")
  sys.path.insert(0, backend_dir)
  os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

  import django

  django.setup()

  from config.api import api

  out_path = os.path.join(root_dir, "frontend", "openapi.json")
  with open(out_path, "w", encoding="utf-8") as f:
    json.dump(api.get_openapi_schema(), f, indent=2)
    f.write("\n")
  print(f"Wrote {out_path}")


if __name__ == "__main__":
  main()
