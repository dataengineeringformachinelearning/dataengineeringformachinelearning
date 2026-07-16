//! Database maintenance operations migrated from Python workers.
//!
//! Tasks: db_cleanup, optimize_database, archive_reports, cleanup_clickhouse
//! These are pure Postgres/ClickHouse operations that don't need Python's ORM.

use anyhow::{bail, Context, Result};
use chrono::Utc;
use reqwest::Client;
use serde::Serialize;
use sqlx::PgPool;
use tracing::{info, warn};
use url::Url;

/// ClickHouse retention constants matching backend/utils/retention.py
const CH_AUDIT_ARCHIVE_RETENTION_DAYS: i32 = 180;
const CH_SECURITY_EVENTS_RETENTION_DAYS: i32 = 365;
const CH_TELEMETRY_RETENTION_DAYS: i32 = 730;

/// Retention constants matching backend/utils/retention.py
const RAW_TELEMETRY_RETENTION_DAYS: i32 = 30;
const OUTBOX_PUBLISHED_RETENTION_DAYS: i32 = 30;
const OUTBOX_DLQ_RETENTION_DAYS: i32 = 7;
const THREAT_INTELLIGENCE_RETENTION_DAYS: i32 = 90;
const LIGHTHOUSE_SCAN_RETENTION_DAYS: i32 = 30;
const REPORT_ARCHIVE_RETENTION_DAYS: i32 = 90;
const STATUS_UPTIME_RETENTION_DAYS: i32 = 90;
const SCHEDULED_TASK_RETENTION_DAYS: i32 = 90;
const SEARCH_QUERY_RETENTION_DAYS: i32 = 30;
const HONEYPOT_INTERACTION_RETENTION_DAYS: i32 = 90;
const BENCHMARK_RUN_RETENTION_DAYS: i32 = 365;
// The 30-slot public window is today plus 29 completed UTC days. Recomputing
// today-30 after rolling raw pruning would overwrite a complete archive with a
// partial suffix, so recurring repair intentionally stops at 29 completed days.
const ROLLUP_REPAIR_DAYS: i32 = 29;
const AUDIT_ARCHIVE_BATCH_SIZE: i64 = 5_000;

const CLICKHOUSE_RETENTION_TABLES: &[&str] = &[
    r#"
    CREATE TABLE IF NOT EXISTS audit_archive (
        audit_id String,
        timestamp DateTime64(6, 'UTC'),
        action LowCardinality(String),
        resource_id String,
        user_id UInt64,
        ip_address String,
        user_agent String,
        details_json String
    ) ENGINE = ReplacingMergeTree
    PARTITION BY toYYYYMM(timestamp)
    ORDER BY (audit_id, timestamp)
    TTL timestamp + INTERVAL 180 DAY DELETE
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS security_events (
        event_id String,
        timestamp DateTime64(6, 'UTC'),
        event_type LowCardinality(String),
        source LowCardinality(String),
        severity LowCardinality(String),
        account_id String,
        user_id UInt64,
        correlation_id String,
        raw_json_text String
    ) ENGINE = MergeTree
    PARTITION BY toYYYYMM(timestamp)
    ORDER BY (timestamp, event_id)
    TTL timestamp + INTERVAL 365 DAY DELETE
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS asset_vulnerability_ledger (
        timestamp DateTime64(6, 'UTC'),
        account_id String,
        url Nullable(String),
        tech_name Nullable(String),
        version Nullable(String),
        cpe_2_3 Nullable(String),
        cve_id String,
        cvss_score Nullable(Float64),
        description Nullable(String),
        remediation Nullable(String)
    ) ENGINE = MergeTree
    PARTITION BY toYYYYMM(timestamp)
    ORDER BY (account_id, timestamp, cve_id)
    TTL timestamp + INTERVAL 730 DAY DELETE
    "#,
];

const CLICKHOUSE_SCHEMA_UPGRADES: &[&str] = &[
    "ALTER TABLE audit_archive ADD COLUMN IF NOT EXISTS user_agent String DEFAULT ''",
    "ALTER TABLE audit_archive ADD COLUMN IF NOT EXISTS details_json String DEFAULT ''",
    "ALTER TABLE security_events ADD COLUMN IF NOT EXISTS raw_json_text String DEFAULT ''",
    "ALTER TABLE asset_vulnerability_ledger ADD COLUMN IF NOT EXISTS timestamp DateTime64(6, 'UTC') DEFAULT toDateTime64('2026-07-15 00:00:00', 6, 'UTC')",
    "ALTER TABLE audit_archive MODIFY TTL timestamp + INTERVAL 180 DAY DELETE",
    "ALTER TABLE security_events MODIFY TTL timestamp + INTERVAL 365 DAY DELETE",
    "ALTER TABLE asset_vulnerability_ledger MODIFY TTL timestamp + INTERVAL 730 DAY DELETE",
];

const OPTIMIZE_TABLES: &[&str] = &[
    "endpoints",
    "health_probe_observations",
    "telemetry_ingest_receipts",
    "aggregated_analytics",
    "lighthouse_scans",
    "report_archives",
    "status_page_uptime_daily",
    "audit_logs",
    "cookie_consents",
    "monitor_outboxevent",
    "scheduled_task_runs",
    "threat_intelligence",
    "status_pages",
    "monitored_services",
    "incidents",
    "export_jobs",
    "search_queries",
    "honeypot_interactions",
    "benchmark_runs",
];

