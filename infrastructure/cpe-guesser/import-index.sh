#!/bin/sh
set -eu

CPE_REDIS_HOST="${CPE_REDIS_HOST:-dragonfly}"
CPE_REDIS_PORT="${CPE_REDIS_PORT:-6379}"
CPE_REDIS_DB="${CPE_REDIS_DB:-8}"

sed -i \
  -e "s/host: .*/host: ${CPE_REDIS_HOST}/" \
  -e "s/port: 6379/port: ${CPE_REDIS_PORT}/" \
  -e "s/db: 8/db: ${CPE_REDIS_DB}/" \
  /app/config/settings.yaml

attempt=1
while [ "$attempt" -le 10 ]; do
  if python -u /app/bin/import.py; then
    echo "CPE index is ready in Dragonfly database ${CPE_REDIS_DB}."
    exit 0
  fi
  echo "CPE import attempt ${attempt} failed; retrying in 10 seconds."
  attempt=$((attempt + 1))
  sleep 10
done

echo "CPE index import failed after 10 attempts." >&2
exit 1
