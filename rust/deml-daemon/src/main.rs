use anyhow::Result;
use sqlx::postgres::PgPoolOptions;
use tracing::{error, info};
use tracing_subscriber::EnvFilter;

mod config;
mod db;
mod kafka;
mod tasks;

#[tokio::main]
async fn main() -> Result<()> {
    let cfg = config::Config::from_env();

    // ── Structured logging ────────────────────────────────────────────────
    // JSON output when STRUCTURED_LOGS=true (production), human-readable otherwise.
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("deml_daemon=info,warn"));

    if cfg.structured_logs {
        tracing_subscriber::fmt()
            .json()
            .with_env_filter(filter)
            .with_current_span(false)
            .init();
    } else {
        tracing_subscriber::fmt()
            .with_env_filter(filter)
            .init();
    }

    info!(
        version = env!("CARGO_PKG_VERSION"),
        brokers = %cfg.redpanda_brokers,
        batch_size = cfg.batch_size,
        poll_interval_secs = cfg.poll_interval_secs,
        "deml-daemon: starting"
    );

    // ── Postgres connection pool ──────────────────────────────────────────
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&cfg.database_url)
        .await?;
    info!("deml-daemon: postgres connected");

    // ── Redpanda / Kafka producer ─────────────────────────────────────────
    let producer = kafka::build_producer(&cfg)?;
    info!("deml-daemon: kafka producer ready");

    // ── Task runners ──────────────────────────────────────────────────────────
    // All tasks are tokio::spawn'd so they run concurrently within the same process.
    // If a task panics, we log the error and let the OS restart the container.

    // Phase 1: outbox relay — Postgres → Redpanda
    let relay_handle = tokio::spawn(tasks::outbox_relay::run(
        pool.clone(),
        producer.clone(),
        cfg.clone(),
    ));

    // Phase 2: concurrent HTTP health probes → Django ingest endpoint
    let pinger_handle = tokio::spawn(tasks::health_pinger::run(pool.clone(), cfg.clone()));

    // Phase 2: cron trigger publisher → internal-tasks Redpanda topic
    let cron_handle = tokio::spawn(tasks::cron_publisher::run(producer.clone()));

    info!("deml-daemon: all tasks running");

    // Join — any task returning (they're infinite loops so this only fires on panic)
    // logs an error so the container's exit code is non-zero and the orchestrator restarts.
    tokio::select! {
        res = relay_handle    => { error!(task = "outbox_relay",   result = ?res, "task exited unexpectedly"); }
        res = pinger_handle   => { error!(task = "health_pinger",  result = ?res, "task exited unexpectedly"); }
        res = cron_handle     => { error!(task = "cron_publisher", result = ?res, "task exited unexpectedly"); }
    }

    Ok(())
}
