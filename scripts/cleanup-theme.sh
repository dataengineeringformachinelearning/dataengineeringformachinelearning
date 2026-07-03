#!/usr/bin/env bash
# Viking-UI theme consistency — wrapper for deml_tooling.py
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
ARGS=(hygiene --theme)
for arg in "$@"; do
  case "$arg" in
    --apply) ARGS+=(--apply) ;;
    --dry-run) ;;
    --verbose|-v) ARGS+=(-v) ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done
exec python scripts/deml_tooling.py "${ARGS[@]}"
