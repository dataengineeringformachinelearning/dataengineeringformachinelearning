#!/bin/sh
set -eu

if [ -z "${DRAGONFLY_TLS_CERT_B64:-}" ] || [ -z "${DRAGONFLY_TLS_KEY_B64:-}" ]; then
  echo "ERROR: DRAGONFLY_TLS_CERT_B64 and DRAGONFLY_TLS_KEY_B64 are required."
  exit 1
fi
if [ -z "${DRAGONFLY_PASSWORD:-}" ]; then
  echo "ERROR: DRAGONFLY_PASSWORD is required."
  exit 1
fi

printf '%s' "$DRAGONFLY_TLS_CERT_B64" | base64 -d > /run/dragonfly-tls/server.crt
printf '%s' "$DRAGONFLY_TLS_KEY_B64" | base64 -d > /run/dragonfly-tls/server.key
chmod 600 /run/dragonfly-tls/server.key

exec /usr/local/bin/dragonfly \
  --bind=0.0.0.0 \
  --port=6379 \
  --tls \
  --tls_cert_file=/run/dragonfly-tls/server.crt \
  --tls_key_file=/run/dragonfly-tls/server.key \
  --requirepass="$DRAGONFLY_PASSWORD" \
  --primary_port_http_enabled=false