/// Runs database cleanup after repairing every rollup that depends on raw data.
#[tracing::instrument(name = "db_cleanup", skip_all)]
pub async fn run_db_cleanup(pool: &PgPool, clickhouse_url: &str) -> Result<()> {
    // Cleanup must never outrun materialization. This repeats the idempotent daily
    // repair immediately before pruning so a missed 00:30 scheduler bucket cannot
    // create a permanent hole in reports or status-page uptime.
    run_archive_reports(pool)
        .await
        .context("refusing to prune raw data because rollup repair failed")?;

    let cutoff = Utc::now() - chrono::Duration::days(RAW_TELEMETRY_RETENTION_DAYS as i64);
    let outbox_cutoff = Utc::now() - chrono::Duration::days(OUTBOX_PUBLISHED_RETENTION_DAYS as i64);
    let outbox_dlq_cutoff = Utc::now() - chrono::Duration::days(OUTBOX_DLQ_RETENTION_DAYS as i64);
    let threat_cutoff =
        Utc::now() - chrono::Duration::days(THREAT_INTELLIGENCE_RETENTION_DAYS as i64);
    let lighthouse_cutoff =
        Utc::now() - chrono::Duration::days(LIGHTHOUSE_SCAN_RETENTION_DAYS as i64);
    let report_cutoff = Utc::now() - chrono::Duration::days(REPORT_ARCHIVE_RETENTION_DAYS as i64);
    let uptime_cutoff = Utc::now() - chrono::Duration::days(STATUS_UPTIME_RETENTION_DAYS as i64);
    let scheduled_cutoff =
        Utc::now() - chrono::Duration::days(SCHEDULED_TASK_RETENTION_DAYS as i64);
    let search_cutoff = Utc::now() - chrono::Duration::days(SEARCH_QUERY_RETENTION_DAYS as i64);
    let honeypot_cutoff =
        Utc::now() - chrono::Duration::days(HONEYPOT_INTERACTION_RETENTION_DAYS as i64);
    let benchmark_cutoff = Utc::now() - chrono::Duration::days(BENCHMARK_RUN_RETENTION_DAYS as i64);

    ensure_raw_analytics_coverage(pool, cutoff)
        .await
        .context("refusing to prune raw analytics sources before hourly coverage is complete")?;

    // Audit logs are compliance evidence. Archive and acknowledge exact IDs in
    // bounded batches before any PostgreSQL deletion; a ClickHouse outage fails
    // this task closed instead of silently destroying the only durable copy.
    let audit_deleted = archive_and_delete_audit_logs(pool, clickhouse_url, cutoff)
        .await
        .context("refusing to prune audit logs because ClickHouse archival failed")?;

    let mut transaction = pool
        .begin()
        .await
        .context("failed to begin database cleanup transaction")?;

    // Purge legacy duplicate ThreatIntelligence records (pre-constraint duplicates)
    info!("Removing legacy duplicate ThreatIntelligence records...");
    let dupes = sqlx::query(
        r#"
        DELETE FROM threat_intelligence AS newer
        USING threat_intelligence AS older
        WHERE newer.id > older.id
          AND newer.user_id IS NOT DISTINCT FROM older.user_id
          AND newer.source = older.source
          AND newer.ip_address IS NOT DISTINCT FROM older.ip_address
          AND newer.location IS NOT DISTINCT FROM older.location
        "#,
    )
    .execute(&mut *transaction)
    .await
    .context("failed to remove legacy duplicate threat intelligence")?
    .rows_affected();
    info!(
        "Deleted {} legacy duplicate ThreatIntelligence records",
        dupes
    );

    // Delete old endpoints (raw telemetry)
    let endpoints_deleted = sqlx::query("DELETE FROM endpoints WHERE last_tested < $1")
        .bind(cutoff)
        .execute(&mut *transaction)
        .await
        .context("failed to delete old endpoints")?
        .rows_affected();

    // Immutable Rust probe observations are the authoritative uptime source. Their
    // daily projection was repaired above, so the high-frequency rows can now age out.
    let probe_observations_deleted =
        sqlx::query("DELETE FROM health_probe_observations WHERE observed_at < $1")
            .bind(cutoff)
            .execute(&mut *transaction)
            .await
            .context("failed to delete old health probe observations")?
            .rows_affected();

    // Delete old cookie consent records
    let cookie_deleted = sqlx::query("DELETE FROM cookie_consents WHERE created_at < $1")
        .bind(cutoff)
        .execute(&mut *transaction)
        .await
        .context("failed to delete old cookie consent")?
        .rows_affected();

    // Delete published outbox events
    let outbox_published_deleted = sqlx::query(
        "DELETE FROM monitor_outboxevent WHERE is_published = true AND published_at < $1",
    )
    .bind(outbox_cutoff)
    .execute(&mut *transaction)
    .await
    .context("failed to delete published outbox events")?
    .rows_affected();

    // Delete DLQ outbox events (failed retries)
    let outbox_dlq_deleted = sqlx::query(
        "DELETE FROM monitor_outboxevent WHERE is_published = false AND attempts >= 5 AND dlq_at < $1",
    )
    .bind(outbox_dlq_cutoff)
    .execute(&mut *transaction)
    .await
    .context("failed to delete DLQ outbox events")?
    .rows_affected();

    // Delete old hourly aggregate analytics (after daily rollups materialized)
    let hourly_deleted =
        sqlx::query("DELETE FROM aggregated_analytics WHERE bucket_size = '1h' AND timestamp < $1")
            .bind(cutoff)
            .execute(&mut *transaction)
            .await
            .context("failed to delete hourly aggregates")?
            .rows_affected();

    // Kafka-position receipts only need to outlive the raw replay window. Their
    // unique constraint otherwise grows forever on a busy normalizer.
    let receipts_deleted =
        sqlx::query("DELETE FROM telemetry_ingest_receipts WHERE processed_at < $1")
            .bind(cutoff)
            .execute(&mut *transaction)
            .await
            .context("failed to delete old telemetry ingest receipts")?
            .rows_affected();

    let reports_deleted = sqlx::query(
        "DELETE FROM report_archives WHERE report_date < ($1 AT TIME ZONE 'UTC')::date",
    )
    .bind(report_cutoff)
    .execute(&mut *transaction)
    .await
    .context("failed to delete expired report archives")?
    .rows_affected();

    let uptime_rollups_deleted = sqlx::query(
        "DELETE FROM status_page_uptime_daily WHERE report_date < ($1 AT TIME ZONE 'UTC')::date",
    )
    .bind(uptime_cutoff)
    .execute(&mut *transaction)
    .await
    .context("failed to delete expired status-page uptime rollups")?
    .rows_affected();

    // Preserve retryable work. Only completed runs and terminal failures are history.
    let scheduled_runs_deleted = sqlx::query(
        r#"
        DELETE FROM scheduled_task_runs
        WHERE scheduled_for < $1
          AND (state = 'completed' OR (state = 'failed' AND attempts >= 5))
        "#,
    )
    .bind(scheduled_cutoff)
    .execute(&mut *transaction)
    .await
    .context("failed to delete old scheduled task history")?
    .rows_affected();

    let search_queries_deleted = sqlx::query("DELETE FROM search_queries WHERE timestamp < $1")
        .bind(search_cutoff)
        .execute(&mut *transaction)
        .await
        .context("failed to delete old search queries")?
        .rows_affected();

    let honeypot_interactions_deleted =
        sqlx::query("DELETE FROM honeypot_interactions WHERE timestamp < $1")
            .bind(honeypot_cutoff)
            .execute(&mut *transaction)
            .await
            .context("failed to delete old honeypot interactions")?
            .rows_affected();

    let benchmark_runs_deleted = sqlx::query("DELETE FROM benchmark_runs WHERE created_at < $1")
        .bind(benchmark_cutoff)
        .execute(&mut *transaction)
        .await
        .context("failed to delete old benchmark runs")?
        .rows_affected();

    let lighthouse_scans_deleted =
        sqlx::query("DELETE FROM lighthouse_scans WHERE scanned_at < $1")
            .bind(lighthouse_cutoff)
            .execute(&mut *transaction)
            .await
            .context("failed to delete old Lighthouse scans")?
            .rows_affected();

    // Delete old threat intelligence
    let threat_deleted = sqlx::query("DELETE FROM threat_intelligence WHERE timestamp < $1")
        .bind(threat_cutoff)
        .execute(&mut *transaction)
        .await
        .context("failed to delete old threat intelligence")?
        .rows_affected();

    transaction
        .commit()
        .await
        .context("failed to commit database cleanup")?;

    info!(
        endpoints = endpoints_deleted,
        probe_observations = probe_observations_deleted,
        audit = audit_deleted,
        cookie = cookie_deleted,
        outbox_published = outbox_published_deleted,
        outbox_dlq = outbox_dlq_deleted,
        hourly = hourly_deleted,
        receipts = receipts_deleted,
        reports = reports_deleted,
        uptime_rollups = uptime_rollups_deleted,
        scheduled_runs = scheduled_runs_deleted,
        search_queries = search_queries_deleted,
        honeypot_interactions = honeypot_interactions_deleted,
        benchmark_runs = benchmark_runs_deleted,
        lighthouse_scans = lighthouse_scans_deleted,
        threat = threat_deleted,
        "db_cleanup completed"
    );

    Ok(())
}

