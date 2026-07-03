#!/usr/bin/env python3
"""One-time migration: viking-ui → viking-ui across the monorepo."""

from __future__ import annotations

import os
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"

SKIP_DIRS = {
  ".git",
  "node_modules",
  "dist",
  ".venv",
  "backend/.venv",
  "__pycache__",
  ".angular",
  "coverage",
}

SKIP_SUFFIXES = {
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".mp4",
  ".woff",
  ".woff2",
  ".ico",
  ".lock",
}

# Order matters: longer / more specific patterns first.
TEXT_REPLACEMENTS: list[tuple[str, str]] = [
  ("@deml/viking-ui", "@deml/viking-ui"),
  ("viking-ui-showcase", "viking-ui-showcase"),
  ("viking-ui-css", "viking-ui-css"),
  ("viking-ui.css", "viking-ui.css"),
  ("viking-ui", "viking-ui"),
  ("build:viking-ui", "build:viking-ui"),
  ("test:viking-ui", "test:viking-ui"),
  ("serve:viking-ui", "serve:viking-ui"),
  ("check:viking-upstream", "check:viking-upstream"),
  ("viking.manifest.json", "viking.manifest.json"),
  ("viking-ui-bundle.scss", "viking-ui-bundle.scss"),
  ("viking-ui.scss", "viking-ui.scss"),
  ("viking-ui.spec.ts", "viking-ui.spec.ts"),
  ("provideVikingCva", "provideVikingCva"),
  ("VikingControl", "VikingControl"),
  ("vikingModalActions", "vikingModalActions"),
  ("vikingTrigger", "vikingTrigger"),
  ("vikingMenu", "vikingMenu"),
  ("viking-app-icon", "viking-app-icon"),
  ("VikingAppIcon", "VikingAppIcon"),
  ("viking-icon-map", "viking-icon-map"),
  ("--viking-", "--viking-"),
  ("viking-chart-", "viking-chart-"),
  ("viking-btn", "viking-btn"),
  ("viking-badge", "viking-badge"),
  ("viking-showcase", "viking-showcase"),
  ("viking-full", "viking-full"),
  ("viking-visually-hidden", "viking-visually-hidden"),
  ("'viking-", "'viking-"),
  ('"viking-', '"viking-'),
  (".viking-", ".viking-"),
  ("viking-", "viking-"),
  ("Viking", "Viking"),
]

FILE_RENAMES: list[tuple[str, str]] = [
  ("viking-ui-bundle.scss", "viking-ui-bundle.scss"),
  ("viking-ui.scss", "viking-ui.scss"),
  ("viking-ui.spec.ts", "viking-ui.spec.ts"),
  ("viking.manifest.json", "viking.manifest.json"),
  ("build_flux_material_css.mjs", "build_viking_ui_css.mjs"),
  ("vitest.viking-ui.config.ts", "vitest.viking-ui.config.ts"),
  ("check_flux_upstream.mjs", "check_viking_upstream.mjs"),
  ("viking-app-icon.ts", "viking-app-icon.ts"),
  ("viking-icon-map.ts", "viking-icon-map.ts"),
]


def should_skip(path: Path) -> bool:
  parts = set(path.parts)
  if parts & SKIP_DIRS:
    return True
  if path.suffix in SKIP_SUFFIXES and "package-lock" not in path.name:
    if path.suffix == ".lock":
      return True
  return False


def copy_projects() -> None:
  src_lib = FRONTEND / "projects" / "viking-ui"
  dst_lib = FRONTEND / "projects" / "viking-ui"
  src_show = FRONTEND / "projects" / "viking-ui-showcase"
  dst_show = FRONTEND / "projects" / "viking-ui-showcase"

  if dst_lib.exists():
    shutil.rmtree(dst_lib)
  if dst_show.exists():
    shutil.rmtree(dst_show)

  shutil.copytree(src_lib, dst_lib)
  shutil.copytree(src_show, dst_show)
  print(f"Copied {src_lib} → {dst_lib}")
  print(f"Copied {src_show} → {dst_show}")


