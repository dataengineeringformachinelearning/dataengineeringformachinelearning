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
    let threat_cutoff =
        Utc::now() - chrono::Duration::days(THREAT_INTELLIGENCE_RETENTION_DAYS as i64);

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
    .execute(pool)
    .await
    .map(|result| result.rows_affected())
    .unwrap_or(0);
    info!(
        "Deleted {} legacy duplicate ThreatIntelligence records",
        dupes
    );

    // Delete old endpoints (raw telemetry)
    let endpoints_deleted = sqlx::query("DELETE FROM endpoints WHERE last_tested < $1")
        .bind(cutoff)
        .execute(pool)
        .await
        .context("failed to delete old endpoints")?
        .rows_affected();

    // Delete old audit logs (archived to ClickHouse first by telemetry_worker)
    let audit_deleted = sqlx::query("DELETE FROM audit_logs WHERE timestamp < $1")
        .bind(cutoff)
        .execute(pool)
        .await
        .context("failed to delete old audit logs")?
        .rows_affected();

    // Delete old cookie consent records
    let cookie_deleted = sqlx::query("DELETE FROM cookie_consents WHERE created_at < $1")
        .bind(cutoff)
        .execute(pool)
        .await
        .context("failed to delete old cookie consent")?
        .rows_affected();

    // Delete published outbox events
    let outbox_published_deleted = sqlx::query(
        "DELETE FROM monitor_outboxevent WHERE is_published = true AND published_at < $1",
    )
    .bind(outbox_cutoff)
    .execute(pool)
    .await
    .context("failed to delete published outbox events")?
    .rows_affected();

    // Delete DLQ outbox events (failed retries)
    let outbox_dlq_deleted = sqlx::query(
        "DELETE FROM monitor_outboxevent WHERE is_published = false AND attempts >= 5 AND created_at < $1",
    )
    .bind(outbox_dlq_cutoff)
    .execute(pool)
    .await
    .context("failed to delete DLQ outbox events")?
    .rows_affected();

    // Delete old hourly aggregate analytics (after daily rollups materialized)
    let hourly_deleted =
        sqlx::query("DELETE FROM aggregated_analytics WHERE bucket_size = '1h' AND timestamp < $1")
            .bind(cutoff)
            .execute(pool)
            .await
            .context("failed to delete hourly aggregates")?
            .rows_affected();

    // Delete old threat intelligence
    let threat_deleted = sqlx::query("DELETE FROM threat_intelligence WHERE timestamp < $1")
        .bind(threat_cutoff)
        .execute(pool)
        .await
        .context("failed to delete old threat intelligence")?
        .rows_affected();

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

