#!/usr/bin/env python3
"""
Sync embeddable widget assets from frontend to marketing public/.

Keeps widget.js, widget.css, and cookie-consent.js identical across apps
so embeds look and behave the same on deml.app and the marketing site.
"""

from __future__ import annotations

import os
import shutil
import sys

WIDGET_FILES = ("widget.js", "widget.css", "cookie-consent.js")


def sync_widgets() -> None:
  root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
  src_dir = os.path.join(root, "frontend", "src", "assets")
  src_widgets = os.path.join(src_dir, "widgets")
  dst_dir = os.path.join(root, "marketing", "public", "assets", "widgets")

  os.makedirs(dst_dir, exist_ok=True)

  for name in WIDGET_FILES:
    src_widgets_path = os.path.join(src_widgets, name)
    src_assets_path = os.path.join(src_dir, name)
    src = src_widgets_path if os.path.isfile(src_widgets_path) else src_assets_path
    if not os.path.isfile(src):
      print(f"Skip missing widget asset: {name}", file=sys.stderr)
      continue
    dst = os.path.join(dst_dir, name)
    shutil.copy2(src, dst)
    print(f"Synced {name} -> {dst}")


if __name__ == "__main__":
  sync_widgets()
