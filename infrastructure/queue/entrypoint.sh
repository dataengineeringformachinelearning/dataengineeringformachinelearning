#!/bin/sh
set -e

echo "==> Redpanda entrypoint starting (authenticated public endpoint support)..."

# Internal listener: PLAINTEXT over Railway private network.
#   - Used by backend, workers, outbox_relay (fast, zero auth overhead inside trusted VPC).
# External/public listener: SASL_SSL.
#   - Used by Firebase Cloud Functions (cross-cloud) and other external producers.
#   - Requires SCRAM-SHA-256 + TLS for auth + encryption.

INTERNAL_ADDR=${REDPANDA_INTERNAL_ADDR:-PLAINTEXT://0.0.0.0:9092}
EXTERNAL_ADDR=${REDPANDA_EXTERNAL_ADDR:-SASL_SSL://0.0.0.0:9093}

INTERNAL_ADV=${REDPANDA_INTERNAL_ADV:-PLAINTEXT://deml-queue.railway.internal:9092}
# PUBLIC_REDPANDA_HOST must be set (Railway public domain for the exposed 9093 port)
# Example: dem l-queue.up.railway.app   or your custom domain.
# Do NOT include scheme or port here.
EXTERNAL_ADV=${REDPANDA_EXTERNAL_ADV:-SASL_SSL://${PUBLIC_REDPANDA_HOST:-localhost}:9093}

echo "Kafka addr: ${INTERNAL_ADDR},${EXTERNAL_ADDR}"
echo "Advertise:  ${INTERNAL_ADV},${EXTERNAL_ADV}"

# Start Redpanda (foreground for container lifetime).
# We launch it in background only long enough to bootstrap the SASL user, then wait.
redpanda start \
  --mode dev-container \
  --smp 1 \
  --memory 2G \
  --kafka-addr "${INTERNAL_ADDR},${EXTERNAL_ADDR}" \
  --advertise-kafka-addr "${INTERNAL_ADV},${EXTERNAL_ADV}" \
  --enable-sasl \
  --sasl-mechanisms SCRAM-SHA-256 \
  --default-log-level info &

RP_PID=$!

# One-time (idempotent) creation of the SASL user used by external clients (e.g. ingestEvent).
# Provide these two env vars on the Redpanda Railway service:
#   REDPANDA_SASL_USERNAME=deml-func
#   REDPANDA_SASL_PASSWORD=your-long-random-password
if [ -n "${REDPANDA_SASL_USERNAME}" ] && [ -n "${REDPANDA_SASL_PASSWORD}" ]; then
  echo "Waiting for Redpanda readiness before creating SASL user..."
  for i in $(seq 1 40); do
    if rpk cluster health --brokers 127.0.0.1:9092 >/dev/null 2>&1; then
      echo "Redpanda healthy."
      break
    fi
    sleep 1
  done

  echo "Ensuring SASL user '${REDPANDA_SASL_USERNAME}' exists (for public clients)..."
  # rpk will error if user exists; we swallow it (idempotent for our purposes).
  rpk security user create "${REDPANDA_SASL_USERNAME}" \
    --password "${REDPANDA_SASL_PASSWORD}" \
    --mechanism SCRAM-SHA-256 \
    --brokers 127.0.0.1:9092 || echo "  (user already exists or non-fatal error; continuing)"
else
  echo "REDPANDA_SASL_USERNAME / PASSWORD not set."
  echo "External clients will not be able to authenticate until a user is created manually:"
  echo "  rpk security user create <user> --password <pass> --mechanism SCRAM-SHA-256"
fi

echo "Redpanda is up. Handing off to main process."
wait $RP_PID