async fn ensure_raw_analytics_coverage(pool: &PgPool, cutoff: chrono::DateTime<Utc>) -> Result<()> {
    let missing_bucket = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS (
            WITH raw_buckets AS (
                SELECT
                    endpoints.user_id,
                    endpoints.is_platform,
                    date_trunc('hour', endpoints.last_tested AT TIME ZONE 'UTC')
                      AT TIME ZONE 'UTC' AS bucket_start
                FROM endpoints
                WHERE endpoints.last_tested >= $1 - INTERVAL '1 day'
                  AND endpoints.last_tested < $1
                  AND (
                    (endpoints.is_platform = true AND endpoints.user_id IS NULL)
                    OR (
                      endpoints.is_platform = false
                      AND endpoints.user_id IS NOT NULL
                      AND EXISTS (
                        SELECT 1 FROM user_profiles
                        WHERE user_profiles.user_id = endpoints.user_id
                      )
                    )
                  )
                GROUP BY endpoints.user_id, endpoints.is_platform, bucket_start
                UNION
                SELECT
                    cookie_consents.user_id,
                    cookie_consents.is_platform,
                    date_trunc('hour', cookie_consents.created_at AT TIME ZONE 'UTC')
                      AT TIME ZONE 'UTC' AS bucket_start
                FROM cookie_consents
                WHERE cookie_consents.created_at >= $1 - INTERVAL '1 day'
                  AND cookie_consents.created_at < $1
                  AND (
                    (cookie_consents.is_platform = true AND cookie_consents.user_id IS NULL)
                    OR (
                      cookie_consents.is_platform = false
                      AND cookie_consents.user_id IS NOT NULL
                      AND EXISTS (
                        SELECT 1 FROM user_profiles
                        WHERE user_profiles.user_id = cookie_consents.user_id
                      )
                    )
                  )
                GROUP BY cookie_consents.user_id, cookie_consents.is_platform, bucket_start
            )
            SELECT 1
            FROM raw_buckets
            LEFT JOIN aggregated_analytics AS analytics
             ON analytics.bucket_size = '1h'
             AND analytics.timestamp = raw_buckets.bucket_start
             AND COALESCE(analytics.metadata->>'aggregation_version', '0') = '2'
             AND analytics.is_platform = raw_buckets.is_platform
             AND analytics.user_id IS NOT DISTINCT FROM raw_buckets.user_id
            WHERE analytics.id IS NULL
            LIMIT 1
        )
        "#,
    )
    .bind(cutoff)
    .fetch_one(pool)
    .await
    .context("failed to verify raw analytics aggregate coverage")?;
    if missing_bucket {
        bail!("one or more retained raw analytics hours do not have an AggregatedAnalytics bucket");
    }
    Ok(())
}

