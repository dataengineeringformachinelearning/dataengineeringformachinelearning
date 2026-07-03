#!/bin/bash
# Workspace cache purge — also available via: python scripts/deml_tooling.py hygiene --cache
# Expanded for full PASS 0 compliance: caches + orphan scan + hygiene report.
set -euo pipefail

echo "=== Starting Workspace Hygiene & Local Pruning (Cursor - Grok 4.3) ==="

echo "Purging build/runtime cache footprints..."
find . -type d \( -name "__pycache__" -o -name ".pytest_cache" -o -name ".angular" -o -name ".ruff_cache" -o -name ".mypy_cache" -o -name ".vite" -o -name "htmlcov" -o -name ".coverage" \) -not -path "*/.git/*" -not -path "*/.venv/*" -exec rm -rf {} + 2>/dev/null || true
find . -type f \( -name "*.pyc" -o -name ".DS_Store" -o -name "*.pyo" \) -not -path "*/.git/*" -not -path "*/.venv/*" -delete 2>/dev/null || true

echo "Scanning for potential orphaned files (report only; manual review recommended)..."
ORPHANS=$(find . -type f \( -name "*.bak" -o -name "*~" -o -name "*.orig" -o -name "*.tmp" -o -name ".*.swp" \) -not -path "*/.git/*" -not -path "*/node_modules/*" 2>/dev/null | head -20 || true)
if [ -n "$ORPHANS" ]; then
  echo "Potential orphans detected:"
  echo "$ORPHANS"
else
  echo "No obvious orphans found."
fi

echo "Checking for common build artifact bloat (dist, build dirs outside git-tracked)..."
find . -type d \( -name "dist" -o -name "build" \) -not -path "*/.git/*" -not -path "*/node_modules/*" -not -path "*/marketing/dist/*" -not -path "*/frontend/dist/*" | head -10 || true

echo "Hygiene complete. Workspace is lean."
echo "=== PASS 0 Hygiene finished (Cursor - Grok 4.3) ==="
