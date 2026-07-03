#!/usr/bin/env python3
"""
Sync embeddable widget assets from frontend to marketing public/.

Cookie consent and Algolia search bridge are marketing-only surfaces.
Navbar widget is shared with backend static templates.
"""

from __future__ import annotations

import os
import shutil
import sys

WIDGET_FILES = (
  "widget.js",
  "widget.css",
  "cookie-consent.js",
  "algolia-search.js",
  "navbar.js",
)


def sync_widgets() -> None:
  root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
  src_widgets = os.path.join(root, "frontend", "src", "assets", "widgets")
  marketing_widgets = os.path.join(root, "marketing", "public", "assets", "widgets")
  backend_widgets = os.path.join(root, "backend", "static", "widgets")

  os.makedirs(marketing_widgets, exist_ok=True)
  os.makedirs(backend_widgets, exist_ok=True)

  for name in WIDGET_FILES:
    src = os.path.join(src_widgets, name)
    if not os.path.isfile(src):
      print(f"Skip missing widget asset: {name}", file=sys.stderr)
      continue

    if name in ("cookie-consent.js", "algolia-search.js"):
      shutil.copy2(src, os.path.join(marketing_widgets, name))
      print(f"Synced {name} -> marketing")
      continue

    for dst_dir in (marketing_widgets, backend_widgets):
      shutil.copy2(src, os.path.join(dst_dir, name))
      print(f"Synced {name} -> {dst_dir}")


if __name__ == "__main__":
  sync_widgets()
