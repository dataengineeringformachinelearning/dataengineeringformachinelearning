//! Transactional Outbox Relay
//!
//! Polls `monitor_outboxevent` in Postgres for unpublished events and
//! delivers them to Redpanda, then marks each row as published.
//!
//! This is a direct, dependency-free replacement for the Python
//! `manage.py outbox_relay` command. The relay:
//!
//! - Polls at `POLL_INTERVAL_SECS` (default 5s)
//! - Processes up to `BATCH_SIZE` events per cycle (default 100)
//! - Retries up to `MAX_ATTEMPTS` times before logging `dlq_candidate`
//! - Emits structured `tracing` spans for every batch and failure
//! - Is safe to run as a single instance (no distributed locking needed)
//!   since outbox idempotency is enforced at the Redpanda consumer level

use std::time::Duration;

use rdkafka::producer::FutureProducer;
use sqlx::PgPool;
use tracing::{error, info, warn};

use crate::{config::Config, db, kafka};

/// Entry point — runs forever, returning only on an irrecoverable startup error.
pub async fn run(pool: PgPool, producer: FutureProducer, cfg: Config) {
    info!(
        batch_size  = cfg.batch_size,
        interval_s  = cfg.poll_interval_secs,
        max_attempts = cfg.max_attempts,
        "outbox_relay: started"
    );

    loop {
        match tick(&pool, &producer, &cfg).await {
            Ok(0) => {
                // Nothing to do — sleep quietly without logging.
            }
            Ok(n) => {
                info!(published = n, "outbox_relay: batch published");
            }
            Err(e) => {
                // Transient error (DB unreachable, serialisation failure, etc.).
                // Log and sleep — do not crash the daemon.
                error!(error = %e, "outbox_relay: tick error");
            }
        }

        tokio::time::sleep(Duration::from_secs(cfg.poll_interval_secs)).await;
    }
}

/// One poll cycle: fetch → publish → mark. Returns number of successfully published events.
async fn tick(pool: &PgPool, producer: &FutureProducer, cfg: &Config) -> anyhow::Result<usize> {
    let events = db::fetch_pending(pool, cfg.batch_size, cfg.max_attempts).await?;

    if events.is_empty() {
        return Ok(0);
    }

    let mut published: usize = 0;

    for event in events {
        // Serialise the JSONB payload back to bytes for the Kafka message body.
        let payload_bytes = match serde_json::to_vec(&event.payload) {
            Ok(b) => b,
            Err(e) => {
                // Malformed payload — record the failure without crashing.
                let msg = format!("payload serialisation error: {e}");
                warn!(id = %event.id, topic = %event.topic, error = %msg, "outbox_relay: skipping malformed event");
                if let Err(db_err) = db::record_failure(pool, event.id, &msg).await {
                    error!(error = %db_err, "outbox_relay: failed to record serialisation failure");
                }
                continue;
            }
        };

        match kafka::publish(
            producer,
            &event.topic,
            event.key.as_deref(),
            &payload_bytes,
            &event.headers,
        )
        .await
        {
            Ok(()) => {
                if let Err(e) = db::mark_published(pool, event.id).await {
                    // The message was delivered but the DB update failed.
                    // The consumer will receive the event (idempotent at consumer level).
                    // Log and continue — do not double-publish.
                    error!(id = %event.id, error = %e, "outbox_relay: mark_published failed after successful delivery");
                }
                published += 1;
            }

            Err(e) => {
                let err_str = e.to_string();
                warn!(
                    id      = %event.id,
                    topic   = %event.topic,
                    error   = %err_str,
                    attempt = event.attempts + 1,
                    "outbox_relay: publish failed"
                );

                if let Err(db_err) = db::record_failure(pool, event.id, &err_str).await {
                    error!(error = %db_err, "outbox_relay: failed to record publish failure");
                }

                // Surface as a structured log so observability tooling can alert.
                if event.attempts + 1 >= cfg.max_attempts {
                    error!(
                        id          = %event.id,
                        topic       = %event.topic,
                        max_attempts = cfg.max_attempts,
                        // Sentinel field — grep for this in ClickHouse / log queries
                        // to identify events that need manual DLQ inspection.
                        dlq_candidate = true,
                        "outbox_relay: event exhausted retries"
                    );
                }
            }
        }
    }

    Ok(published)
}
