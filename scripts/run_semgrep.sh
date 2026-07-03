#!/usr/bin/env bash
# Semgrep SAST — scoped scan with project exclusions for known false positives.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CMD=(uvx semgrep scan --error)

# Exclude generated CSS, swagger CDN templates, and lockfiles from SAST noise.
CMD+=(--exclude '**/viking-ui.css')
CMD+=(--exclude '**/design-tokens.css')
CMD+=(--exclude '**/deml-components.css')
CMD+=(--exclude '**/package-lock.json')
CMD+=(--exclude 'backend/templates/swagger.html')

exec "${CMD[@]}"
