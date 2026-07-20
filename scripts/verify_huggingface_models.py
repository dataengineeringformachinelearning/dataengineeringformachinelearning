#!/usr/bin/env python3
"""Verify that a Hugging Face model repository is fresh and structurally complete."""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import UTC, datetime
from typing import Any, Final
from urllib.parse import quote

import requests

HUGGING_FACE_API_HOST: Final[str] = "huggingface.co"
HUGGING_FACE_API_PREFIX: Final[str] = "/api"
DEFAULT_MAX_AGE_HOURS: Final[float] = 36.0
# Families published by FORJD's scheduled ml-training worker. CES is computed
# analytically inside FORJD analytics (no torch artifact), so it is not listed.
DEFAULT_REQUIRED_PREFIXES: Final[tuple[str, ...]] = (
  "sla_models/",
  "threat_models/",
  "temporal_models/",
)


def _request_json(path: str, token: str = "") -> Any:
  headers = {"Accept": "application/json", "User-Agent": "deml-deployment-smoke/1.0"}
  if token:
    headers["Authorization"] = f"Bearer {token}"
  response = requests.get(
    f"https://{HUGGING_FACE_API_HOST}{HUGGING_FACE_API_PREFIX}{path}",
    headers=headers,
    timeout=30,
  )
  response.raise_for_status()
  return response.json()


def _parse_timestamp(value: str) -> datetime:
  normalized = value.replace("Z", "+00:00")
  parsed = datetime.fromisoformat(normalized)
  return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def verify_repository(
  repo_id: str,
  *,
  max_age_hours: float = DEFAULT_MAX_AGE_HOURS,
  required_prefixes: tuple[str, ...] = DEFAULT_REQUIRED_PREFIXES,
  token: str = "",
) -> dict[str, Any]:
  encoded_repo_id = quote(repo_id, safe="/")
  metadata = _request_json(f"/models/{encoded_repo_id}", token)
  last_modified_raw = str(metadata.get("lastModified") or "")
  if not last_modified_raw:
    raise RuntimeError(f"Hugging Face did not return lastModified for {repo_id}")

  last_modified = _parse_timestamp(last_modified_raw)
  age_hours = (datetime.now(UTC) - last_modified).total_seconds() / 3600
  tree = _request_json(
    f"/models/{encoded_repo_id}/tree/main?recursive=true&expand=true",
    token,
  )
  entries = {str(item.get("path") or ""): item for item in tree if isinstance(item, dict)}
  missing_prefixes = [prefix for prefix in required_prefixes if prefix.rstrip("/") not in entries]
  if missing_prefixes:
    raise RuntimeError(
      f"{repo_id} is missing required model families: {', '.join(missing_prefixes)}"
    )

  family_freshness: dict[str, dict[str, Any]] = {}
  for prefix in required_prefixes:
    family = prefix.rstrip("/")
    last_commit = entries[family].get("lastCommit") or {}
    family_modified_raw = str(last_commit.get("date") or "")
    if not family_modified_raw:
      raise RuntimeError(f"{repo_id}/{family} has no last-commit timestamp")
    family_modified = _parse_timestamp(family_modified_raw)
    family_age_hours = (datetime.now(UTC) - family_modified).total_seconds() / 3600
    if family_age_hours > max_age_hours:
      raise RuntimeError(
        f"{repo_id}/{family} is stale: last modified {family_age_hours:.1f} hours ago "
        f"(maximum {max_age_hours:.1f})"
      )
    family_freshness[family] = {
      "last_modified": family_modified.isoformat(),
      "age_hours": round(family_age_hours, 2),
    }

  return {
    "repo_id": repo_id,
    "last_modified": last_modified.isoformat(),
    "age_hours": round(age_hours, 2),
    "model_families": family_freshness,
  }


def main() -> int:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument("repo_id", help="Hugging Face model repository in owner/name form")
  parser.add_argument(
    "--max-age-hours",
    type=float,
    default=DEFAULT_MAX_AGE_HOURS,
    help=f"Maximum accepted repository age (default: {DEFAULT_MAX_AGE_HOURS:g})",
  )
  args = parser.parse_args()

  try:
    result = verify_repository(
      args.repo_id,
      max_age_hours=args.max_age_hours,
      token=os.environ.get("HF_TOKEN", ""),
    )
  except Exception as exc:
    print(f"Hugging Face model verification failed: {exc}", file=sys.stderr)
    return 1

  print(json.dumps(result, indent=2, sort_keys=True))
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