def rename_files(root: Path) -> None:
  for dirpath, _, filenames in os.walk(root, topdown=False):
    for name in filenames:
      path = Path(dirpath) / name
      for old, new in FILE_RENAMES:
        if name == old:
          target = path.with_name(new)
          path.rename(target)
          print(f"Renamed {path.relative_to(ROOT)} → {target.name}")
          break


def transform_text(content: str) -> str:
  for old, new in TEXT_REPLACEMENTS:
    content = content.replace(old, new)
  # Fix double-viking from viking- → viking- on already-prefixed paths
  content = content.replace("viking-", "viking-")
  content = content.replace("Viking", "Viking")
  return content


LEGACY_PROJECT_DIRS = {
  "projects/viking-ui",
  "projects/viking-ui-showcase",
}


def process_files() -> None:
  for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    rel = Path(dirpath).relative_to(ROOT).as_posix()
    if any(rel.startswith(legacy) for legacy in LEGACY_PROJECT_DIRS):
      dirnames.clear()
      continue
    for name in filenames:
      path = Path(dirpath) / name
      if should_skip(path):
        continue
      if path.suffix in {".png", ".jpg", ".gif", ".webp", ".mp4", ".woff", ".woff2"}:
        continue
      try:
        raw = path.read_text(encoding="utf-8")
      except (UnicodeDecodeError, PermissionError):
        continue
      if "flux" not in raw.lower() and "Viking" not in raw:
        continue
      updated = transform_text(raw)
      if updated != raw:
        path.write_text(updated, encoding="utf-8")
        print(f"Updated {path.relative_to(ROOT)}")


def patch_viking_package_json() -> None:
  pkg = FRONTEND / "projects" / "viking-ui" / "package.json"
  if not pkg.exists():
    return
  text = pkg.read_text(encoding="utf-8")
  text = text.replace(
    '"description": "Viking-Material: DEML UI kit. Viking UI (fluxui.dev) component styles blended with Angular Material design tokens, THEME.md palette only."',
    '"description": "Viking-UI: DEML clinical design system for Angular. Viking + Spartan-inspired patterns, THEME.md palette only."',
  )
  text = re.sub(r'"version": "[^"]+"', '"version": "1.0.0"', text, count=1)
  text = text.replace(
    '"keywords": [\n    "angular",\n    "ui",\n    "flux",\n    "material",\n    "design-system",\n    "deml"\n  ]',
    '"keywords": [\n    "angular",\n    "ui",\n    "viking-ui",\n    "design-system",\n    "deml",\n    "a11y"\n  ]',
  )
  if '"license": "UNLICENSED"' in text:
    text = text.replace('"license": "UNLICENSED"', '"license": "Apache-2.0"')
  if '"publishConfig"' not in text:
    text = text.replace(
      '"license": "Apache-2.0"',
      '"license": "Apache-2.0",\n  "publishConfig": {\n    "access": "public"\n  }',
    )
  pkg.write_text(text, encoding="utf-8")


def rename_app_wrappers() -> None:
  renames = [
    (
      FRONTEND / "src/app/components/viking-app-icon/viking-app-icon.ts",
      FRONTEND / "src/app/components/viking-app-icon/viking-app-icon.ts",
    ),
    (
      FRONTEND / "src/app/core/viking-icon-map.ts",
      FRONTEND / "src/app/core/viking-icon-map.ts",
    ),
  ]
  for src, dst in renames:
    if src.exists():
      dst.parent.mkdir(parents=True, exist_ok=True)
      shutil.move(str(src), str(dst))
      if src.parent.exists() and not any(src.parent.iterdir()):
        src.parent.rmdir()
      print(f"Moved {src.relative_to(ROOT)} → {dst.relative_to(ROOT)}")


def remove_legacy_projects() -> None:
  for rel in ("projects/viking-ui", "projects/viking-ui-showcase"):
    path = FRONTEND / rel
    if path.exists():
      shutil.rmtree(path)
      print(f"Removed legacy {path.relative_to(ROOT)}")


def main() -> None:
  copy_projects()
  rename_files(FRONTEND / "projects" / "viking-ui")
  rename_files(FRONTEND / "scripts")
  rename_app_wrappers()
  process_files()
  patch_viking_package_json()
  remove_legacy_projects()
  print("Migration complete.")


if __name__ == "__main__":
  main()
