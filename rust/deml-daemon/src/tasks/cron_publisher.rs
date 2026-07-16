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

use anyhow::{bail, Context, Result};
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

const MAX_TASK_ATTEMPTS: i32 = 5;
// One extra day covers the rolling cleanup boundary even when the prior daily
// cleanup was delayed. Older evidence is already outside the raw-data policy.
const ANALYTICS_CATCH_UP_BUCKETS: i64 = 31 * 24;

struct CronTask {
    name: &'static str,
    interval_seconds: i64,
    offset_seconds: i64,
}

const HOUR: i64 = 3_600;
const MINUTE: i64 = 60;
const DAY: i64 = 86_400;
const WEEK: i64 = 7 * DAY;

const CRON_TASKS: &[CronTask] = &[
    CronTask {
        name: "aggregate_analytics",
        interval_seconds: HOUR,
        offset_seconds: 300,
    },
    CronTask {
        name: "generate_export",
        interval_seconds: MINUTE,
        offset_seconds: 30,
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
        name: "enrich_web_technologies",
        interval_seconds: DAY,
        offset_seconds: 7_350,
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
    state: String,
}

#[derive(Debug, Serialize)]
struct TaskTrigger<'a> {
    run_id: Uuid,
    task: &'a str,
    scheduled_for: String,
    triggered_at: String,
    source: &'static str,
}

pub async fn run(
    pool: PgPool,
    producer: FutureProducer,
    clickhouse_url: Option<String>,
) -> Result<()> {
    let owner = Uuid::new_v4();
    let mut last_full_reconcile = tokio::time::Instant::now();
    info!(%owner, tasks = CRON_TASKS.len(), "scheduler: started");

    let catch_up_inserted = ensure_analytics_catch_up_buckets(&pool).await?;
    info!(
        catch_up_inserted,
        "scheduler: reconciled analytics catch-up buckets"
    );
    match maintenance::run_archive_reports(&pool).await {
        Ok(()) => info!("scheduler: startup daily rollup repair completed"),
        Err(error) => error!(%error, "scheduler: startup daily rollup repair failed"),
    }

    loop {
        if last_full_reconcile.elapsed() >= Duration::from_secs(HOUR as u64) {
            match ensure_analytics_catch_up_buckets(&pool).await {
                Ok(inserted) => info!(inserted, "scheduler: periodic analytics reconciliation"),
                Err(error) => error!(%error, "scheduler: periodic analytics reconciliation failed"),
            }
            last_full_reconcile = tokio::time::Instant::now();
        }
        if let Err(error) = ensure_current_buckets(&pool).await {
            error!(%error, "scheduler: failed to materialize time buckets");
        }
        for _ in 0..20 {
            match claim_runs(&pool, owner, 1).await {
                Ok(runs) if runs.is_empty() => break,
                Ok(runs) => {
                    for run in runs {
                        execute_run(&pool, &producer, &clickhouse_url, owner, run).await;
                    }
                }
                Err(error) => {
                    error!(%error, "scheduler: failed to claim run");
                    break;
                }
            }
        }
        tokio::time::sleep(Duration::from_secs(15)).await;
    }
}

