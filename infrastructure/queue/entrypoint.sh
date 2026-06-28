#!/bin/sh
set -e

echo "==> Redpanda entrypoint starting (authenticated public endpoint support)..."

# Use a config file for listener configuration.
# The v26.1.9 CLI in this container rejects --kafka-addr and --mode on the command line.
# Generating redpanda.yaml is the reliable way to define:
#   - internal PLAINTEXT listener (no auth) on 9092 for Railway services
#   - external SASL_SSL listener on 9093 for Firebase Cloud Functions

INTERNAL_HOST="deml-queue.railway.internal"
PUBLIC_HOST="${PUBLIC_REDPANDA_HOST:-localhost}"
PUBLIC_HOST="${PUBLIC_HOST#http://}"
PUBLIC_HOST="${PUBLIC_HOST#https://}"
PUBLIC_HOST="${PUBLIC_HOST%%:*}"

CONFIG_DIR="/etc/redpanda"
CONFIG_FILE="$CONFIG_DIR/redpanda.yaml"

mkdir -p "$CONFIG_DIR"

cat > "$CONFIG_FILE" << 'CONFIGEOF'
redpanda:
  data_directory: /var/lib/redpanda/data
  kafka_api:
    - name: internal
      address: 0.0.0.0
      port: 9092
      authentication_method: none
    - name: external
      address: 0.0.0.0
      port: 9093
      authentication_method: sasl
  advertised_kafka_api:
    - name: internal
      address: __INTERNAL_HOST__
      port: 9092
    - name: external
      address: __PUBLIC_HOST__
      port: 9093
  enable_sasl: true
  sasl_mechanisms:
    - SCRAM-SHA-256

rpk:
  kafka_api:
    brokers:
      - 127.0.0.1:9092
CONFIGEOF

# Substitute the actual hosts (sed for portability)
sed -i "s|__INTERNAL_HOST__|$INTERNAL_HOST|g" "$CONFIG_FILE"
sed -i "s|__PUBLIC_HOST__|$PUBLIC_HOST|g" "$CONFIG_FILE"

echo "Generated $CONFIG_FILE"
echo "Internal: $INTERNAL_HOST:9092 (no auth)"
echo "External: $PUBLIC_HOST:9093 (SASL)"
echo "PUBLIC_REDPANDA_HOST (raw): ${PUBLIC_REDPANDA_HOST:-<unset>}"

# Start using the config file only. No --kafka-addr on CLI.
redpanda start \
  --config "$CONFIG_FILE" \
  --overprovisioned \
  --smp 1 \
  --memory 2G \
  --default-log-level info &

RP_PID=$!

# Create SASL user for external clients if credentials provided.
if [ -n "${REDPANDA_SASL_USERNAME}" ] && [ -n "${REDPANDA_SASL_PASSWORD}" ]; then
  echo "Waiting for Redpanda internal listener to be ready..."
  for i in $(seq 1 60); do
    if rpk cluster metadata --brokers 127.0.0.1:9092 >/dev/null 2>&1; then
      echo "Redpanda ready."
      break
    fi
    sleep 2
  done

  echo "Ensuring SASL user '${REDPANDA_SASL_USERNAME}' ..."
  rpk security user create "${REDPANDA_SASL_USERNAME}" \
    --password "${REDPANDA_SASL_PASSWORD}" \
    --mechanism SCRAM-SHA-256 \
    --brokers 127.0.0.1:9092 || echo "  (exists or non-fatal; continuing)"
else
  echo "No SASL creds provided for external listener."
fi

echo "Redpanda handing off."
wait $RP_PID
