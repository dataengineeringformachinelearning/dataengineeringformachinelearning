#!/usr/bin/env python3
"""Synchronize the curated frontend source mirror to an existing Hugging Face Space."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Final

from huggingface_hub import HfApi

REPOSITORY_ROOT: Final[Path] = Path(__file__).resolve().parents[1]
ALLOW_PATTERNS: Final[tuple[str, ...]] = (
  "README.md",
  "WHITEPAPER.md",
  "BOOK.md",
  "THEME.md",
  "frontend/**",
)
IGNORE_PATTERNS: Final[tuple[str, ...]] = (
  "frontend/node_modules/**",
  "frontend/.angular/**",
  "frontend/coverage/**",
  "frontend/dist/**",
)


def main() -> int:
  token = os.environ.get("HF_TOKEN", "").strip()
  repo_id = os.environ.get("HF_SPACE_REPO", "").strip()
  if not token or not repo_id:
    raise RuntimeError("HF_TOKEN and HF_SPACE_REPO are required")

  commit = HfApi(token=token).upload_folder(
    repo_id=repo_id,
    repo_type="space",
    folder_path=REPOSITORY_ROOT,
    allow_patterns=list(ALLOW_PATTERNS),
    ignore_patterns=list(IGNORE_PATTERNS),
    delete_patterns=["*"],
    commit_message="Sync frontend mirror from GitHub",
    commit_description=f"Source commit: {os.environ.get('GITHUB_SHA', 'local')}",
  )
  print(commit.commit_url)
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