/// Runs VACUUM ANALYZE on all tables to optimize storage and query performance.
#[tracing::instrument(name = "optimize_database", skip_all)]
pub async fn run_optimize_database(pool: &PgPool) -> Result<()> {
    let mut failures = Vec::new();
    for table in OPTIMIZE_TABLES {
        match sqlx::query(&format!("VACUUM ANALYZE {}", table))
            .execute(pool)
            .await
        {
            Ok(_) => info!("VACUUM ANALYZE completed for {}", table),
            Err(error) => {
                warn!(%table, %error, "VACUUM ANALYZE failed");
                failures.push(format!("{table}: {error}"));
            }
        }
    }

    if failures.is_empty() {
        Ok(())
    } else {
        bail!(
            "VACUUM ANALYZE failed for {} table(s): {}",
            failures.len(),
            failures.join("; ")
        )
    }
}

/// Repairs the last 30 completed UTC days of account reports and status-page uptime.
#[tracing::instrument(name = "archive_reports", skip_all)]
pub async fn run_archive_reports(pool: &PgPool) -> Result<()> {
    let mut transaction = pool
        .begin()
        .await
        .context("failed to begin report archive transaction")?;

    let user_archived = sqlx::query(
        r#"
        WITH hourly AS (
            SELECT
                user_id, total_requests, avg_latency_ms, p99_latency_ms,
                error_rate_percent, threats_detected, active_incidents,
                unique_visitors, updated_at,
                (timestamp AT TIME ZONE 'UTC')::date AS report_date
            FROM aggregated_analytics
            WHERE bucket_size = '1h'
              AND is_platform = false
              AND user_id IS NOT NULL
              AND timestamp >= (date_trunc('day', NOW() AT TIME ZONE 'UTC')
                                - make_interval(days => $1)) AT TIME ZONE 'UTC'
              AND timestamp < date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
        ),
        daily AS (
            SELECT
                user_id,
                report_date,
                SUM(total_requests) AS total_requests,
                CASE WHEN SUM(total_requests) > 0
                    THEN SUM(avg_latency_ms * total_requests) / SUM(total_requests)
                    ELSE 0 END AS avg_latency_ms,
                MAX(p99_latency_ms) AS p99_latency_ms,
                CASE WHEN SUM(total_requests) > 0
                    THEN SUM(error_rate_percent * total_requests) / SUM(total_requests)
                    ELSE 0 END AS error_rate_percent,
                SUM(threats_detected) AS threats_detected,
                MAX(active_incidents) AS active_incidents,
                MAX(unique_visitors) AS unique_visitors,
                COUNT(*) AS hourly_bucket_count,
                MAX(updated_at) AS source_max_updated_at
            FROM hourly
            GROUP BY user_id, report_date
        ),
        vulnerability_daily AS (
            SELECT
                user_id,
                (created_at AT TIME ZONE 'UTC')::date AS report_date,
                COUNT(*)::integer AS total_vulnerabilities
            FROM vulnerabilities
            WHERE user_id IS NOT NULL
              AND created_at >= (date_trunc('day', NOW() AT TIME ZONE 'UTC')
                                 - make_interval(days => $1)) AT TIME ZONE 'UTC'
              AND created_at < date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
            GROUP BY user_id, (created_at AT TIME ZONE 'UTC')::date
        )
        INSERT INTO report_archives (
            id, user_id, is_platform, report_date, period_start, period_end,
            total_requests, avg_latency_ms, p99_latency_ms, error_rate_percent,
            threats_detected, active_incidents, unique_visitors,
            total_vulnerabilities, summary_json, created_at
        )
        SELECT
            md5(
                COALESCE(daily.user_id, vulnerability_daily.user_id)::text || ':' ||
                COALESCE(daily.report_date, vulnerability_daily.report_date)::text
            )::uuid,
            COALESCE(daily.user_id, vulnerability_daily.user_id), false,
            COALESCE(daily.report_date, vulnerability_daily.report_date),
            COALESCE(daily.report_date, vulnerability_daily.report_date)::timestamp
                AT TIME ZONE 'UTC',
            (COALESCE(daily.report_date, vulnerability_daily.report_date) + 1)::timestamp
                AT TIME ZONE 'UTC',
            COALESCE(daily.total_requests, 0),
            COALESCE(daily.avg_latency_ms, 0),
            COALESCE(daily.p99_latency_ms, 0),
            COALESCE(daily.error_rate_percent, 0),
            COALESCE(daily.threats_detected, 0),
            COALESCE(daily.active_incidents, 0),
            COALESCE(daily.unique_visitors, 0),
            COALESCE(vulnerability_daily.total_vulnerabilities, 0),
            jsonb_build_object(
                'aggregation_version', 2,
                'hourly_bucket_count', COALESCE(daily.hourly_bucket_count, 0),
                'source_max_updated_at', daily.source_max_updated_at
            ),
            NOW()
        FROM daily
        FULL OUTER JOIN vulnerability_daily
          ON vulnerability_daily.user_id = daily.user_id
         AND vulnerability_daily.report_date = daily.report_date
        ON CONFLICT (user_id, report_date) WHERE is_platform = false DO UPDATE SET
            period_start = EXCLUDED.period_start,
            period_end = EXCLUDED.period_end,
            total_requests = EXCLUDED.total_requests,
            avg_latency_ms = EXCLUDED.avg_latency_ms,
            p99_latency_ms = EXCLUDED.p99_latency_ms,
            error_rate_percent = EXCLUDED.error_rate_percent,
            threats_detected = EXCLUDED.threats_detected,
            active_incidents = EXCLUDED.active_incidents,
            unique_visitors = EXCLUDED.unique_visitors,
            total_vulnerabilities = EXCLUDED.total_vulnerabilities,
            summary_json = EXCLUDED.summary_json
        "#,
    )
    .bind(ROLLUP_REPAIR_DAYS)
    .execute(&mut *transaction)
    .await
    .context("failed to archive user report rollups")?
    .rows_affected();

    let platform_archived = sqlx::query(
        r#"
        WITH hourly AS (
            SELECT
                total_requests, avg_latency_ms, p99_latency_ms,
                error_rate_percent, threats_detected, active_incidents,
                unique_visitors, updated_at,
                (timestamp AT TIME ZONE 'UTC')::date AS report_date
            FROM aggregated_analytics
            WHERE bucket_size = '1h'
              AND is_platform = true
              AND timestamp >= (date_trunc('day', NOW() AT TIME ZONE 'UTC')
                                - make_interval(days => $1)) AT TIME ZONE 'UTC'
              AND timestamp < date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
        ),
        daily AS (
            SELECT
                report_date,
                SUM(total_requests) AS total_requests,
                CASE WHEN SUM(total_requests) > 0
                    THEN SUM(avg_latency_ms * total_requests) / SUM(total_requests)
                    ELSE 0 END AS avg_latency_ms,
                MAX(p99_latency_ms) AS p99_latency_ms,
                CASE WHEN SUM(total_requests) > 0
                    THEN SUM(error_rate_percent * total_requests) / SUM(total_requests)
                    ELSE 0 END AS error_rate_percent,
                SUM(threats_detected) AS threats_detected,
                MAX(active_incidents) AS active_incidents,
                MAX(unique_visitors) AS unique_visitors,
                COUNT(*) AS hourly_bucket_count,
                MAX(updated_at) AS source_max_updated_at
            FROM hourly
            GROUP BY report_date
        ),
        vulnerability_daily AS (
            SELECT
                (created_at AT TIME ZONE 'UTC')::date AS report_date,
                COUNT(*)::integer AS total_vulnerabilities
            FROM vulnerabilities
            WHERE user_id IS NULL
              AND created_at >= (date_trunc('day', NOW() AT TIME ZONE 'UTC')
                                 - make_interval(days => $1)) AT TIME ZONE 'UTC'
              AND created_at < date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
            GROUP BY (created_at AT TIME ZONE 'UTC')::date
        )
        INSERT INTO report_archives (
            id, user_id, is_platform, report_date, period_start, period_end,
            total_requests, avg_latency_ms, p99_latency_ms, error_rate_percent,
            threats_detected, active_incidents, unique_visitors,
            total_vulnerabilities, summary_json, created_at
        )
        SELECT
            md5(
                'platform:' ||
                COALESCE(daily.report_date, vulnerability_daily.report_date)::text
            )::uuid,
            NULL, true, COALESCE(daily.report_date, vulnerability_daily.report_date),
            COALESCE(daily.report_date, vulnerability_daily.report_date)::timestamp
                AT TIME ZONE 'UTC',
            (COALESCE(daily.report_date, vulnerability_daily.report_date) + 1)::timestamp
                AT TIME ZONE 'UTC',
            COALESCE(daily.total_requests, 0),
            COALESCE(daily.avg_latency_ms, 0),
            COALESCE(daily.p99_latency_ms, 0),
            COALESCE(daily.error_rate_percent, 0),
            COALESCE(daily.threats_detected, 0),
            COALESCE(daily.active_incidents, 0),
            COALESCE(daily.unique_visitors, 0),
            COALESCE(vulnerability_daily.total_vulnerabilities, 0),
            jsonb_build_object(
                'aggregation_version', 2,
                'hourly_bucket_count', COALESCE(daily.hourly_bucket_count, 0),
                'source_max_updated_at', daily.source_max_updated_at
            ),
            NOW()
        FROM daily
        FULL OUTER JOIN vulnerability_daily
          ON vulnerability_daily.report_date = daily.report_date
        ON CONFLICT (report_date) WHERE is_platform = true DO UPDATE SET
            period_start = EXCLUDED.period_start,
            period_end = EXCLUDED.period_end,
            total_requests = EXCLUDED.total_requests,
            avg_latency_ms = EXCLUDED.avg_latency_ms,
            p99_latency_ms = EXCLUDED.p99_latency_ms,
            error_rate_percent = EXCLUDED.error_rate_percent,
            threats_detected = EXCLUDED.threats_detected,
            active_incidents = EXCLUDED.active_incidents,
            unique_visitors = EXCLUDED.unique_visitors,
            total_vulnerabilities = EXCLUDED.total_vulnerabilities,
            summary_json = EXCLUDED.summary_json
        "#,
    )
    .bind(ROLLUP_REPAIR_DAYS)
    .execute(&mut *transaction)
    .await
    .context("failed to archive Tenant0 report rollups")?
    .rows_affected();

    let uptime_archived = sqlx::query(
        r#"
        WITH report_dates AS (
            SELECT generate_series(
                (NOW() AT TIME ZONE 'UTC')::date - $1,
                (NOW() AT TIME ZONE 'UTC')::date - 1,
                INTERVAL '1 day'
            )::date AS report_date
        ),
        page_days AS (
            SELECT
                pages.id AS status_page_id,
                pages.user_id,
                (pages.is_platform OR pages.slug = 'platform-status') AS is_platform,
                report_dates.report_date
            FROM status_pages AS pages
            CROSS JOIN report_dates
            WHERE (pages.created_at AT TIME ZONE 'UTC')::date <= report_dates.report_date
        ),
        probe_daily AS (
            SELECT
                page_days.status_page_id,
                page_days.report_date,
                COUNT(observations.id)::bigint AS total_checks,
                COUNT(observations.id) FILTER (
                    WHERE observations.is_active = true
                      AND observations.status_code < 500
                )::bigint AS successful_checks
            FROM page_days
            LEFT JOIN monitored_services AS services
              ON services.status_page_id = page_days.status_page_id
            LEFT JOIN health_probe_observations AS observations
              ON observations.monitored_service_id = services.id
             AND observations.observed_at >=
                 page_days.report_date::timestamp AT TIME ZONE 'UTC'
             AND observations.observed_at <
                 (page_days.report_date + 1)::timestamp AT TIME ZONE 'UTC'
            GROUP BY
                page_days.status_page_id,
                page_days.report_date
        ),
        legacy_daily AS (
            SELECT
                page_days.status_page_id,
                page_days.report_date,
                COUNT(endpoints.id)::bigint AS total_checks,
                COUNT(endpoints.id) FILTER (
                    WHERE endpoints.is_active = true
                      AND endpoints.status_code < 500
                )::bigint AS successful_checks
            FROM page_days
            JOIN monitored_services AS services
              ON services.status_page_id = page_days.status_page_id
            JOIN endpoints
              ON rtrim(endpoints.url, '/') = rtrim(services.url, '/')
             AND endpoints.status_code <> 0
             AND endpoints.last_tested >=
                 page_days.report_date::timestamp AT TIME ZONE 'UTC'
             AND endpoints.last_tested <
                 (page_days.report_date + 1)::timestamp AT TIME ZONE 'UTC'
             AND (
                 (page_days.is_platform = true
                  AND endpoints.is_platform = true
                  AND endpoints.user_id IS NULL)
                 OR
                 (page_days.is_platform = false
                  AND endpoints.is_platform = false
                  AND endpoints.user_id = page_days.user_id)
             )
            GROUP BY page_days.status_page_id, page_days.report_date
        ),
        daily AS (
            SELECT
                page_days.status_page_id,
                page_days.user_id,
                page_days.is_platform,
                page_days.report_date,
                CASE WHEN COALESCE(probe_daily.total_checks, 0) > 0
                    THEN probe_daily.total_checks
                    ELSE COALESCE(legacy_daily.total_checks, 0)
                END AS total_checks,
                CASE WHEN COALESCE(probe_daily.total_checks, 0) > 0
                    THEN probe_daily.successful_checks
                    ELSE COALESCE(legacy_daily.successful_checks, 0)
                END AS successful_checks
            FROM page_days
            LEFT JOIN probe_daily
              ON probe_daily.status_page_id = page_days.status_page_id
             AND probe_daily.report_date = page_days.report_date
            LEFT JOIN legacy_daily
              ON legacy_daily.status_page_id = page_days.status_page_id
             AND legacy_daily.report_date = page_days.report_date
        )
        INSERT INTO status_page_uptime_daily (
            id, status_page_id, user_id, is_platform, report_date,
            total_checks, successful_checks, uptime_percent,
            created_at, updated_at
        )
        SELECT
            md5(status_page_id::text || ':' || report_date::text)::uuid,
            status_page_id, user_id, is_platform, report_date,
            total_checks, successful_checks,
            CASE WHEN total_checks > 0
                THEN ROUND((successful_checks::numeric * 100) / total_checks, 2)::double precision
                ELSE 100.0 END,
            NOW(), NOW()
        FROM daily
        ON CONFLICT (status_page_id, report_date) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            is_platform = EXCLUDED.is_platform,
            total_checks = EXCLUDED.total_checks,
            successful_checks = EXCLUDED.successful_checks,
            uptime_percent = EXCLUDED.uptime_percent,
            updated_at = NOW()
        "#,
    )
    .bind(ROLLUP_REPAIR_DAYS)
    .execute(&mut *transaction)
    .await
    .context("failed to archive status-page uptime rollups")?
    .rows_affected();

    transaction
        .commit()
        .await
        .context("failed to commit report archives")?;

    info!(
        user_archived,
        platform_archived,
        uptime_archived,
        repair_days = ROLLUP_REPAIR_DAYS,
        "repaired daily report and uptime records"
    );
    Ok(())
}

