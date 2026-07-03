//! Cron Publisher
//!
//! Publishes scheduled task triggers to the Redpanda `internal-tasks` topic.
//! The `deml-workers` Python container consumes this topic and calls the
//! corresponding Django management command.
//!
//! This decouples scheduling (Rust, zero-drift tokio clock) from execution
//! (Python, Django ORM + KMS + Stripe SDK).
//!
//! Current schedule:
//! | Task                  | Interval  | Why Python                              |
//! |-----------------------|-----------|-----------------------------------------|
//! | aggregate_analytics   | 1 hour    | Django ORM Avg/Count + ClickHouse write |
//! | rotate_keys           | 90 days   | GCP KMS SDK + transaction.atomic()      |
//! | reconcile_accounts    | 6 hours   | Auth/sites/Stripe/deletion reconciliation |

use std::time::Duration;

use anyhow::Result;
use rdkafka::producer::FutureProducer;
use serde::Serialize;
use tracing::{error, info};

use crate::kafka;

// ── Schedule definitions ──────────────────────────────────────────────────────

struct CronTask {
    /// Matches the Django management command name.
    name: &'static str,
    interval: Duration,
}

const CRON_TASKS: &[CronTask] = &[
    CronTask {
        name: "aggregate_analytics",
        interval: Duration::from_secs(3600), // 1h
    },
    CronTask {
        name: "reconcile_accounts",
        interval: Duration::from_secs(21600), // 6h
    },
    // rotate_keys: 90-day interval is managed separately; triggered by a
    // scheduled Cloud Run job in production. Listed here for completeness.
];

// ── Payload shape ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
struct TaskTrigger<'a> {
    task: &'a str,
    /// ISO-8601 timestamp of this trigger.
    triggered_at: String,
    source: &'static str,
}

// ── Main task ─────────────────────────────────────────────────────────────────

pub async fn run(producer: FutureProducer) {
    info!("cron_publisher: started — managing {} scheduled tasks", CRON_TASKS.len());

    // Spawn one tokio task per cron entry so intervals are independent.
    let mut handles = Vec::new();
    for task in CRON_TASKS {
        let producer_clone = producer.clone();
        let name = task.name;
        let interval = task.interval;

        handles.push(tokio::spawn(async move {
            // Initial delay: stagger task execution at startup.
            tokio::time::sleep(Duration::from_secs(30)).await;

            loop {
                if let Err(e) = publish_trigger(&producer_clone, name).await {
                    error!(task = name, error = %e, "cron_publisher: failed to publish trigger");
                }
                tokio::time::sleep(interval).await;
            }
        }));
    }

    // Wait for any handle to exit (they're infinite loops, so this never returns
    // unless a panic occurs — consistent with outbox_relay behaviour).
    for handle in handles {
        if let Err(e) = handle.await {
            error!(error = ?e, "cron_publisher: task panicked");
        }
    }
}

// ── Publish helper ────────────────────────────────────────────────────────────

async fn publish_trigger(producer: &FutureProducer, task_name: &str) -> Result<()> {
    let trigger = TaskTrigger {
        task: task_name,
        triggered_at: chrono::Utc::now().to_rfc3339(),
        source: "deml-daemon:cron_publisher",
    };

    let payload = serde_json::to_vec(&trigger)?;
    let headers = serde_json::json!({
        "X-Task-Name": task_name,
        "X-Source": "deml-daemon"
    });

    kafka::publish(producer, "internal-tasks", Some(task_name), &payload, &headers).await?;
    info!(task = task_name, "cron_publisher: trigger published");
    Ok(())
}
