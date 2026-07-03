#!/usr/bin/env bash
# Combined secrets scan — gitleaks (live patterns) + detect-secrets (baseline audit).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FAILED=0

if command -v gitleaks >/dev/null 2>&1; then
  echo "→ gitleaks protect --staged"
  gitleaks protect --staged --verbose --redact || FAILED=1
else
  echo "→ uvx gitleaks protect --staged"
  uvx gitleaks protect --staged --verbose --redact || FAILED=1
fi

if command -v detect-secrets >/dev/null 2>&1; then
  echo "→ detect-secrets-hook"
  detect-secrets-hook --baseline .secrets.baseline || FAILED=1
else
  echo "→ uvx detect-secrets scan (baseline compare)"
  uvx detect-secrets scan --baseline .secrets.baseline || FAILED=1
fi

exit "$FAILED"