async fn ensure_current_buckets(pool: &PgPool) -> Result<()> {
    let now = Utc::now().timestamp();
    for task in CRON_TASKS {
        let scheduled = if task.name == "aggregate_analytics" {
            catch_up_timestamps(task, now, 3)?
        } else {
            vec![scheduled_for_timestamp(task, now)?]
        };
        for scheduled_for in scheduled {
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
    }
    Ok(())
}

fn scheduled_for_timestamp(task: &CronTask, now: i64) -> Result<DateTime<Utc>> {
    let bucket = (now - task.offset_seconds).div_euclid(task.interval_seconds)
        * task.interval_seconds
        + task.offset_seconds;
    DateTime::<Utc>::from_timestamp(bucket, 0).context("scheduler produced an invalid UTC bucket")
}

fn catch_up_timestamps(task: &CronTask, now: i64, bucket_count: i64) -> Result<Vec<DateTime<Utc>>> {
    let current = scheduled_for_timestamp(task, now)?;
    let count = bucket_count.max(1);
    Ok((0..count)
        .rev()
        .map(|index| current - chrono::Duration::seconds(index * task.interval_seconds))
        .collect())
}

async fn ensure_analytics_catch_up_buckets(pool: &PgPool) -> Result<u64> {
    let task = CRON_TASKS
        .iter()
        .find(|task| task.name == "aggregate_analytics")
        .context("aggregate_analytics schedule is missing")?;
    let scheduled = catch_up_timestamps(task, Utc::now().timestamp(), ANALYTICS_CATCH_UP_BUCKETS)?;
    let ids = scheduled.iter().map(|_| Uuid::new_v4()).collect::<Vec<_>>();
    let inserted = sqlx::query(
        r#"
        INSERT INTO scheduled_task_runs
            (id, task_name, scheduled_for, state, attempts, last_error, created_at, updated_at)
        SELECT bucket.id, $3, bucket.scheduled_for, 'pending', 0, '', NOW(), NOW()
        FROM UNNEST($1::uuid[], $2::timestamptz[]) AS bucket(id, scheduled_for)
        ON CONFLICT (task_name, scheduled_for) DO NOTHING
        "#,
    )
    .bind(ids)
    .bind(&scheduled)
    .bind(task.name)
    .execute(pool)
    .await
    .context("failed to reconcile analytics catch-up buckets")?
    .rows_affected();
    let repaired = sqlx::query(
        r#"
        UPDATE scheduled_task_runs AS run
        SET state = 'pending', attempts = 0, last_error = '',
            completed_at = NULL, claimed_by = NULL, lease_expires_at = NULL,
            updated_at = NOW()
        WHERE run.task_name = $1
          AND run.scheduled_for = ANY($2::timestamptz[])
          AND run.state = 'completed'
          AND EXISTS (
            SELECT 1 FROM (
              SELECT evidence.user_id, evidence.is_platform
              FROM (
                SELECT endpoints.user_id, endpoints.is_platform
                FROM endpoints
                WHERE endpoints.last_tested >=
                      (date_trunc('hour', run.scheduled_for AT TIME ZONE 'UTC')
                        AT TIME ZONE 'UTC') - INTERVAL '1 hour'
                  AND endpoints.last_tested <
                      (date_trunc('hour', run.scheduled_for AT TIME ZONE 'UTC')
                        AT TIME ZONE 'UTC')
                UNION
                SELECT cookie_consents.user_id, cookie_consents.is_platform
                FROM cookie_consents
                WHERE cookie_consents.created_at >=
                      (date_trunc('hour', run.scheduled_for AT TIME ZONE 'UTC')
                        AT TIME ZONE 'UTC') - INTERVAL '1 hour'
                  AND cookie_consents.created_at <
                      (date_trunc('hour', run.scheduled_for AT TIME ZONE 'UTC')
                        AT TIME ZONE 'UTC')
              ) AS evidence
              WHERE (
                (evidence.is_platform = true AND evidence.user_id IS NULL)
                OR (
                  evidence.is_platform = false
                  AND evidence.user_id IS NOT NULL
                  AND EXISTS (
                    SELECT 1 FROM user_profiles
                    WHERE user_profiles.user_id = evidence.user_id
                  )
                )
              )
              GROUP BY evidence.user_id, evidence.is_platform
            ) AS raw_scope
            WHERE NOT EXISTS (
              SELECT 1
              FROM aggregated_analytics AS analytics
              WHERE analytics.bucket_size = '1h'
                AND analytics.timestamp =
                    (date_trunc('hour', run.scheduled_for AT TIME ZONE 'UTC')
                      AT TIME ZONE 'UTC') - INTERVAL '1 hour'
                AND COALESCE(analytics.metadata->>'aggregation_version', '0') = '2'
                AND analytics.is_platform = raw_scope.is_platform
                AND analytics.user_id IS NOT DISTINCT FROM raw_scope.user_id
            )
          )
        "#,
    )
    .bind(task.name)
    .bind(&scheduled)
    .execute(pool)
    .await
    .context("failed to queue stale analytics buckets for corrected aggregation")?
    .rows_affected();
    if repaired > 0 {
        info!(
            repaired,
            "scheduler: queued stale analytics buckets for repair"
        );
    }
    Ok(inserted)
}

async fn claim_runs(pool: &PgPool, owner: Uuid, limit: i64) -> Result<Vec<ScheduledRun>> {
    Ok(sqlx::query_as::<_, ScheduledRun>(
        r#"
        WITH candidates AS (
            SELECT id
            FROM scheduled_task_runs
            WHERE (
                    (state IN ('pending', 'failed') AND attempts < $3)
                    OR state = 'published'
                    OR (state = 'running' AND lease_expires_at < NOW() AND attempts < $3)
                  )
              AND scheduled_for <= NOW()
              AND (lease_expires_at IS NULL OR lease_expires_at < NOW())
            ORDER BY
                CASE
                    WHEN task_name IN ('db_cleanup', 'archive_reports', 'cleanup_clickhouse', 'optimize_database')
                      AND state = 'pending' THEN 0
                    WHEN state = 'pending' THEN 1
                    WHEN state = 'failed'
                      AND task_name NOT IN ('db_cleanup', 'archive_reports', 'cleanup_clickhouse', 'optimize_database') THEN 2
                    WHEN state = 'failed' THEN 3
                    WHEN state = 'running' THEN 4
                    ELSE 5
                END,
                CASE WHEN state IN ('pending', 'failed') THEN scheduled_for END DESC,
                scheduled_for,
                task_name
            FOR UPDATE SKIP LOCKED
            LIMIT $2
        )
        UPDATE scheduled_task_runs AS run
        SET claimed_by = $1,
            lease_expires_at = NOW() + INTERVAL '60 seconds',
            updated_at = NOW()
        FROM candidates
        WHERE run.id = candidates.id
        RETURNING run.id, run.task_name, run.scheduled_for, run.state
        "#,
    )
    .bind(owner)
    .bind(limit)
    .bind(MAX_TASK_ATTEMPTS)
    .fetch_all(pool)
    .await?)
}

#[tracing::instrument(
    name = "execute_or_publish_scheduled_run",
    skip_all,
    fields(run_id = %run.id, task = %run.task_name)
)]
async fn execute_run(
    pool: &PgPool,
    producer: &FutureProducer,
    clickhouse_url: &Option<String>,
    owner: Uuid,
    run: ScheduledRun,
) {
    // Rust-native tasks execute directly without Kafka
    if RUST_NATIVE_TASKS.contains(&run.task_name.as_str()) {
        match execute_native_with_heartbeat(pool, clickhouse_url.as_deref(), owner, &run).await {
            Ok(()) => {
                match sqlx::query(
                    r#"
                    UPDATE scheduled_task_runs
                    SET state = 'completed', attempts = attempts + 1,
                        last_error = '', completed_at = NOW(),
                        claimed_by = NULL, lease_expires_at = NULL, updated_at = NOW()
                    WHERE id = $1 AND claimed_by = $2 AND state = $3
                    "#,
                )
                .bind(run.id)
                .bind(owner)
                .bind(&run.state)
                .execute(pool)
                .await
                {
                    Ok(result) if result.rows_affected() == 1 => {
                        info!(run_id = %run.id, task = %run.task_name, "scheduler: native task completed");
                    }
                    Ok(_) => {
                        error!(run_id = %run.id, task = %run.task_name, "scheduler: native completion lost lease ownership");
                    }
                    Err(error) => {
                        error!(run_id = %run.id, %error, "scheduler: native completion update failed");
                    }
                }
            }
            Err(error) => {
                warn!(run_id = %run.id, task = %run.task_name, %error, "scheduler: native task failed");
                if let Err(update_error) = sqlx::query(
                    r#"
                    UPDATE scheduled_task_runs
                    SET state = 'failed', attempts = attempts + 1, last_error = $3,
                        claimed_by = NULL,
                        lease_expires_at = NOW() + INTERVAL '15 minutes',
                        updated_at = NOW()
                        WHERE id = $1 AND claimed_by = $2 AND state = $4
                    "#,
                )
                .bind(run.id)
                .bind(owner)
                .bind(error.to_string())
                .bind(&run.state)
                .execute(pool)
                .await
                {
                    error!(run_id = %run.id, %update_error, "scheduler: native failure update failed");
                }
            }
        }
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
            match sqlx::query(
                r#"
                UPDATE scheduled_task_runs
                SET state = 'published',
                    -- A successful re-publication is an acknowledgement repair, not
                    -- another command failure. Keep execution retries available if
                    -- the worker later records this run as failed.
                    attempts = attempts + CASE WHEN state = 'published' THEN 0 ELSE 1 END,
                    last_error = '', claimed_by = NULL,
                    lease_expires_at = NOW() + INTERVAL '5 minutes', updated_at = NOW()
                WHERE id = $1 AND claimed_by = $2 AND state = $3
                "#,
            )
            .bind(run.id)
            .bind(owner)
            .bind(&run.state)
            .execute(pool)
            .await
            {
                Ok(result) if result.rows_affected() == 1 => {
                    info!(run_id = %run.id, task = %run.task_name, "scheduler: trigger published");
                }
                Ok(_) => {
                    error!(run_id = %run.id, task = %run.task_name, "scheduler: publish acknowledgement lost lease ownership");
                }
                Err(error) => {
                    error!(run_id = %run.id, %error, "scheduler: completion update failed");
                }
            }
        }
        Err(error) => {
            warn!(run_id = %run.id, task = %run.task_name, %error, "scheduler: publish failed");
            if let Err(update_error) = sqlx::query(
                r#"
                UPDATE scheduled_task_runs
                SET state = 'failed', attempts = attempts + 1, last_error = $3,
                    claimed_by = NULL,
                    lease_expires_at = NOW() + INTERVAL '30 seconds',
                    updated_at = NOW()
                WHERE id = $1 AND claimed_by = $2 AND state = $4
                "#,
            )
            .bind(run.id)
            .bind(owner)
            .bind(error.to_string())
            .bind(&run.state)
            .execute(pool)
            .await
            {
                error!(run_id = %run.id, %update_error, "scheduler: publish failure update failed");
            }
        }
    }
}

