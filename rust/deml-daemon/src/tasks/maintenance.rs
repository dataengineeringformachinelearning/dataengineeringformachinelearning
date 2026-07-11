//! Database maintenance operations migrated from Python workers.
//!
//! Tasks: db_cleanup, optimize_database, archive_reports, cleanup_clickhouse
//! These are pure Postgres/ClickHouse operations that don't need Python's ORM.

use anyhow::{Context, Result};
use chrono::Utc;
use reqwest::Client;
use sqlx::PgPool;
use tracing::{info, warn};

/// ClickHouse retention constants matching backend/utils/retention.py
const CH_AUDIT_ARCHIVE_RETENTION_DAYS: i32 = 180;
const CH_SECURITY_EVENTS_RETENTION_DAYS: i32 = 365;
const CH_TELEMETRY_RETENTION_DAYS: i32 = 730;

/// Retention constants matching backend/utils/retention.py
const RAW_TELEMETRY_RETENTION_DAYS: i32 = 30;
const OUTBOX_PUBLISHED_RETENTION_DAYS: i32 = 30;
const OUTBOX_DLQ_RETENTION_DAYS: i32 = 7;
const THREAT_INTELLIGENCE_RETENTION_DAYS: i32 = 90;

/// Runs database cleanup: deletes old telemetry, audit logs, and outbox events.
#[tracing::instrument(name = "db_cleanup", skip_all)]
pub async fn run_db_cleanup(pool: &PgPool) -> Result<()> {

    let cutoff = Utc::now() - chrono::Duration::days(RAW_TELEMETRY_RETENTION_DAYS as i64);
    let outbox_cutoff = Utc::now() - chrono::Duration::days(OUTBOX_PUBLISHED_RETENTION_DAYS as i64);
    let outbox_dlq_cutoff = Utc::now() - chrono::Duration::days(OUTBOX_DLQ_RETENTION_DAYS as i64);
    let threat_cutoff = Utc::now() - chrono::Duration::days(THREAT_INTELLIGENCE_RETENTION_DAYS as i64);

    // Purge legacy duplicate ThreatIntelligence records (pre-constraint duplicates)
    info!("Removing legacy duplicate ThreatIntelligence records...");
    let dupes: i64 = sqlx::query_scalar(
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
    .fetch_one(pool)
    .await.unwrap_or(0);
    info!("Deleted {} legacy duplicate ThreatIntelligence records", dupes);

    // Delete old endpoints (raw telemetry)
    let endpoints_deleted: i64 = sqlx::query_scalar(
        "DELETE FROM endpoints WHERE last_tested < $1",
    )
    .bind(cutoff)
    .fetch_one(pool)
    .await
    .context("failed to delete old endpoints")?;

    // Delete old audit logs (archived to ClickHouse first by telemetry_worker)
    let audit_deleted: i64 = sqlx::query_scalar(
        "DELETE FROM audit_log WHERE timestamp < $1",
    )
    .bind(cutoff)
    .fetch_one(pool)
    .await
    .context("failed to delete old audit logs")?;

    // Delete old cookie consent records
    let cookie_deleted: i64 = sqlx::query_scalar(
        "DELETE FROM cookie_consent WHERE created_at < $1",
    )
    .bind(cutoff)
    .fetch_one(pool)
    .await
    .context("failed to delete old cookie consent")?;

    // Delete published outbox events
    let outbox_published_deleted: i64 = sqlx::query_scalar(
        "DELETE FROM outbox_events WHERE is_published = true AND published_at < $1",
    )
    .bind(outbox_cutoff)
    .fetch_one(pool)
    .await
    .context("failed to delete published outbox events")?;

    // Delete DLQ outbox events (failed retries)
    let outbox_dlq_deleted: i64 = sqlx::query_scalar(
        "DELETE FROM outbox_events WHERE is_published = false AND attempts >= 5 AND created_at < $1",
    )
    .bind(outbox_dlq_cutoff)
    .fetch_one(pool)
    .await
    .context("failed to delete DLQ outbox events")?;

    // Delete old hourly aggregate analytics (after daily rollups materialized)
    let hourly_deleted: i64 = sqlx::query_scalar(
        "DELETE FROM aggregated_analytics WHERE bucket_size = '1h' AND timestamp < $1",
    )
    .bind(cutoff)
    .fetch_one(pool)
    .await
    .context("failed to delete hourly aggregates")?;

    // Delete old threat intelligence
    let threat_deleted: i64 = sqlx::query_scalar(
        "DELETE FROM threat_intelligence WHERE timestamp < $1",
    )
    .bind(threat_cutoff)
    .fetch_one(pool)
    .await
    .context("failed to delete old threat intelligence")?;

    info!(
        endpoints = endpoints_deleted,
        audit = audit_deleted,
        cookie = cookie_deleted,
        outbox_published = outbox_published_deleted,
        outbox_dlq = outbox_dlq_deleted,
        hourly = hourly_deleted,
        threat = threat_deleted,
        "db_cleanup completed"
    );

    Ok(())
}

/// Runs VACUUM ANALYZE on all tables to optimize storage and query performance.
#[tracing::instrument(name = "optimize_database", skip_all)]
pub async fn run_optimize_database(pool: &PgPool) -> Result<()> {

    // Simple VACUUM ANALYZE on core tables
    let tables = [
        "endpoints",
        "audit_log",
        "cookie_consent",
        "outbox_events",
        "threat_intelligence",
        "status_pages",
        "incidents",
    ];

    for table in &tables {
        match sqlx::query(&format!("VACUUM ANALYZE {}", table))
            .execute(pool)
            .await
        {
            Ok(_) => info!("VACUUM ANALYZE completed for {}", table),
            Err(e) => warn!("VACUUM ANALYZE failed for {}: {}", table, e),
        }
    }

    Ok(())
}

/// Archives hourly analytics into daily rollup materialized view.
#[tracing::instrument(name = "archive_reports", skip_all)]
pub async fn run_archive_reports(pool: &PgPool) -> Result<()> {

    // Insert daily rollups from hourly aggregates
    let archived: i64 = sqlx::query_scalar(
        r#"
        INSERT INTO report_archive (user_id, date, avg_response_time, p95_response_time, p99_response_time, uptime_pct)
        SELECT
            user_id,
            DATE(timestamp) as date,
            AVG(response_time) as avg_response_time,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95_response_time,
            PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time) as p99_response_time,
            AVG(CASE WHEN status_code < 500 THEN 100.0 ELSE 0.0 END) as uptime_pct
        FROM aggregated_analytics
        WHERE bucket_size = '1h'
          AND timestamp >= CURRENT_DATE - INTERVAL '2 days'
          AND timestamp < CURRENT_DATE
        GROUP BY user_id, DATE(timestamp)
        ON CONFLICT (user_id, date) DO UPDATE SET
            avg_response_time = EXCLUDED.avg_response_time,
            p95_response_time = EXCLUDED.p95_response_time,
            p99_response_time = EXCLUDED.p99_response_time,
            uptime_pct = EXCLUDED.uptime_pct
        "#,
    )
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    info!("Archived {} daily report records", archived);
    Ok(())
}

