#!/bin/sh
set -e

echo "==> Redpanda entrypoint starting (authenticated public endpoint support)..."

# Use a config file for listener configuration.
# The v26.1.9 CLI in this container rejects --kafka-addr and --mode on the command line.
# Generating redpanda.yaml is the reliable way to define:
#   - internal PLAINTEXT listener (no auth) on 9092 for Railway services
#   - external SASL listener (SCRAM-SHA-256 over TCP) on 9093 for Firebase Cloud Functions

INTERNAL_HOST="deml-queue.railway.internal"
PUBLIC_HOST="${PUBLIC_REDPANDA_HOST:-localhost}"
PUBLIC_HOST="${PUBLIC_HOST#http://}"
PUBLIC_HOST="${PUBLIC_HOST#https://}"
PUBLIC_HOST="${PUBLIC_HOST%%:*}"

# Advertised port for the external listener. The container always LISTENS on 9093,
# but Railway's TCP Proxy publishes the service on a RANDOM external port that maps
# to 9093. Kafka clients first hit the bootstrap address, then reconnect to whatever
# the broker advertises, so the advertised port MUST equal the public/proxy port or
# the Firebase function never connects (it will time out and fall back to Firestore).
# Set PUBLIC_REDPANDA_PORT to the Railway TCP Proxy port; defaults to 9093 for setups
# where the public port already equals 9093.
PUBLIC_PORT="${PUBLIC_REDPANDA_PORT:-9093}"

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
      port: __PUBLIC_PORT__
  # SASL enforcement is driven entirely by the per-listener `authentication_method`
  # above (external=sasl, internal=none) plus the `sasl_mechanisms` cluster property
  # set via the Admin API below. The cluster-level `enable_sasl` /
  # `kafka_enable_authorization` flags are intentionally NOT set here:
  #   * They are cluster properties, so redpanda logs "Unknown property ... for node
  #     config store" if placed in this node config and ignores them.
  #   * Leaving cluster authorization at its default (off) is required so the
  #     anonymous principal on the internal no-auth 9092 listener (Django,
  #     telemetry_worker, outbox_relay) is not rejected with
  #     TopicAuthorizationFailedError on consume/group operations.

rpk:
  kafka_api:
    brokers:
      - 127.0.0.1:9092
CONFIGEOF

# Substitute the actual hosts/ports (sed for portability)
sed -i "s|__INTERNAL_HOST__|$INTERNAL_HOST|g" "$CONFIG_FILE"
sed -i "s|__PUBLIC_HOST__|$PUBLIC_HOST|g" "$CONFIG_FILE"
sed -i "s|__PUBLIC_PORT__|$PUBLIC_PORT|g" "$CONFIG_FILE"

echo "Generated $CONFIG_FILE"
echo "Internal: $INTERNAL_HOST:9092 (no auth)"
echo "External (listen): 0.0.0.0:9093 (SASL)"
echo "External (advertised): $PUBLIC_HOST:$PUBLIC_PORT (SASL)"
echo "PUBLIC_REDPANDA_HOST (raw): ${PUBLIC_REDPANDA_HOST:-<unset>} ; PUBLIC_REDPANDA_PORT: ${PUBLIC_REDPANDA_PORT:-<unset, default 9093>}"

# Start the broker using the bare `redpanda` binary and the generated config.
# IMPORTANT: the bare `redpanda` binary reads its config via `--redpanda-cfg`.
# `--config` is an rpk-only flag (`rpk redpanda start --config ...`); passing it to
# the bare binary fails with "unrecognised option '--config'" and the broker never
# binds its listeners (port 9092 closed -> every Railway service KafkaConnectionError).
redpanda \
  --redpanda-cfg "$CONFIG_FILE" \
  --overprovisioned \
  --smp 1 \
  --memory 2G \
  --default-log-level info &

RP_PID=$!

# Apply cluster properties via the Admin API (idempotent for both fresh and existing
# clusters). These cannot be reliably set from the redpanda.yaml node section:
#   - auto_create_topics_enabled: producers and telemetry_worker never create topics
#     explicitly, so this must be on. The old `--mode dev-container` startup enabled it
#     implicitly; the explicit config file does not.
#   - sasl_mechanisms: redpanda expects the value "SCRAM" (which serves SCRAM-SHA-256
#     and SCRAM-SHA-512 to clients). "SCRAM-SHA-256" is rejected as invalid, which
#     leaves the external listener advertising NO mechanisms (clients then fail with
#     UNSUPPORTED_SASL_MECHANISM). Setting it here also repairs clusters that persisted
#     the invalid value on an earlier boot.
echo "Applying cluster config via Admin API (waiting for it to be ready)..."
for i in $(seq 1 60); do
  if rpk cluster config set auto_create_topics_enabled true >/tmp/cfg.log 2>&1; then
    rpk cluster config set sasl_mechanisms "[SCRAM]" >>/tmp/cfg.log 2>&1 || true
    echo "Cluster config applied (auto_create_topics_enabled=true, sasl_mechanisms=[SCRAM])."
    break
  fi
  sleep 2
done

# Create the SASL user for the external (9093) listener if credentials are provided.
# `rpk security user create` talks to the Admin API (9644), so it is unaffected by the
# Kafka-listener SASL state. We retry until the Admin API is up instead of probing the
# Kafka API (which returns ILLEGAL_SASL_STATE once enable_sasl is on).
if [ -n "${REDPANDA_SASL_USERNAME}" ] && [ -n "${REDPANDA_SASL_PASSWORD}" ]; then
  echo "Ensuring SASL user '${REDPANDA_SASL_USERNAME}' (waiting for Admin API)..."
  created=0
  for i in $(seq 1 60); do
    if rpk security user create "${REDPANDA_SASL_USERNAME}" \
        --password "${REDPANDA_SASL_PASSWORD}" \
        --mechanism SCRAM-SHA-256 >/tmp/user_create.log 2>&1; then
      echo "SASL user '${REDPANDA_SASL_USERNAME}' created."
      created=1
      break
    fi
    if grep -qi "already exists" /tmp/user_create.log; then
      echo "SASL user '${REDPANDA_SASL_USERNAME}' already exists."
      created=1
      break
    fi
    sleep 2
  done
  if [ "$created" -ne 1 ]; then
    echo "WARN: could not ensure SASL user; last output:"
    cat /tmp/user_create.log 2>/dev/null || true
  fi
else
  echo "No SASL creds provided for external listener."
fi

echo "Redpanda handing off."
wait $RP_PID
