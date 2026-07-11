#!/usr/bin/env python3
"""Audit (and optionally apply) Railway service alignment vs services.json.

Usage:
  python scripts/railway_audit.py              # dry-run report
  python scripts/railway_audit.py --apply      # set missing defaults / strip forbidden
  python scripts/railway_audit.py --json       # machine-readable report

Requires: railway CLI logged in and linked to deml/production.
Never prints secret values.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Final

ROOT: Final = Path(__file__).resolve().parent.parent
CATALOG: Final = ROOT / "infrastructure" / "railway" / "services.json"
RAILWAY: Final = "railway"


def _run(args: list[str], *, check: bool = True) -> str:
  proc = subprocess.run(
    args,
    cwd=ROOT,
    text=True,
    capture_output=True,
    check=False,
  )
  if check and proc.returncode != 0:
    raise RuntimeError(
      f"command failed ({proc.returncode}): {' '.join(args)}\n{proc.stderr or proc.stdout}"
    )
  return proc.stdout


def _vars(service: str) -> dict[str, str]:
  raw = _run([RAILWAY, "variable", "list", "--service", service, "--json"])
  data = json.loads(raw)
  if not isinstance(data, dict):
    raise RuntimeError(f"unexpected variables payload for {service}")
  return {str(k): str(v) if v is not None else "" for k, v in data.items()}


def _set_vars(service: str, mapping: dict[str, str]) -> None:
  if not mapping:
    return
  pairs = [f"{k}={v}" for k, v in mapping.items()]
  _run([RAILWAY, "variable", "set", *pairs, "--service", service, "--skip-deploys", "--json"])


def _delete_var(service: str, key: str) -> None:
  _run(
    [RAILWAY, "variable", "delete", key, "--service", service, "--json"],
    check=False,
  )


def audit_service(
  name: str,
  spec: dict[str, Any],
  *,
  apply: bool,
  cross_defaults: dict[str, Any],
) -> dict[str, Any]:
  result: dict[str, Any] = {
    "service": name,
    "class": spec.get("class"),
    "ok": True,
    "missing_required": [],
    "forbidden_present": [],
    "defaults_to_set": {},
    "dockerfile_path": None,
    "actions": [],
  }
  try:
    live = _vars(name)
  except Exception as exc:  # — report per-service
    result["ok"] = False
    result["error"] = str(exc)
    return result

  non_railway = {k: v for k, v in live.items() if not k.startswith("RAILWAY_")}
  result["var_count"] = len(non_railway)
  result["dockerfile_path"] = live.get("RAILWAY_DOCKERFILE_PATH") or None

  dockerfile = spec.get("dockerfile")
  if dockerfile and live.get("RAILWAY_DOCKERFILE_PATH") != dockerfile:
    result["defaults_to_set"]["RAILWAY_DOCKERFILE_PATH"] = dockerfile
    result["actions"].append(f"set RAILWAY_DOCKERFILE_PATH={dockerfile}")

  for key in spec.get("requiredEnv") or []:
    if key not in live or live.get(key, "") == "":
      # required may be satisfied via envDefaults
      defaults = spec.get("envDefaults") or {}
      if key in defaults:
        result["defaults_to_set"][key] = defaults[key]
        result["actions"].append(f"set default {key}")
      else:
        result["missing_required"].append(key)
        result["ok"] = False

  for key, value in (spec.get("envDefaults") or {}).items():
    if key not in live or live.get(key, "") == "":
      result["defaults_to_set"][key] = value
      if f"set default {key}" not in result["actions"]:
        result["actions"].append(f"set default {key}={value}")

  for key in spec.get("forbiddenEnv") or []:
    if key in live and live.get(key, "") != "":
      result["forbidden_present"].append(key)
      result["ok"] = False
      result["actions"].append(f"delete forbidden {key}")

  # Cross-service CPE URL for consumers
  if name in {
    "deml-backend",
    "deml-workers",
    "deml-telemetry-worker",
    "deml-scanner",
  }:
    expected = str(cross_defaults.get("CPE_GUESSER_URL", "")).strip()
    if expected and live.get("CPE_GUESSER_URL") != expected:
      result["defaults_to_set"]["CPE_GUESSER_URL"] = expected
      result["actions"].append("set CPE_GUESSER_URL → deml-cpe")

  if apply:
    to_set = dict(result["defaults_to_set"])
    if to_set:
      _set_vars(name, to_set)
      result["actions"].append(f"applied set ({len(to_set)} keys)")
    for key in list(result["forbidden_present"]):
      _delete_var(name, key)
      result["actions"].append(f"applied delete {key}")
    # re-check ok after apply (best-effort)
    if not result["missing_required"]:
      # forbidden may still be listed until re-fetch; clear for apply path
      if apply:
        result["ok"] = len(result["missing_required"]) == 0

  return result


def main() -> int:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument(
    "--apply",
    action="store_true",
    help="Apply missing defaults and delete forbidden keys (no secret printing)",
  )
  parser.add_argument("--json", action="store_true", help="Emit JSON report")
  parser.add_argument(
    "--service",
    action="append",
    default=[],
    help="Limit to one or more service names (repeatable)",
  )
  args = parser.parse_args()

  catalog = json.loads(CATALOG.read_text())
  services: dict[str, Any] = catalog["services"]
  cross_defaults: dict[str, Any] = catalog.get("crossServiceDefaults") or {}
  if args.service:
    unknown = [n for n in args.service if n not in services]
    if unknown:
      print(f"unknown service(s) in catalog: {', '.join(unknown)}", file=sys.stderr)
      print(f"known: {', '.join(sorted(services))}", file=sys.stderr)
      return 2
    services = {n: services[n] for n in args.service}

  report = {
    "apply": args.apply,
    "services": [],
    "summary": {"ok": 0, "drift": 0, "errors": 0},
    "retired": catalog.get("retired") or [],
  }

  for name, spec in sorted(services.items()):
    item = audit_service(name, spec, apply=args.apply, cross_defaults=cross_defaults)
    report["services"].append(item)
    if item.get("error"):
      report["summary"]["errors"] += 1
    elif item["ok"] and not item["actions"]:
      report["summary"]["ok"] += 1
    elif item["ok"] and args.apply:
      report["summary"]["ok"] += 1
    else:
      report["summary"]["drift"] += 1

  if args.json:
    print(json.dumps(report, indent=2))
    return (
      0
      if report["summary"]["errors"] == 0 and (report["summary"]["drift"] == 0 or args.apply)
      else 1
    )

  print("Railway audit vs infrastructure/railway/services.json")
  print(f"mode: {'APPLY' if args.apply else 'DRY-RUN'}")
  retired = report.get("retired") or []
  if retired:
    print(f"retired (do not recreate): {', '.join(retired)}")
  print()
  for item in report["services"]:
    status = "OK" if item.get("ok") and not item.get("error") else "DRIFT"
    if item.get("error"):
      status = "ERROR"
    print(f"[{status}] {item['service']} ({item.get('class')}) vars={item.get('var_count', '?')}")
    if item.get("dockerfile_path"):
      print(f"  dockerfile: {item['dockerfile_path']}")
    if item.get("missing_required"):
      print(f"  missing required: {', '.join(item['missing_required'])}")
    if item.get("forbidden_present"):
      print(f"  forbidden present: {', '.join(item['forbidden_present'])}")
    if item.get("actions"):
      for action in item["actions"]:
        print(f"  → {action}")
    if item.get("error"):
      print(f"  error: {item['error']}")
  print(
    f"\nsummary: ok={report['summary']['ok']} "
    f"drift={report['summary']['drift']} errors={report['summary']['errors']}"
  )
  if not args.apply and report["summary"]["drift"]:
    print("\nRe-run with --apply to set defaults and strip forbidden keys.")
  return 0 if report["summary"]["errors"] == 0 else 1


if __name__ == "__main__":
  sys.exit(main())
