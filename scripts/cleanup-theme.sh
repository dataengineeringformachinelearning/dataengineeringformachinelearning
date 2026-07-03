#!/usr/bin/env bash
# Viking-UI theme consistency cleanup — monorepo wrapper.
# Scans frontend, marketing, backend, and design-system for THEME.md violations.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="--dry-run"
EXTRA_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --apply)
      MODE="--apply"
      ;;
    --dry-run)
      MODE="--dry-run"
      ;;
    --verbose|-v)
      EXTRA_ARGS+=("$arg")
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: $0 [--dry-run|--apply] [--verbose]" >&2
      exit 2
      ;;
  esac
done

echo "=== DEML Theme Cleanup (monorepo) ==="
node cleanup-theme.js "$MODE" "${EXTRA_ARGS[@]}"
