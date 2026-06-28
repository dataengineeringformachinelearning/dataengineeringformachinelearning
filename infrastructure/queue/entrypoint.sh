#!/bin/sh
set -e

echo "==> Redpanda entrypoint starting (authenticated public endpoint support)..."

# We use a generated redpanda.yaml for listener configuration.
# Command-line --kafka-addr has been observed to be rejected in some v26 container invocations.
# Config file is the most reliable way for dual (internal PLAINTEXT + external SASL_SSL) listeners.

INTERNAL_HOST="deml-queue.railway.internal"
# PUBLIC_REDPANDA_HOST must be bare hostname (no scheme, no port). We defensively clean it.
PUBLIC_HOST="${PUBLIC_REDPANDA_HOST:-localhost}"
PUBLIC_HOST="${PUBLIC_HOST#http://}"
PUBLIC_HOST="${PUBLIC_HOST#https://}"
PUBLIC_HOST="${PUBLIC_HOST%%:*}"

CONFIG_FILE="/etc/redpanda/redpanda.yaml"

mkdir -p /etc/redpanda

cat > "$CONFIG_FILE" << EOF
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
      address: ${INTERNAL_HOST}
      port: 9092
    - name: external
      address: ${PUBLIC_HOST}
      port: 9093
  enable_sasl: true
  sasl_mechanisms:
    - SCRAM-SHA-256

rpk:
  kafka_api:
    brokers:
      - ${INTERNAL_HOST}:9092
EOF

echo "Generated config at ${CONFIG_FILE}"
echo "Internal advertise: ${INTERNAL_HOST}:9092"
echo "External advertise: ${PUBLIC_HOST}:9093"

# Start Redpanda using the config file.
# --overprovisioned is required for container environments.
redpanda start \
  --config "$CONFIG_FILE" \
  --overprovisioned \
  --smp 1 \
  --memory 2G \
  --default-log-level info &

RP_PID=$!

# One-time creation of the SASL user for external clients (e.g. ingestEvent from Cloud Functions).
if [ -n "${REDPANDA_SASL_USERNAME}" ] && [ -n "${REDPANDA_SASL_PASSWORD}" ]; then
  echo "Waiting for Redpanda to be ready on internal listener..."
  for i in $(seq 1 60); do
    if rpk cluster metadata --brokers 127.0.0.1:9092 >/dev/null 2>&1; then
      echo "Redpanda is ready."
      break
    fi
    sleep 2
  done

  echo "Ensuring SASL user '${REDPANDA_SASL_USERNAME}' exists..."
  rpk security user create "${REDPANDA_SASL_USERNAME}" \
    --password "${REDPANDA_SASL_PASSWORD}" \
    --mechanism SCRAM-SHA-256 \
    --brokers 127.0.0.1:9092 || echo "  (already exists or non-fatal; continuing)"
else
  echo "REDPANDA_SASL_USERNAME/PASSWORD not provided. External auth will not work until a user is created."
fi

echo "Redpanda started. Handing off."
wait $RP_PID
