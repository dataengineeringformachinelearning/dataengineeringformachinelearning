//! Durable, replica-safe scheduler.
//!
//! Each cadence maps to an absolute UTC bucket. A unique Postgres constraint prevents
//! restarts or multiple replicas from creating duplicate logical runs. Publishing is
//! leased separately so a broker outage is retried without creating a new run.
//!
//! Tasks are classified into:
//! - Rust-native: db_cleanup, optimize_database, archive_reports (executed directly)
//! - Python-only: ML, threat intel, Stripe sync (published to internal-tasks Kafka)

use std::time::Duration;

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use rdkafka::producer::FutureProducer;
use serde::Serialize;
use sqlx::PgPool;
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::kafka;
use crate::tasks::maintenance;

// Tasks that Rust executes natively (no Kafka publish needed)
const RUST_NATIVE_TASKS: &[&str] = &[
    "db_cleanup",
    "optimize_database",
    "archive_reports",
    "cleanup_clickhouse",
];

struct CronTask {
    name: &'static str,
    interval_seconds: i64,
    offset_seconds: i64,
}

const HOUR: i64 = 3_600;
const DAY: i64 = 86_400;
const WEEK: i64 = 7 * DAY;

const CRON_TASKS: &[CronTask] = &[
    CronTask {
        name: "aggregate_analytics",
        interval_seconds: HOUR,
        offset_seconds: 300,
    },
    CronTask {
        name: "archive_reports",
        interval_seconds: DAY,
        offset_seconds: 1800, // Run early (1800s/30m after midnight) to populate yesterday's data
    },
    CronTask {
        name: "fetch_threat_intel",
        interval_seconds: HOUR,
        offset_seconds: 600,
    },
    CronTask {
        name: "ingest_taxii",
        interval_seconds: HOUR,
        offset_seconds: 750,
    },
    CronTask {
        name: "run_lighthouse_scans",
        interval_seconds: 6 * HOUR,
        offset_seconds: 900,
    },
    CronTask {
        name: "rotate_keys_if_due",
        interval_seconds: DAY,
        offset_seconds: 1_200,
    },
    CronTask {
        name: "train_all_models",
        interval_seconds: DAY,
        offset_seconds: 3_600,
    },
    CronTask {
        name: "scan_dark_web",
        interval_seconds: DAY,
        offset_seconds: 4_500,
    },
    CronTask {
        name: "sync_subscriptions",
        interval_seconds: DAY,
        offset_seconds: 7_200,
    },
    CronTask {
        name: "reconcile_accounts",
        interval_seconds: DAY,
        offset_seconds: 7_500,
    },
    CronTask {
        name: "db_cleanup",
        interval_seconds: DAY,
        offset_seconds: 10_800,
    },
    CronTask {
        name: "cleanup_clickhouse",
        interval_seconds: WEEK, // Weekly - archival cleanup
        offset_seconds: 12_000,
    },
    CronTask {
        name: "optimize_database",
        interval_seconds: DAY,
        offset_seconds: 14_400,
    },
];

#[derive(Debug, sqlx::FromRow)]
struct ScheduledRun {
    id: Uuid,
    task_name: String,
    scheduled_for: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
struct TaskTrigger<'a> {
    run_id: Uuid,
    task: &'a str,
    scheduled_for: String,
    triggered_at: String,
    source: &'static str,
}

pub async fn run(pool: PgPool, producer: FutureProducer, clickhouse_url: Option<String>) -> Result<()> {
    let owner = Uuid::new_v4();
    info!(%owner, tasks = CRON_TASKS.len(), "scheduler: started");

    loop {
        if let Err(error) = ensure_current_buckets(&pool).await {
            error!(%error, "scheduler: failed to materialize time buckets");
        }
        match claim_runs(&pool, owner, 20).await {
            Ok(runs) => {
                for run in runs {
                    execute_run(&pool, &producer, &clickhouse_url, owner, run).await;
                }
            }
            Err(error) => error!(%error, "scheduler: failed to claim runs"),
        }
        tokio::time::sleep(Duration::from_secs(15)).await;
    }
}