async fn execute_native_with_heartbeat(
    pool: &PgPool,
    clickhouse_url: Option<&str>,
    owner: Uuid,
    run: &ScheduledRun,
) -> Result<()> {
    extend_native_lease(pool, owner, run).await?;
    let execution = execute_native_task(pool, clickhouse_url, &run.task_name);
    tokio::pin!(execution);
    let mut heartbeat = tokio::time::interval(Duration::from_secs(300));
    heartbeat.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    heartbeat.tick().await;

    loop {
        tokio::select! {
            result = &mut execution => return result,
            _ = heartbeat.tick() => extend_native_lease(pool, owner, run).await?,
        }
    }
}

async fn extend_native_lease(pool: &PgPool, owner: Uuid, run: &ScheduledRun) -> Result<()> {
    let result = sqlx::query(
        r#"
        UPDATE scheduled_task_runs
        SET lease_expires_at = NOW() + INTERVAL '30 minutes', updated_at = NOW()
        WHERE id = $1 AND claimed_by = $2 AND state = $3
        "#,
    )
    .bind(run.id)
    .bind(owner)
    .bind(&run.state)
    .execute(pool)
    .await
    .context("failed to extend native task lease")?;
    if result.rows_affected() != 1 {
        bail!("native task lease is no longer owned by this scheduler");
    }
    Ok(())
}

