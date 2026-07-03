//! Active Health Pinger
//!
//! Fetches all `MonitoredService` rows from Postgres, issues concurrent HTTP
//! HEAD/GET probes (one per service), then POSTs the raw timing data to a
//! Django internal endpoint (`/api/v1/internal/ingest/ping`) which performs the
//! enriched `Endpoints.objects.create()` write via the ORM.
//!
//! This replaces the Python `pingers.active_pinger_scheduler` coroutine — the
//! I/O-bound probe loop moves to Rust (tokio + reqwest), while the
//! Django-coupled enrichment (IP geolocation, UA parsing, scope resolution)
//! stays in Python behind an internal HTTP call.
//!
//! Probe interval: `PINGER_INTERVAL_SECS` (default 30s), matching the Python worker.

use std::time::{Duration, Instant};

use anyhow::Result;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use tracing::{error, info, warn};

use crate::config::Config;

// ── Data shapes ───────────────────────────────────────────────────────────────

/// Minimal row from `monitor_monitoredservice` needed for probing.
#[derive(Debug, sqlx::FromRow)]
struct MonitoredService {
    url: String,
    /// account_id from the related StatusPage.user.profile
    account_id: Option<String>,
    is_platform: bool,
}

/// Payload sent to Django's `/api/v1/internal/ingest/ping` endpoint.
#[derive(Debug, Serialize)]
struct PingResult {
    url: String,
    status_code: u16,
    response_time_ms: u64,
    is_active: bool,
    account_id: Option<String>,
    is_platform: bool,
}

/// Response from the Django internal endpoint (used for logging only).
#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct IngestResponse {
    ok: bool,
    message: Option<String>,
}

// ── Main task ─────────────────────────────────────────────────────────────────

pub async fn run(pool: PgPool, cfg: Config) {
    let interval_secs = cfg.pinger_interval_secs;
    let backend_url = cfg.backend_internal_url.clone();
    let secret = cfg.internal_secret.clone();

    // reqwest client with per-probe timeout.
    // TLS verification is on by default; set HEALTH_PINGER_SKIP_TLS_VERIFY=true in
    // local dev only when probing endpoints with self-signed certificates.
    let mut probe_builder = Client::builder()
        .timeout(Duration::from_secs(8))
        .user_agent("PlatformStatusAutoPinger/2.0 (deml-daemon)");
    if cfg.skip_tls_verify {
        warn!("health_pinger: TLS verification disabled via HEALTH_PINGER_SKIP_TLS_VERIFY — do NOT use in production");
        probe_builder = probe_builder.danger_accept_invalid_certs(true);
    }
    let probe_client = probe_builder
        .build()
        .expect("failed to build probe http client");

    // Separate client for the Django ingest POST (LAN call, short timeout).
    let ingest_client = Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .expect("failed to build ingest http client");

    info!(interval_s = interval_secs, backend = %backend_url, "health_pinger: started");

    loop {
        match tick(&pool, &probe_client, &ingest_client, &backend_url, &secret).await {
            Ok(n) => info!(probed = n, "health_pinger: cycle complete"),
            Err(e) => error!(error = %e, "health_pinger: tick error"),
        }
        tokio::time::sleep(Duration::from_secs(interval_secs)).await;
    }
}

// ── Inner cycle ───────────────────────────────────────────────────────────────

async fn tick(
    pool: &PgPool,
    probe_client: &Client,
    ingest_client: &Client,
    backend_url: &str,
    secret: &str,
) -> Result<usize> {
    let services = fetch_services(pool).await?;
    if services.is_empty() {
        return Ok(0);
    }

    // Probe all services concurrently.
    let probe_futures = services
        .into_iter()
        .map(|svc| probe_service(probe_client, svc));

    let results: Vec<PingResult> = futures::future::join_all(probe_futures)
        .await
        .into_iter()
        .collect();

    let n = results.len();
    if n == 0 {
        return Ok(0);
    }

    // POST all results to Django in one batch.
    let ingest_url = format!(
        "{}/api/v1/internal/ingest/ping",
        backend_url.trim_end_matches('/')
    );
    match ingest_client
        .post(&ingest_url)
        .header("X-Internal-Secret", secret)
        .header("Content-Type", "application/json")
        .json(&results)
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => {}
        Ok(resp) => {
            warn!(status = %resp.status(), url = %ingest_url, "health_pinger: ingest endpoint returned non-2xx");
        }
        Err(e) => {
            error!(error = %e, url = %ingest_url, "health_pinger: failed to reach Django ingest endpoint");
        }
    }

    Ok(n)
}

// ── DB query ──────────────────────────────────────────────────────────────────

async fn fetch_services(pool: &PgPool) -> Result<Vec<MonitoredService>> {
    // Join monitored_services → status_pages → user_profiles to get account_id.
    // This mirrors the Django ORM query in pingers.py.
    let rows = sqlx::query_as::<_, MonitoredService>(
        r#"
        SELECT
            ms.url,
            sp.is_platform,
            p.account_id::text AS account_id
        FROM   monitored_services        ms
        JOIN   status_pages              sp ON sp.id = ms.status_page_id
        LEFT   JOIN user_profiles        p  ON p.user_id = sp.user_id
        WHERE  ms.url IS NOT NULL
          AND  ms.url <> ''
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

// ── HTTP probe ────────────────────────────────────────────────────────────────

async fn probe_service(client: &Client, svc: MonitoredService) -> PingResult {
    let start = Instant::now();
    let url = svc.url.trim().to_string();

    let (status_code, is_active) = match client.head(&url).send().await {
        Ok(resp) => {
            let code = resp.status().as_u16();
            (code, (200..500).contains(&code))
        }
        Err(_) => {
            // Fallback to GET if HEAD is not supported.
            match client.get(&url).send().await {
                Ok(resp) => {
                    let code = resp.status().as_u16();
                    (code, (200..500).contains(&code))
                }
                Err(_) => (503, false),
            }
        }
    };

    let response_time_ms = start.elapsed().as_millis() as u64;

    PingResult {
        url,
        status_code,
        response_time_ms,
        is_active,
        account_id: svc.account_id,
        is_platform: svc.is_platform,
    }
}
