#!/usr/bin/env python3
"""Dry-run / delete Railway services listed as retired in services.json.

Usage:
  python scripts/railway_retire_dataplane.py           # report only
  python scripts/railway_retire_dataplane.py --apply   # delete retired services

Requires: railway CLI linked to deml/production.
Never prints secret values.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Final

ROOT: Final = Path(__file__).resolve().parent.parent
CATALOG: Final = ROOT / "infrastructure" / "railway" / "services.json"
RAILWAY: Final = "railway"
SERVICE_LINE: Final = re.compile(r"^\s*-\s+([A-Za-z0-9_-]+):", re.MULTILINE)


def _run(args: list[str]) -> subprocess.CompletedProcess[str]:
  return subprocess.run(args, cwd=ROOT, text=True, capture_output=True, check=False)


def _status_service_names() -> set[str]:
  proc = _run([RAILWAY, "status"])
  if proc.returncode != 0:
    raise RuntimeError(proc.stderr or proc.stdout or "railway status failed")
  return set(SERVICE_LINE.findall(proc.stdout or ""))


def main() -> int:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument(
    "--apply",
    action="store_true",
    help="Delete retired services that still exist",
  )
  parser.add_argument("--json", action="store_true", help="Emit JSON report")
  args = parser.parse_args()

  catalog = json.loads(CATALOG.read_text())
  retired: list[str] = list(catalog.get("retired") or [])
  keep = set((catalog.get("services") or {}).keys())

  try:
    live = _status_service_names()
  except Exception as exc:
    print(f"error: {exc}", file=sys.stderr)
    return 2

  present_keep = sorted(name for name in keep if name in live)
  present_retired = sorted(name for name in retired if name in live)

  report: dict[str, object] = {
    "apply": args.apply,
    "keep_present": present_keep,
    "retired_present": present_retired,
    "retired_catalog": retired,
    "deleted": [],
    "errors": [],
  }
  deleted: list[str] = []
  errors: list[str] = []

  if args.apply:
    for name in present_retired:
      if name in keep:
        errors.append(f"refusing to delete keep-listed service {name}")
        continue
      proc = _run([RAILWAY, "service", "delete", "--service", name, "-y"])
      if proc.returncode == 0:
        deleted.append(name)
      else:
        detail = (proc.stderr or proc.stdout or "delete failed").strip()[:300]
        errors.append(f"{name}: {detail}")

  report["deleted"] = deleted
  report["errors"] = errors

  if args.json:
    print(json.dumps(report, indent=2))
  else:
    print("Railway data-plane retirement")
    print(f"mode: {'APPLY' if args.apply else 'DRY-RUN'}")
    print(f"keep present: {', '.join(present_keep) or '(none detected)'}")
    print(f"retired still present: {', '.join(present_retired) or '(none)'}")
    if deleted:
      print(f"deleted: {', '.join(deleted)}")
    for err in errors:
      print(f"error: {err}", file=sys.stderr)
    if not args.apply and present_retired:
      print("\nRe-run with --apply to delete retired services.")

  return 1 if errors else 0


if __name__ == "__main__":
  sys.exit(main())