/// Execute Rust-native tasks directly (db_cleanup, optimize_database, archive_reports)
async fn execute_native_task(
    pool: &PgPool,
    clickhouse_url: Option<&str>,
    task_name: &str,
) -> Result<()> {
    match task_name {
        "db_cleanup" => {
            let url = clickhouse_url.context("db_cleanup requires CLICKHOUSE_URL")?;
            maintenance::run_db_cleanup(pool, url).await
        }
        "optimize_database" => maintenance::run_optimize_database(pool).await,
        "archive_reports" => maintenance::run_archive_reports(pool).await,
        "cleanup_clickhouse" => {
            let url = clickhouse_url.context("cleanup_clickhouse requires CLICKHOUSE_URL")?;
            maintenance::run_cleanup_clickhouse(url).await
        }
        _ => bail!("unknown native task: {task_name}"),
    }
}

#[cfg(test)]
mod tests {
    use super::{
        catch_up_timestamps, scheduled_for_timestamp, CronTask, TaskTrigger, CRON_TASKS, HOUR,
        MINUTE,
    };
    use chrono::{DateTime, Utc};
    use uuid::Uuid;

    fn aggregate_task() -> &'static CronTask {
        CRON_TASKS
            .iter()
            .find(|task| task.name == "aggregate_analytics")
            .expect("aggregate_analytics task should exist")
    }

    #[test]
    fn materializes_offset_utc_bucket() {
        let now = DateTime::parse_from_rfc3339("2026-07-15T16:42:00Z")
            .expect("timestamp should parse")
            .timestamp();
        let scheduled = scheduled_for_timestamp(aggregate_task(), now)
            .expect("scheduled bucket should be valid");
        assert_eq!(scheduled.to_rfc3339(), "2026-07-15T16:05:00+00:00");
    }

    #[test]
    fn analytics_catch_up_is_oldest_first() {
        let now = DateTime::parse_from_rfc3339("2026-07-15T16:42:00Z")
            .expect("timestamp should parse")
            .timestamp();
        let buckets = catch_up_timestamps(aggregate_task(), now, 3)
            .expect("catch-up buckets should be valid");
        assert_eq!(buckets[0].to_rfc3339(), "2026-07-15T14:05:00+00:00");
        assert_eq!(buckets[2].to_rfc3339(), "2026-07-15T16:05:00+00:00");
        assert!(buckets.windows(2).all(|pair| pair[0] < pair[1]));
    }

    #[test]
    fn schedules_export_queue_drain_every_minute() {
        let task = CRON_TASKS
            .iter()
            .find(|task| task.name == "generate_export")
            .expect("generate_export task should exist");
        assert_eq!(task.interval_seconds, MINUTE);
        assert!(task.offset_seconds < MINUTE);
        assert_eq!(aggregate_task().interval_seconds, HOUR);
    }

    #[test]
    fn trigger_keeps_scheduled_for_for_python_command_arguments() {
        let scheduled_for = DateTime::<Utc>::from_timestamp(1_773_590_700, 0)
            .expect("timestamp should be valid")
            .to_rfc3339();
        let trigger = TaskTrigger {
            run_id: Uuid::nil(),
            task: "aggregate_analytics",
            scheduled_for: scheduled_for.clone(),
            triggered_at: "2026-07-15T16:05:01+00:00".to_owned(),
            source: "deml-daemon:scheduler",
        };
        let payload = serde_json::to_value(trigger).expect("trigger should serialize");
        assert_eq!(payload["scheduled_for"], scheduled_for);
        assert_eq!(payload["task"], "aggregate_analytics");
    }
}
