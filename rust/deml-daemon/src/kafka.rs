use anyhow::{Context, Result};
use rdkafka::{
    config::ClientConfig,
    consumer::StreamConsumer,
    message::{Header, OwnedHeaders},
    producer::{FutureProducer, FutureRecord},
};
use serde_json::Value;
use std::time::Duration;

use crate::config::Config;

/// Build a Redpanda/Kafka `FutureProducer` from the daemon config.
///
/// Supports two modes:
/// - **Plain (local dev)**: no SASL credentials → plaintext connection.
/// - **SASL/SCRAM-SHA-256 (production)**: `REDPANDA_SASL_USERNAME` +
///   `REDPANDA_SASL_PASSWORD` → uses `SASL_SSL` or `SASL_PLAINTEXT`
///   depending on `REDPANDA_SSL`.
pub fn build_producer(cfg: &Config) -> Result<FutureProducer> {
    let mut client_cfg = ClientConfig::new();
    client_cfg
        .set("bootstrap.servers", &cfg.redpanda_brokers)
        // Wait for all in-sync replicas to acknowledge before considering a send successful.
        .set("acks", "all")
        .set("enable.idempotence", "true")
        .set("max.in.flight.requests.per.connection", "5")
        // Per-message delivery timeout (30s). Matches the Python aiokafka `send_and_wait`.
        .set("message.timeout.ms", "30000")
        // Retries with backoff before giving up.
        .set("retries", "5")
        .set("retry.backoff.ms", "500")
        // Reduce latency for the relay — we're not batching for throughput.
        .set("linger.ms", "5")
        .set("compression.type", "zstd")
        // Force IPv4 address resolution to avoid connection failures when connecting to IPv6 aliases
        // of containers that are only listening on IPv4 (0.0.0.0).
        .set("broker.address.family", "v4");

    if let (Some(user), Some(pass)) = (&cfg.sasl_username, &cfg.sasl_password) {
        let protocol = if cfg.sasl_ssl {
            "SASL_SSL"
        } else {
            "SASL_PLAINTEXT"
        };
        client_cfg
            .set("security.protocol", protocol)
            .set("sasl.mechanism", "SCRAM-SHA-256")
            .set("sasl.username", user.as_str())
            .set("sasl.password", pass.as_str());
    }

    client_cfg
        .create::<FutureProducer>()
        .context("failed to create Kafka producer")
}

pub fn build_consumer(cfg: &Config, group_id: &str) -> Result<StreamConsumer> {
    let mut client_cfg = ClientConfig::new();
    client_cfg
        .set("bootstrap.servers", &cfg.redpanda_brokers)
        .set("group.id", group_id)
        .set("enable.auto.commit", "false")
        .set("enable.auto.offset.store", "false")
        .set("auto.offset.reset", "earliest")
        .set("session.timeout.ms", "30000")
        .set("max.poll.interval.ms", "300000")
        .set("broker.address.family", "v4");
    apply_security(&mut client_cfg, cfg);
    client_cfg
        .create::<StreamConsumer>()
        .context("failed to create Kafka consumer")
}

fn apply_security(client_cfg: &mut ClientConfig, cfg: &Config) {
    if let (Some(user), Some(pass)) = (&cfg.sasl_username, &cfg.sasl_password) {
        let protocol = if cfg.sasl_ssl {
            "SASL_SSL"
        } else {
            "SASL_PLAINTEXT"
        };
        client_cfg
            .set("security.protocol", protocol)
            .set("sasl.mechanism", "SCRAM-SHA-256")
            .set("sasl.username", user.as_str())
            .set("sasl.password", pass.as_str());
    }
}

/// Publish a single message to a Redpanda topic, waiting for delivery confirmation.
///
/// - `topic`: destination topic name (e.g. `"app-events"`)
/// - `key`: optional partition key (e.g. user UID) — `None` uses round-robin
/// - `payload`: raw bytes of the serialised event
/// - `headers`: JSONB value from `OutboxEvent.headers` — string-valued keys are
///   forwarded as Kafka headers; non-string values are silently skipped.
pub async fn publish(
    producer: &FutureProducer,
    topic: &str,
    key: Option<&str>,
    payload: &[u8],
    headers: &Value,
) -> Result<()> {
    // Build Kafka headers from the JSON object stored in the outbox.
    let mut owned_headers = OwnedHeaders::new();
    if let Some(obj) = headers.as_object() {
        for (k, v) in obj {
            if let Some(s) = v.as_str() {
                owned_headers = owned_headers.insert(Header {
                    key: k.as_str(),
                    value: Some(s.as_bytes()),
                });
            }
        }
    }

    let mut record = FutureRecord::to(topic)
        .payload(payload)
        .headers(owned_headers);

    if let Some(k) = key {
        record = record.key(k);
    }

    producer
        .send(record, Duration::from_secs(30))
        .await
        .map_err(|(err, _msg)| anyhow::anyhow!("Kafka delivery failed: {err}"))?;

    Ok(())
}
