#!/usr/bin/env bash
# Minimal Django server for Chromatic / Playwright visual tests.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}/backend"

export DEBUG="${DEBUG:-True}"
export SECURE_SSL_REDIRECT="${SECURE_SSL_REDIRECT:-False}"
CHROMATIC_DB="${ROOT}/backend/.chromatic-test.sqlite3"
rm -f "${CHROMATIC_DB}"
export DATABASE_URL="${DATABASE_URL:-sqlite:///${CHROMATIC_DB}}"
export SECRET_KEY="${SECRET_KEY:-chromatic-visual-test-secret}"
export FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:4200}"
export BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8000}"
export MARKETING_URL="${MARKETING_URL:-http://127.0.0.1:4321}"
export ALLOWED_HOSTS="${ALLOWED_HOSTS:-localhost,127.0.0.1,testserver}"

python3 manage.py migrate --noinput
exec python3 manage.py runserver 127.0.0.1:8000 --noreload
