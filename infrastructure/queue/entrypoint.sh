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

# PUBLIC_REDPANDA_HOST must be set to the public hostname only (no scheme, no port).
# Examples: queue.deml.app   or your-queue.up.railway.app
# We defensively strip any accidental http:// or https:// or port the user may have included.
raw_host="${PUBLIC_REDPANDA_HOST:-localhost}"
# strip scheme
raw_host="${raw_host#http://}"
raw_host="${raw_host#https://}"
# strip any trailing port if someone included it
raw_host="${raw_host%%:*}"
EXTERNAL_ADV=${REDPANDA_EXTERNAL_ADV:-SASL_SSL://${raw_host}:9093}

echo "Kafka addr: ${INTERNAL_ADDR},${EXTERNAL_ADDR}"
echo "PUBLIC_REDPANDA_HOST (raw): ${PUBLIC_REDPANDA_HOST:-<unset>}"
echo "Advertise:  ${INTERNAL_ADV},${EXTERNAL_ADV}"

# Start Redpanda.
# Clean flags for recent Redpanda images (v24+/v26). 
# Removed '--mode dev-container' — it is not recognized on v26.1.9 and causes immediate parse error + restart loop.
# --overprovisioned is important for container / Railway environments.
redpanda start \
  --overprovisioned \
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
  echo "Waiting for internal Redpanda Kafka listener (9092) to accept connections..."
  for i in $(seq 1 60); do
    # Use a lightweight check: try to get metadata via rpk (works on the internal PLAINTEXT listener)
    if rpk cluster metadata --brokers 127.0.0.1:9092 >/dev/null 2>&1; then
      echo "Redpanda internal listener is up."
      break
    fi
    sleep 2
  done

  echo "Ensuring SASL user '${REDPANDA_SASL_USERNAME}' exists (for public clients)..."
  # rpk will error if user exists; we swallow it (idempotent).
  rpk security user create "${REDPANDA_SASL_USERNAME}" \
    --password "${REDPANDA_SASL_PASSWORD}" \
    --mechanism SCRAM-SHA-256 \
    --brokers 127.0.0.1:9092 || echo "  (user already exists or non-fatal; continuing)"
else
  echo "REDPANDA_SASL_USERNAME / PASSWORD not set."
  echo "External clients will not be able to authenticate until a user is created manually:"
  echo "  rpk security user create <user> --password <pass> --mechanism SCRAM-SHA-256"
fi

echo "Redpanda is up. Handing off to main process."
wait $RP_PID