/// Archives yesterday's hourly analytics into symmetrical user and Tenant0 rollups.
#[tracing::instrument(name = "archive_reports", skip_all)]
pub async fn run_archive_reports(pool: &PgPool) -> Result<()> {
    let user_archived = sqlx::query(
        r#"
        INSERT INTO report_archives (
            id, user_id, is_platform, report_date, period_start, period_end,
            total_requests, avg_latency_ms, p99_latency_ms, error_rate_percent,
            threats_detected, active_incidents, unique_visitors,
            total_vulnerabilities, summary_json, created_at
        )
        SELECT
            md5(user_id::text || DATE(timestamp)::text)::uuid,
            user_id, false, DATE(timestamp), DATE(timestamp), DATE(timestamp) + INTERVAL '1 day',
            SUM(total_requests),
            CASE WHEN SUM(total_requests) > 0
                THEN SUM(avg_latency_ms * total_requests) / SUM(total_requests)
                ELSE 0 END,
            MAX(p99_latency_ms),
            CASE WHEN SUM(total_requests) > 0
                THEN SUM(error_rate_percent * total_requests) / SUM(total_requests)
                ELSE 0 END,
            SUM(threats_detected), MAX(active_incidents), MAX(unique_visitors),
            0, jsonb_build_object('hourly_bucket_count', COUNT(*)), NOW()
        FROM aggregated_analytics
        WHERE bucket_size = '1h'
          AND is_platform = false
          AND user_id IS NOT NULL
          AND timestamp >= CURRENT_DATE - INTERVAL '2 days'
          AND timestamp < CURRENT_DATE
        GROUP BY user_id, DATE(timestamp)
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
            summary_json = EXCLUDED.summary_json
        "#,
    )
    .execute(pool)
    .await
    .context("failed to archive user report rollups")?
    .rows_affected();

    let platform_archived = sqlx::query(
        r#"
        INSERT INTO report_archives (
            id, user_id, is_platform, report_date, period_start, period_end,
            total_requests, avg_latency_ms, p99_latency_ms, error_rate_percent,
            threats_detected, active_incidents, unique_visitors,
            total_vulnerabilities, summary_json, created_at
        )
        SELECT
            md5('platform:' || DATE(timestamp)::text)::uuid,
            NULL, true, DATE(timestamp), DATE(timestamp), DATE(timestamp) + INTERVAL '1 day',
            SUM(total_requests),
            CASE WHEN SUM(total_requests) > 0
                THEN SUM(avg_latency_ms * total_requests) / SUM(total_requests)
                ELSE 0 END,
            MAX(p99_latency_ms),
            CASE WHEN SUM(total_requests) > 0
                THEN SUM(error_rate_percent * total_requests) / SUM(total_requests)
                ELSE 0 END,
            SUM(threats_detected), MAX(active_incidents), MAX(unique_visitors),
            0, jsonb_build_object('hourly_bucket_count', COUNT(*)), NOW()
        FROM aggregated_analytics
        WHERE bucket_size = '1h'
          AND is_platform = true
          AND timestamp >= CURRENT_DATE - INTERVAL '2 days'
          AND timestamp < CURRENT_DATE
        GROUP BY DATE(timestamp)
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
            summary_json = EXCLUDED.summary_json
        "#,
    )
    .execute(pool)
    .await
    .context("failed to archive Tenant0 report rollups")?
    .rows_affected();

    info!(
        user_archived,
        platform_archived, "archived daily report records"
    );
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
    let audit_cutoff = (Utc::now()
        - chrono::Duration::days(CH_AUDIT_ARCHIVE_RETENTION_DAYS as i64))
    .format("%Y-%m-%d");
    let query = format!(
        "DELETE FROM audit_archive WHERE timestamp < '{}'",
        audit_cutoff
    );
    match client
        .post(format!(
            "{}/?query={}&default_week_start=0",
            http_url, query
        ))
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => {
            info!("Purged audit_archive before {}", audit_cutoff)
        }
        Ok(resp) => warn!("audit_archive cleanup returned: {}", resp.status()),
        Err(e) => warn!("audit_archive cleanup skipped: {}", e),
    }

    // Purge security_events (365 days retention)
    let security_cutoff = (Utc::now()
        - chrono::Duration::days(CH_SECURITY_EVENTS_RETENTION_DAYS as i64))
    .format("%Y-%m-%d");
    let query = format!(
        "DELETE FROM security_events WHERE timestamp < '{}'",
        security_cutoff
    );
    match client
        .post(format!(
            "{}/?query={}&default_week_start=0",
            http_url, query
        ))
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => {
            info!("Purged security_events before {}", security_cutoff)
        }
        Ok(resp) => warn!("security_events cleanup returned: {}", resp.status()),
        Err(e) => warn!("security_events cleanup skipped: {}", e),
    }

    // Purge asset_vulnerability_ledger (730 days)
    let vuln_cutoff = (Utc::now() - chrono::Duration::days(CH_TELEMETRY_RETENTION_DAYS as i64))
        .format("%Y-%m-%d");
    let query = format!(
        "DELETE FROM asset_vulnerability_ledger WHERE timestamp < '{}'",
        vuln_cutoff
    );
    match client
        .post(format!(
            "{}/?query={}&default_week_start=0",
            http_url, query
        ))
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => {
            info!("Purged asset_vulnerability_ledger before {}", vuln_cutoff)
        }
        Ok(resp) => warn!(
            "asset_vulnerability_ledger cleanup returned: {}",
            resp.status()
        ),
        Err(e) => warn!("asset_vulnerability_ledger cleanup skipped: {}", e),
    }

    info!("ClickHouse cleanup completed");
    Ok(())
}
