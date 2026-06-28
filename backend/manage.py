#!/usr/bin/env python
import os
import sys

import django.urls

# Django 6 + Django-Ninja Workaround
import django.urls.converters

_orig_register = django.urls.converters.register_converter


def safe_register_converter(converter, type_name):
  try:
    from django.urls.converters import get_converters

    if type_name in get_converters():
      return
  except Exception:
    pass

  try:
    _orig_register(converter, type_name)
  except ValueError as e:
    if type_name == "uuid":
      pass
    else:
      raise e


django.urls.converters.register_converter = safe_register_converter
if hasattr(django.urls, "register_converter"):
  django.urls.register_converter = safe_register_converter


def main():
  """Run administrative tasks."""
  os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
  try:
    from django.core.management import execute_from_command_line
  except ImportError as exc:
    raise ImportError(
      "Couldn't import Django. Are you sure it's installed and "
      "available on your PYTHONPATH environment variable? Did you "
      "forget to activate a virtual environment?"
    ) from exc
  execute_from_command_line(sys.argv)


if __name__ == "__main__":
  main()