async fn ensure_current_buckets(pool: &PgPool) -> Result<()> {
    let now = Utc::now().timestamp();
    for task in CRON_TASKS {
        let bucket = (now - task.offset_seconds).div_euclid(task.interval_seconds)
            * task.interval_seconds
            + task.offset_seconds;
        let scheduled_for = DateTime::<Utc>::from_timestamp(bucket, 0)
            .context("scheduler produced an invalid UTC bucket")?;
        sqlx::query(
            r#"
            INSERT INTO scheduled_task_runs
                (id, task_name, scheduled_for, state, attempts, last_error, created_at, updated_at)
            VALUES ($1, $2, $3, 'pending', 0, '', NOW(), NOW())
            ON CONFLICT (task_name, scheduled_for) DO NOTHING
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(task.name)
        .bind(scheduled_for)
        .execute(pool)
        .await?;
    }
    Ok(())
}

async fn claim_runs(pool: &PgPool, owner: Uuid, limit: i64) -> Result<Vec<ScheduledRun>> {
    Ok(sqlx::query_as::<_, ScheduledRun>(
        r#"
        WITH candidates AS (
            SELECT id
            FROM scheduled_task_runs
            WHERE (state IN ('pending', 'failed')
                   OR (state = 'running' AND lease_expires_at < NOW()))
              AND attempts < 5
              AND scheduled_for <= NOW()
              AND (lease_expires_at IS NULL OR lease_expires_at < NOW())
            ORDER BY scheduled_for, task_name
            FOR UPDATE SKIP LOCKED
            LIMIT $2
        )
        UPDATE scheduled_task_runs AS run
        SET claimed_by = $1,
            lease_expires_at = NOW() + INTERVAL '60 seconds',
            updated_at = NOW()
        FROM candidates
        WHERE run.id = candidates.id
        RETURNING run.id, run.task_name, run.scheduled_for
        "#,
    )
    .bind(owner)
    .bind(limit)
    .fetch_all(pool)
    .await?)
}

#[tracing::instrument(
    name = "execute_or_publish_scheduled_run",
    skip_all,
    fields(run_id = %run.id, task = %run.task_name)
)]
async fn execute_run(pool: &PgPool, producer: &FutureProducer, clickhouse_url: &Option<String>, owner: Uuid, run: ScheduledRun) {
    // Rust-native tasks execute directly without Kafka
    if RUST_NATIVE_TASKS.contains(&run.task_name.as_str()) {
        execute_native_task(pool, clickhouse_url.as_deref(), &run.task_name, run.id).await;
        // Update state to completed (native execution)
        let _ = sqlx::query(
            r#"
            UPDATE scheduled_task_runs
            SET state = 'completed', attempts = attempts + 1,
                completed_at = NOW(),
                claimed_by = NULL, lease_expires_at = NULL, updated_at = NOW()
            WHERE id = $1 AND claimed_by = $2
            "#,
        )
        .bind(run.id)
        .bind(owner)
        .execute(pool)
        .await;
        return;
    }

    // Python-only tasks publish to internal-tasks
    let trigger = TaskTrigger {
        run_id: run.id,
        task: &run.task_name,
        scheduled_for: run.scheduled_for.to_rfc3339(),
        triggered_at: Utc::now().to_rfc3339(),
        source: "deml-daemon:scheduler",
    };
    let result = async {
        let payload = serde_json::to_vec(&trigger)?;
        let headers = serde_json::json!({
            "x-deml-task": run.task_name,
            "x-deml-run-id": run.id.to_string(),
        });
        kafka::publish(
            producer,
            "internal-tasks",
            Some(&run.task_name),
            &payload,
            &headers,
        )
        .await
    }
    .await;

    match result {
        Ok(()) => {
            if let Err(error) = sqlx::query(
                r#"
                UPDATE scheduled_task_runs
                SET state = 'published', attempts = attempts + 1,
                    claimed_by = NULL, lease_expires_at = NULL, updated_at = NOW()
                WHERE id = $1 AND claimed_by = $2
                "#,
            )
            .bind(run.id)
            .bind(owner)
            .execute(pool)
            .await
            {
                error!(run_id = %run.id, %error, "scheduler: completion update failed");
            } else {
                info!(run_id = %run.id, task = %run.task_name, "scheduler: trigger published");
            }
        }
        Err(error) => {
            warn!(run_id = %run.id, task = %run.task_name, %error, "scheduler: publish failed");
            let _ = sqlx::query(
                r#"
                UPDATE scheduled_task_runs
                SET state = 'failed', attempts = attempts + 1, last_error = $3,
                    claimed_by = NULL,
                    lease_expires_at = NOW() + INTERVAL '30 seconds',
                    updated_at = NOW()
                WHERE id = $1 AND claimed_by = $2
                "#,
            )
            .bind(run.id)
            .bind(owner)
            .bind(error.to_string())
            .execute(pool)
            .await;
        }
    }
}

/// Execute Rust-native tasks directly (db_cleanup, optimize_database, archive_reports)
async fn execute_native_task(pool: &PgPool, clickhouse_url: Option<&str>, task_name: &str, run_id: Uuid) {
    match task_name {
        "db_cleanup" => {
            if let Err(e) = maintenance::run_db_cleanup(pool).await {
                error!(run_id = %run_id, error = %e, "native db_cleanup failed");
            }
        }
        "optimize_database" => {
            if let Err(e) = maintenance::run_optimize_database(pool).await {
                error!(run_id = %run_id, error = %e, "native optimize_database failed");
            }
        }
        "archive_reports" => {
            if let Err(e) = maintenance::run_archive_reports(pool).await {
                error!(run_id = %run_id, error = %e, "native archive_reports failed");
            }
        }
        "cleanup_clickhouse" => {
            if let Some(url) = clickhouse_url {
                if let Err(e) = maintenance::run_cleanup_clickhouse(url).await {
                    error!(run_id = %run_id, error = %e, "native cleanup_clickhouse failed");
                }
            } else {
                warn!(run_id = %run_id, "cleanup_clickhouse: CLICKHOUSE_URL not configured");
            }
        }
        _ => warn!(task = task_name, "unknown native task"),
    }
}
