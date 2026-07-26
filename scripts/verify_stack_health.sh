#!/usr/bin/env bash
# Runtime verification for DEML control plane ↔ FORJD data plane wiring.
# Usage:
#   ./scripts/verify_stack_health.sh
#   DEML_API=https://backend.deml.app FORJD_API=https://backend.forjd.co ./scripts/verify_stack_health.sh
set -euo pipefail

DEML_API="${DEML_API:-https://backend.deml.app}"
FORJD_API="${FORJD_API:-https://backend.forjd.co}"

pass=0
fail=0

check_json() {
  local name="$1"
  local url="$2"
  local jq_expr="$3"
  local body
  local code
  body="$(mktemp)"
  code="$(curl -sS -o "$body" -w '%{http_code}' --max-time 8 -H 'Accept: application/json' "$url" || true)"
  if [[ "$code" != "200" ]]; then
    echo "FAIL  $name  HTTP $code  $url"
    cat "$body" || true
    echo
    fail=$((fail + 1))
    rm -f "$body"
    return
  fi
  if ! jq -e "$jq_expr" "$body" >/dev/null 2>&1; then
    echo "FAIL  $name  contract  $jq_expr"
    cat "$body"
    echo
    fail=$((fail + 1))
    rm -f "$body"
    return
  fi
  echo "OK    $name"
  pass=$((pass + 1))
  rm -f "$body"
}

echo "== DEML =="
check_json "DEML /health" \
  "${DEML_API}/api/v1/health" \
  '.status == "ok"'

check_json "DEML /ready (+ forjd_health)" \
  "${DEML_API}/api/v1/ready" \
  '.status == "ready" and (.forjd_health | type == "string") and (.mode == "full" or .mode == "degraded")'

echo
echo "== FORJD =="
check_json "FORJD /health" \
  "${FORJD_API}/health" \
  '.status == "healthy"'

check_json "FORJD /ready" \
  "${FORJD_API}/ready" \
  '.status == "ready" and .checks.postgres == true and .checks.redis == true'

echo
echo "== Capabilities (via DEML BFF when available) =="
if curl -sS --max-time 8 -H 'Accept: application/json' \
  "${DEML_API}/api/v1/system-status/capabilities" -o /tmp/deml_caps.json 2>/dev/null; then
  if jq -e '.contract_version == "1.0" or .capabilities.contract_version == "1.0" or .version == "1.0"' \
    /tmp/deml_caps.json >/dev/null 2>&1; then
    echo "OK    capabilities contract 1.0 (or compatible)"
    pass=$((pass + 1))
  else
    echo "WARN  capabilities path present but contract shape differs — inspect /tmp/deml_caps.json"
  fi
else
  echo "SKIP  capabilities probe (route may require auth)"
fi

echo
echo "Passed: $pass  Failed: $fail"
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
