#!/usr/bin/env python3
"""Sync self-hosted Inter variable font files to all DEML static asset paths."""

from __future__ import annotations

import os
import shutil
import sys

FONT_FILES = ("InterVariable.woff2", "InterVariable-Italic.woff2")

FONT_TARGETS = (
  "frontend/src/assets/fonts/inter",
  "frontend/public/assets/fonts/inter",
  "backend/static/fonts/inter",
  "marketing/public/assets/fonts/inter",
  "viking-ui-docs/public/assets/fonts/inter",
)


def sync_fonts() -> None:
  root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
  src_dir = os.path.join(root, "packages", "viking-ui", "src", "assets", "fonts", "inter")

  if not os.path.isdir(src_dir):
    print(f"Font source directory missing: {src_dir}", file=sys.stderr)
    sys.exit(1)

  for name in FONT_FILES:
    src = os.path.join(src_dir, name)
    if not os.path.isfile(src):
      print(f"Expected font file missing: {src}", file=sys.stderr)
      sys.exit(1)

  for rel in FONT_TARGETS:
    dst_dir = os.path.join(root, rel)
    os.makedirs(dst_dir, exist_ok=True)
    for name in FONT_FILES:
      shutil.copy2(os.path.join(src_dir, name), os.path.join(dst_dir, name))
    print(f"Synced Inter fonts -> {rel}")


if __name__ == "__main__":
  sync_fonts()
