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

ALGOLIA_CONFIG = "algolia-config.js"


def resolve_widget_src(root: str, name: str) -> str:
  src_widgets = os.path.join(root, "frontend", "src", "assets", "widgets")
  src_assets = os.path.join(root, "frontend", "src", "assets")
  src = os.path.join(src_widgets, name)
  if not os.path.isfile(src) and name in ("widget.js", "widget.css"):
    src = os.path.join(src_assets, name)
  return src


def sync_widgets() -> None:
  root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
  marketing_widgets = os.path.join(root, "marketing", "public", "assets", "widgets")
  backend_widgets = os.path.join(root, "backend", "static", "widgets")

  os.makedirs(marketing_widgets, exist_ok=True)
  os.makedirs(backend_widgets, exist_ok=True)

  for name in WIDGET_FILES:
    src = resolve_widget_src(root, name)
    if not os.path.isfile(src):
      print(f"Skip missing widget asset: {name}", file=sys.stderr)
      continue

    if name == "cookie-consent.js":
      shutil.copy2(src, os.path.join(marketing_widgets, name))
      print(f"Synced {name} -> marketing")
      continue

    if name == "algolia-search.js":
      shutil.copy2(src, os.path.join(marketing_widgets, name))
      print(f"Synced {name} -> marketing")
      shutil.copy2(src, os.path.join(backend_widgets, name))
      print(f"Synced {name} -> backend")
      continue

    for dst_dir in (marketing_widgets, backend_widgets):
      shutil.copy2(src, os.path.join(dst_dir, name))
      print(f"Synced {name} -> {dst_dir}")


def sync_algolia_config() -> None:
  root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
  src = os.path.join(root, "frontend", "public", "assets", ALGOLIA_CONFIG)
  if not os.path.isfile(src):
    src = os.path.join(root, "frontend", "src", "assets", ALGOLIA_CONFIG)
  if not os.path.isfile(src):
    print(f"Skip missing Algolia config: {ALGOLIA_CONFIG}", file=sys.stderr)
    return

  targets = (
    os.path.join(root, "backend", "static"),
    os.path.join(root, "marketing", "public", "assets"),
    os.path.join(root, "frontend", "public", "assets"),
  )

  for dst_dir in targets:
    os.makedirs(dst_dir, exist_ok=True)
    dst = os.path.join(dst_dir, ALGOLIA_CONFIG)
    shutil.copy2(src, dst)
    print(f"Synced {ALGOLIA_CONFIG} -> {dst_dir}")

  # Verify cross-surface parity (canonical source is frontend/public).
  canonical = os.path.join(root, "frontend", "public", "assets", ALGOLIA_CONFIG)
  for dst_dir in targets:
    dst = os.path.join(dst_dir, ALGOLIA_CONFIG)
    if os.path.getsize(canonical) != os.path.getsize(dst):
      print(f"Algolia config drift detected: {dst}", file=sys.stderr)
      sys.exit(1)


if __name__ == "__main__":
  sync_widgets()
  sync_algolia_config()
