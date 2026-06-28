FROM redpandadata/redpanda:v26.1.9

# Dual-listener secure setup for Event Projections (and other client commands):
#
# - Internal listener (9092 / PLAINTEXT): Railway private network only.
#   Used by Django, telemetry_worker, outbox_relay, etc. (fast path, no auth overhead).
#
# - External listener (9093 / SASL_SSL): Public, authenticated endpoint.
#   Used by Firebase Cloud Functions (`ingestEvent`) which live outside the Railway private network.
#
# SASL (SCRAM-SHA-256) + SSL is required on the public listener.
# A dedicated SASL user is bootstrapped automatically if you set:
#   REDPANDA_SASL_USERNAME
#   REDPANDA_SASL_PASSWORD
#   PUBLIC_REDPANDA_HOST   (the public Railway hostname for port 9093)
#
# This gives fast direct publish (no polling) from Cloud Functions while keeping
# internal Redpanda completely private.

COPY entrypoint.sh /entrypoint.sh

USER root
RUN chmod +x /entrypoint.sh

EXPOSE 9092
EXPOSE 9093

USER redpanda

ENTRYPOINT ["/entrypoint.sh"]
