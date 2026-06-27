#!/bin/bash
set -euo pipefail

echo "=== Starting Workspace Hygiene & Local Pruning ==="

# 1. Locate and purge cache footprints
echo "Purging localized build and runtime cache footprints..."
find . -type d -name "__pycache__" -exec rm -rf {} +
find . -type f -name "*.pyc" -delete
find . -type d -name ".pytest_cache" -exec rm -rf {} +
find . -type d -name ".angular" -exec rm -rf {} +

echo "Cache footprints purged successfully."
