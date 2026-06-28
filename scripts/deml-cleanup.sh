#!/bin/bash
# Workspace Hygiene & Local Pruning — Antigravity - Claude Opus 4.6
set -euo pipefail

echo "=== Starting Workspace Hygiene & Local Pruning ==="

echo "Purging build/runtime cache footprints..."
find . -type d -name "__pycache__" -not -path "./.venv/*" -not -path "./backend/.venv/*" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -not -path "./.venv/*" -not -path "./backend/.venv/*" -delete 2>/dev/null || true
find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name ".angular" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
find . -name ".DS_Store" -delete 2>/dev/null || true

echo "Cache footprints purged successfully."
