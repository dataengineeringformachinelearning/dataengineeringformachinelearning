#!/usr/bin/env python3
"""Sync self-hosted Inter variable font files to all DEML static asset paths."""

from __future__ import annotations

import os
import shutil
import sys
from typing import Final

FONT_FILES: Final = ("InterVariable.woff2", "InterVariable-Italic.woff2")
WOFF2_MAGIC: Final = b"wOF2"

FONT_TARGETS: Final = (
  "frontend/src/assets/fonts/inter",
  "frontend/public/assets/fonts/inter",
  "backend/static/fonts/inter",
  "marketing/public/assets/fonts/inter",
  "viking-ui-docs/public/assets/fonts/inter",
)


def validate_woff2(path: str) -> None:
  with open(path, "rb") as font_file:
    header = font_file.read(4)
  if header != WOFF2_MAGIC:
    print(f"Invalid WOFF2 font header in {path}: {header!r}", file=sys.stderr)
    sys.exit(1)


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
    validate_woff2(src)

  for rel in FONT_TARGETS:
    dst_dir = os.path.join(root, rel)
    os.makedirs(dst_dir, exist_ok=True)
    for name in FONT_FILES:
      dst = os.path.join(dst_dir, name)
      shutil.copy2(os.path.join(src_dir, name), dst)
      validate_woff2(dst)
    print(f"Synced Inter fonts -> {rel}")


if __name__ == "__main__":
  sync_fonts()