/// Purges old data from ClickHouse archival storage via HTTP interface.
#[tracing::instrument(name = "cleanup_clickhouse", skip_all)]
pub async fn run_cleanup_clickhouse(clickhouse_url: &str) -> Result<()> {

    let client = Client::new();
    // Convert ClickHouse URI to HTTP endpoint
    let http_url = clickhouse_url
        .replace("clickhouse://", "http://")
        .replace(":9000/", ":8123/")
        .trim_end_matches('/')
        .to_string();

    // Purge audit_archive (180 days retention)
    let audit_cutoff = (Utc::now() - chrono::Duration::days(CH_AUDIT_ARCHIVE_RETENTION_DAYS as i64)).format("%Y-%m-%d");
    let query = format!("DELETE FROM audit_archive WHERE timestamp < '{}'", audit_cutoff);
    match client.post(format!("{}/?query={}&default_week_start=0", http_url, query)).send().await {
        Ok(resp) if resp.status().is_success() => info!("Purged audit_archive before {}", audit_cutoff),
        Ok(resp) => warn!("audit_archive cleanup returned: {}", resp.status()),
        Err(e) => warn!("audit_archive cleanup skipped: {}", e),
    }

    // Purge security_events (365 days retention)
    let security_cutoff = (Utc::now() - chrono::Duration::days(CH_SECURITY_EVENTS_RETENTION_DAYS as i64)).format("%Y-%m-%d");
    let query = format!("DELETE FROM security_events WHERE timestamp < '{}'", security_cutoff);
    match client.post(format!("{}/?query={}&default_week_start=0", http_url, query)).send().await {
        Ok(resp) if resp.status().is_success() => info!("Purged security_events before {}", security_cutoff),
        Ok(resp) => warn!("security_events cleanup returned: {}", resp.status()),
        Err(e) => warn!("security_events cleanup skipped: {}", e),
    }

    // Purge asset_vulnerability_ledger (730 days)
    let vuln_cutoff = (Utc::now() - chrono::Duration::days(CH_TELEMETRY_RETENTION_DAYS as i64)).format("%Y-%m-%d");
    let query = format!("DELETE FROM asset_vulnerability_ledger WHERE timestamp < '{}'", vuln_cutoff);
    match client.post(format!("{}/?query={}&default_week_start=0", http_url, query)).send().await {
        Ok(resp) if resp.status().is_success() => info!("Purged asset_vulnerability_ledger before {}", vuln_cutoff),
        Ok(resp) => warn!("asset_vulnerability_ledger cleanup returned: {}", resp.status()),
        Err(e) => warn!("asset_vulnerability_ledger cleanup skipped: {}", e),
    }

    info!("ClickHouse cleanup completed");
    Ok(())
}