#[derive(Debug, Serialize, sqlx::FromRow)]
struct AuditArchiveRow {
    #[serde(skip_serializing)]
    postgres_id: String,
    audit_id: String,
    timestamp: String,
    action: String,
    resource_id: String,
    user_id: i64,
    ip_address: String,
    user_agent: String,
    details_json: String,
}

async fn archive_and_delete_audit_logs(
    pool: &PgPool,
    clickhouse_url: &str,
    cutoff: chrono::DateTime<Utc>,
) -> Result<u64> {
    let client = Client::new();
    let endpoint = ClickHouseEndpoint::parse(clickhouse_url)?;
    ensure_clickhouse_retention_tables(&client, &endpoint).await?;

    let mut archived = 0_u64;
    loop {
        let rows = sqlx::query_as::<_, AuditArchiveRow>(
            r#"
            SELECT
                id::text AS postgres_id,
                id::text AS audit_id,
                to_char(timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS.US') AS timestamp,
                action,
                COALESCE(resource_id, '') AS resource_id,
                COALESCE(user_id, 0)::bigint AS user_id,
                COALESCE(ip_address::text, '') AS ip_address,
                COALESCE(user_agent, '') AS user_agent,
                COALESCE(details, '{}'::jsonb)::text AS details_json
            FROM audit_logs
            WHERE timestamp < $1
            ORDER BY timestamp, id
            LIMIT $2
            "#,
        )
        .bind(cutoff)
        .bind(AUDIT_ARCHIVE_BATCH_SIZE)
        .fetch_all(pool)
        .await
        .context("failed to read stale audit-log batch")?;
        if rows.is_empty() {
            break;
        }

        let payload = rows
            .iter()
            .map(serde_json::to_string)
            .collect::<std::result::Result<Vec<_>, _>>()
            .context("failed to serialize audit-log archive batch")?
            .join("\n");
        execute_clickhouse_query(
            &client,
            &endpoint,
            "INSERT INTO audit_archive FORMAT JSONEachRow",
            Some(payload),
            "audit archive insert",
        )
        .await?;

        let ids = rows
            .iter()
            .map(|row| row.postgres_id.clone())
            .collect::<Vec<_>>();
        let deleted = sqlx::query("DELETE FROM audit_logs WHERE id::text = ANY($1::text[])")
            .bind(&ids)
            .execute(pool)
            .await
            .context("audit batch archived but PostgreSQL acknowledgement delete failed")?
            .rows_affected();
        if deleted != ids.len() as u64 {
            bail!(
                "audit archive acknowledgement mismatch: archived {} rows but deleted {}",
                ids.len(),
                deleted
            );
        }
        archived += deleted;
    }

    info!(archived, "archived stale audit logs to ClickHouse");
    Ok(archived)
}

/// Purges old data from ClickHouse archival storage via HTTP interface.
#[tracing::instrument(name = "cleanup_clickhouse", skip_all)]
pub async fn run_cleanup_clickhouse(clickhouse_url: &str) -> Result<()> {
    let client = Client::new();
    let endpoint = ClickHouseEndpoint::parse(clickhouse_url)?;
    ensure_clickhouse_retention_tables(&client, &endpoint).await?;

    let audit_cutoff = (Utc::now()
        - chrono::Duration::days(CH_AUDIT_ARCHIVE_RETENTION_DAYS as i64))
    .format("%Y-%m-%d")
    .to_string();
    execute_clickhouse_delete(&client, &endpoint, "audit_archive", &audit_cutoff).await?;

    let security_cutoff = (Utc::now()
        - chrono::Duration::days(CH_SECURITY_EVENTS_RETENTION_DAYS as i64))
    .format("%Y-%m-%d")
    .to_string();
    execute_clickhouse_delete(&client, &endpoint, "security_events", &security_cutoff).await?;

    let vuln_cutoff = (Utc::now() - chrono::Duration::days(CH_TELEMETRY_RETENTION_DAYS as i64))
        .format("%Y-%m-%d")
        .to_string();
    execute_clickhouse_delete(
        &client,
        &endpoint,
        "asset_vulnerability_ledger",
        &vuln_cutoff,
    )
    .await?;

    info!("ClickHouse cleanup completed");
    Ok(())
}

#[derive(Debug)]
struct ClickHouseEndpoint {
    url: Url,
    database: Option<String>,
    username: Option<String>,
    password: Option<String>,
}

impl ClickHouseEndpoint {
    fn parse(raw: &str) -> Result<Self> {
        let parsed = Url::parse(raw).context("CLICKHOUSE_URL is invalid")?;
        let original_scheme = parsed.scheme().to_owned();
        let normalized = match original_scheme.as_str() {
            "clickhouse" => raw.replacen("clickhouse://", "http://", 1),
            "clickhouses" => raw.replacen("clickhouses://", "https://", 1),
            "http" | "https" => raw.to_owned(),
            _ => bail!("CLICKHOUSE_URL must use clickhouse, clickhouses, http, or https"),
        };
        let mut url = Url::parse(&normalized).context("CLICKHOUSE_URL is invalid")?;
        match original_scheme.as_str() {
            "clickhouse" => {
                if url.port().is_none() || url.port() == Some(9000) {
                    url.set_port(Some(8123))
                        .map_err(|_| anyhow::anyhow!("failed to set ClickHouse HTTP port"))?;
                }
            }
            "clickhouses" => {
                if url.port().is_none() || url.port() == Some(9440) {
                    url.set_port(Some(8443))
                        .map_err(|_| anyhow::anyhow!("failed to set ClickHouse HTTPS port"))?;
                }
            }
            "http" | "https" => {}
            _ => unreachable!("unsupported schemes return before normalization"),
        }

        let database_from_query = url
            .query_pairs()
            .find(|(name, _)| name == "database")
            .map(|(_, value)| value.into_owned());
        let database_from_path = url
            .path()
            .trim_matches('/')
            .split('/')
            .find(|segment| !segment.is_empty())
            .map(str::to_owned);
        let database = database_from_query.or(database_from_path);
        let username = (!url.username().is_empty()).then(|| url.username().to_owned());
        let password = url.password().map(str::to_owned);

        url.set_username("")
            .map_err(|_| anyhow::anyhow!("failed to normalize ClickHouse username"))?;
        url.set_password(None)
            .map_err(|_| anyhow::anyhow!("failed to normalize ClickHouse password"))?;
        url.set_path("/");
        url.set_query(None);
        url.set_fragment(None);

        Ok(Self {
            url,
            database,
            username,
            password,
        })
    }
}

async fn ensure_clickhouse_retention_tables(
    client: &Client,
    endpoint: &ClickHouseEndpoint,
) -> Result<()> {
    for statement in CLICKHOUSE_RETENTION_TABLES {
        execute_clickhouse_query(
            client,
            endpoint,
            statement,
            None,
            "ClickHouse retention table initialization",
        )
        .await?;
    }
    for statement in CLICKHOUSE_SCHEMA_UPGRADES {
        execute_clickhouse_query(
            client,
            endpoint,
            statement,
            None,
            "ClickHouse archival schema upgrade",
        )
        .await?;
    }
    Ok(())
}

async fn execute_clickhouse_query(
    client: &Client,
    endpoint: &ClickHouseEndpoint,
    query: &str,
    body: Option<String>,
    operation: &str,
) -> Result<()> {
    let mut request = client.post(endpoint.url.clone()).query(&[
        ("query", query),
        ("default_week_start", "0"),
        ("date_time_input_format", "best_effort"),
        ("input_format_defaults_for_omitted_fields", "1"),
    ]);
    if let Some(database) = endpoint.database.as_deref() {
        request = request.query(&[("database", database)]);
    }
    if let Some(username) = endpoint.username.as_deref() {
        request = request.basic_auth(username, endpoint.password.as_deref());
    }
    if let Some(payload) = body {
        request = request
            .header("content-type", "application/x-ndjson")
            .body(payload);
    }

    let response = request
        .send()
        .await
        .with_context(|| format!("{operation} request failed"))?;
    let status = response.status();
    if !status.is_success() {
        let response_body = response.text().await.unwrap_or_default();
        bail!(
            "{operation} returned {status}: {}",
            response_body.chars().take(500).collect::<String>()
        );
    }
    Ok(())
}

async fn execute_clickhouse_delete(
    client: &Client,
    endpoint: &ClickHouseEndpoint,
    table: &str,
    cutoff: &str,
) -> Result<()> {
    let query = format!("DELETE FROM {table} WHERE timestamp < '{cutoff}'");
    execute_clickhouse_query(client, endpoint, &query, None, &format!("{table} cleanup")).await?;
    info!(%table, %cutoff, "ClickHouse retention delete accepted");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{ClickHouseEndpoint, OPTIMIZE_TABLES};

    #[test]
    fn normalizes_native_clickhouse_url_for_http_cleanup() {
        let authenticated_url = [
            "clickhouse",
            "://",
            "analytics",
            ":",
            "test-password",
            "@clickhouse.internal:9000/otel",
        ]
        .concat();
        let endpoint = ClickHouseEndpoint::parse(&authenticated_url).expect("URL should parse");

        assert_eq!(endpoint.url.as_str(), "http://clickhouse.internal:8123/");
        assert_eq!(endpoint.database.as_deref(), Some("otel"));
        assert_eq!(endpoint.username.as_deref(), Some("analytics"));
        assert_eq!(endpoint.password.as_deref(), Some("test-password"));
    }

    #[test]
    fn optimization_uses_real_django_table_names() {
        assert!(OPTIMIZE_TABLES.contains(&"audit_logs"));
        assert!(OPTIMIZE_TABLES.contains(&"cookie_consents"));
        assert!(OPTIMIZE_TABLES.contains(&"monitor_outboxevent"));
        assert!(OPTIMIZE_TABLES.contains(&"lighthouse_scans"));
        assert!(!OPTIMIZE_TABLES.contains(&"audit_log"));
        assert!(!OPTIMIZE_TABLES.contains(&"cookie_consent"));
        assert!(!OPTIMIZE_TABLES.contains(&"outbox_events"));
    }
}
