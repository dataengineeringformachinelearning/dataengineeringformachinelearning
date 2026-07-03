#!/usr/bin/env python3
"""
DEML unified dev tooling — sync, hygiene, quality gates, and hook installation.

Usage:
  python scripts/deml_tooling.py sync [--all|--content|--design-system|--widgets]
  python scripts/deml_tooling.py hygiene [--cache] [--theme [--apply]]
  python scripts/deml_tooling.py quality [--fix] [--fast|--full|--ci]
  python scripts/deml_tooling.py install-hooks
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _run(cmd: list[str], *, cwd: Path | None = None, env: dict[str, str] | None = None) -> None:
  label = " ".join(cmd)
  print(f"\n→ {label}")
  subprocess.run(cmd, cwd=cwd or ROOT, env=env, check=True)


def _uvx(*args: str) -> None:
  _run(["uvx", *args])


def cmd_sync(args: argparse.Namespace) -> None:
  if args.all or not (args.content or args.design_system or args.widgets):
    targets = {"content", "design-system", "widgets"}
  else:
    targets = {t for t, on in (("content", args.content), ("design-system", args.design_system), ("widgets", args.widgets)) if on}

  if "content" in targets:
    _run([sys.executable, "scripts/sync_content.py"])

  if "design-system" in targets:
    _run([sys.executable, "scripts/sync_design_system.py"])

  if "widgets" in targets:
    _run([sys.executable, "scripts/sync_widgets.py"])


def cmd_hygiene(args: argparse.Namespace) -> None:
  if args.cache:
    _run(["bash", "scripts/deml-cleanup.sh"])

  if args.theme:
    theme_args = ["node", "cleanup-theme.js"]
    theme_args.append("--apply" if args.apply else "--dry-run")
    if args.verbose:
      theme_args.append("--verbose")
    _run(theme_args)


def cmd_quality(args: argparse.Namespace) -> None:
  stage = args.stage
  fix = args.fix

  if stage in {"fast", "full", "ci"}:
    hook_args = ["pre-commit", "run", "--all-files", "--color=always"]
    if stage == "fast":
      hook_args.extend(["--hook-stage", "pre-commit"])
    elif stage == "full":
      hook_args.extend(["--hook-stage", "pre-push"])
    _uvx(*hook_args)

  if stage == "ci":
    _uvx("pre-commit", "run", "--all-files", "--color=always", "--hook-stage", "manual")

  if fix and stage in {"fast", "full", "ci"}:
    print("\n✓ Auto-fix hooks (ruff --fix, prettier) ran via pre-commit")

  if args.theme:
    cmd_hygiene(
      argparse.Namespace(cache=False, theme=True, apply=fix, verbose=args.verbose),
    )


def cmd_install_hooks(args: argparse.Namespace) -> None:
  src = ROOT / "scripts" / "hooks" / "pre-commit"
  dest = ROOT / ".git" / "hooks" / "pre-commit"
  if not src.is_file():
    print(f"Missing hook template: {src}", file=sys.stderr)
    sys.exit(1)
  if not (ROOT / ".git").is_dir():
    print("Not a git repository — cannot install hooks.", file=sys.stderr)
    sys.exit(1)
  shutil.copy2(src, dest)
  dest.chmod(dest.stat().st_mode | 0o111)
  print(f"Installed {dest}")
  _uvx(
    "pre-commit",
    "install",
    "--install-hooks",
    "--hook-type",
    "pre-commit",
    "--hook-type",
    "pre-push",
  )


def build_parser() -> argparse.ArgumentParser:
  parser = argparse.ArgumentParser(description="DEML unified dev tooling")
  sub = parser.add_subparsers(dest="command", required=True)

  sync = sub.add_parser("sync", help="Propagate design system, widgets, and docs")
  sync.add_argument("--all", action="store_true", help="Sync content, design-system, and widgets")
  sync.add_argument("--content", action="store_true", help="Sync BOOK.md / README / version")
  sync.add_argument("--design-system", action="store_true", help="Sync deml-design-system + viking-ui.css")
  sync.add_argument("--widgets", action="store_true", help="Sync navbar/widget assets")
  sync.set_defaults(func=cmd_sync, all=False, content=False, design_system=False, widgets=False)

  hygiene = sub.add_parser("hygiene", help="Cache purge and theme cleanup")
  hygiene.add_argument("--cache", action="store_true", help="Purge build caches (deml-cleanup.sh)")
  hygiene.add_argument("--theme", action="store_true", help="Run cleanup-theme.js audit")
  hygiene.add_argument("--apply", action="store_true", help="Apply safe theme fixes")
  hygiene.add_argument("-v", "--verbose", action="store_true")
  hygiene.set_defaults(func=cmd_hygiene, cache=True, theme=False, apply=False, verbose=False)

  quality = sub.add_parser("quality", help="Run lint, format, and security gates")
  quality.add_argument("--fix", action="store_true", help="Apply auto-fixes where supported")
  quality.add_argument(
    "--fast",
    action="store_const",
    const="fast",
    dest="stage",
    help="Pre-commit stage only (format, lint, secrets, a11y)",
  )
  quality.add_argument(
    "--full",
    action="store_const",
    const="full",
    dest="stage",
    help="Pre-push stage (SAST, IaC, dependency scans)",
  )
  quality.add_argument(
    "--ci",
    action="store_const",
    const="ci",
    dest="stage",
    help="All stages including manual (CI parity)",
  )
  quality.add_argument("--theme", action="store_true", help="Also run theme cleanup dry-run/apply")
  quality.add_argument("-v", "--verbose", action="store_true")
  quality.set_defaults(func=cmd_quality, stage="fast", fix=False, theme=False, verbose=False)

  install = sub.add_parser("install-hooks", help="Install tracked git pre-commit hook")
  install.set_defaults(func=cmd_install_hooks)

  return parser


def main() -> None:
  os.chdir(ROOT)
  parser = build_parser()
  args = parser.parse_args()
  args.func(args)


if __name__ == "__main__":
  main()
