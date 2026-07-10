//! Bounded, SSRF-hardened active probes with direct durable persistence.

use std::{
    net::IpAddr,
    time::{Duration, Instant},
};

use anyhow::{bail, Context, Result};
use futures::{stream, StreamExt};
use reqwest::{redirect::Policy, Client, StatusCode};
use sqlx::PgPool;
use tokio::net::lookup_host;
use tracing::{error, info, warn};
use url::Url;
use uuid::Uuid;

use crate::config::Config;

#[derive(Clone, Debug, sqlx::FromRow)]
struct MonitoredService {
    service_id: Uuid,
    url: String,
    user_id: Option<i64>,
    account_id: Option<Uuid>,
    is_platform: bool,
}

#[derive(Debug)]
struct PingResult {
    service: MonitoredService,
    status_code: u16,
    response_time_ms: i64,
    is_active: bool,
    error: String,
}

pub async fn run(pool: PgPool, cfg: Config) -> Result<()> {
    let mut builder = Client::builder()
        .connect_timeout(Duration::from_secs(3))
        .timeout(Duration::from_secs(8))
        .redirect(Policy::none())
        .user_agent("PlatformStatusAutoPinger/3.0 (deml-rust-probe)");
    if cfg.skip_tls_verify {
        warn!("probe: TLS verification disabled; this must never be enabled in production");
        builder = builder.danger_accept_invalid_certs(true);
    }
    let client = builder
        .build()
        .context("failed to build probe HTTP client")?;
    info!(concurrency = cfg.max_concurrency, "probe: started");

    loop {
        if let Err(error) = tick(&pool, &client, &cfg).await {
            error!(%error, "probe: cycle failed");
        }
        tokio::time::sleep(Duration::from_secs(cfg.pinger_interval_secs)).await;
    }
}

#[tracing::instrument(name = "probe_cycle", skip_all)]
async fn tick(pool: &PgPool, client: &Client, cfg: &Config) -> Result<()> {
    let services = fetch_services(pool).await?;
    let bucket = chrono::Utc::now()
        .timestamp()
        .div_euclid(cfg.pinger_interval_secs as i64);
    let results = stream::iter(services.into_iter().map(|service| {
        let client = client.clone();
        async move { probe_service(&client, service).await }
    }))
    .buffer_unordered(cfg.max_concurrency)
    .collect::<Vec<PingResult>>()
    .await;

    let mut inserted = 0usize;
    for result in results {
        let observation_key = format!("{}:{bucket}", result.service.service_id);
        match persist_result(pool, &observation_key, &result).await {
            Ok(true) => inserted += 1,
            Ok(false) => {}
            Err(error) => {
                error!(service_id = %result.service.service_id, %error, "probe: persistence failed")
            }
        }
    }
    info!(inserted, "probe: cycle complete");
    Ok(())
}

async fn fetch_services(pool: &PgPool) -> Result<Vec<MonitoredService>> {
    Ok(sqlx::query_as::<_, MonitoredService>(
        r#"
        SELECT ms.id AS service_id, ms.url, sp.user_id::bigint AS user_id,
               p.account_id, sp.is_platform
        FROM monitored_services AS ms
        JOIN status_pages AS sp ON sp.id = ms.status_page_id
        LEFT JOIN user_profiles AS p ON p.user_id = sp.user_id
        WHERE ms.url IS NOT NULL AND ms.url <> ''
        ORDER BY ms.id
        "#,
    )
    .fetch_all(pool)
    .await?)
}

async fn probe_service(client: &Client, service: MonitoredService) -> PingResult {
    let start = Instant::now();
    let outcome = async {
        validate_public_target(&service.url).await?;
        let head = client.head(&service.url).send().await;
        let response = match head {
            Ok(response)
                if response.status() == StatusCode::METHOD_NOT_ALLOWED
                    || response.status() == StatusCode::NOT_IMPLEMENTED =>
            {
                client.get(&service.url).send().await?
            }
            Ok(response) => response,
            Err(_) => client.get(&service.url).send().await?,
        };
        let code = response.status().as_u16();
        Ok::<(u16, bool), anyhow::Error>((code, (200..500).contains(&code)))
    }
    .await;

    let (status_code, is_active, error) = match outcome {
        Ok((code, active)) => (code, active, String::new()),
        Err(error) => (503, false, error.to_string()),
    };
    PingResult {
        service,
        status_code,
        response_time_ms: start.elapsed().as_millis().min(i64::MAX as u128) as i64,
        is_active,
        error,
    }
}

async fn validate_public_target(raw: &str) -> Result<()> {
    let url = Url::parse(raw).context("invalid monitored URL")?;
    if !matches!(url.scheme(), "http" | "https") {
        bail!("only http and https monitored URLs are allowed");
    }
    if !url.username().is_empty() || url.password().is_some() {
        bail!("monitored URLs may not contain credentials");
    }
    let host = url.host_str().context("monitored URL has no host")?;
    let port = url
        .port_or_known_default()
        .context("monitored URL has no port")?;
    let addresses = lookup_host((host, port))
        .await
        .context("target DNS lookup failed")?;
    let mut found = false;
    for address in addresses {
        found = true;
        if !is_public_ip(address.ip()) {
            bail!("target resolves to a non-public address");
        }
    }
    if !found {
        bail!("target DNS lookup returned no addresses");
    }
    Ok(())
}

fn is_public_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(ip) => {
            !(ip.is_private()
                || ip.is_loopback()
                || ip.is_link_local()
                || ip.is_broadcast()
                || ip.is_documentation()
                || ip.is_multicast()
                || ip.is_unspecified())
        }
        IpAddr::V6(ip) => {
            !(ip.is_loopback()
                || ip.is_unspecified()
                || ip.is_unique_local()
                || ip.is_unicast_link_local()
                || ip.is_multicast())
        }
    }
}

async fn persist_result(pool: &PgPool, observation_key: &str, result: &PingResult) -> Result<bool> {
    let mut transaction = pool.begin().await?;
    let inserted = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO health_probe_observations
            (id, observation_key, monitored_service_id, user_id, account_id, is_platform,
             url, status_code, response_time_ms, is_active, error, observed_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        ON CONFLICT (observation_key) DO NOTHING
        RETURNING id
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(observation_key)
    .bind(result.service.service_id)
    .bind(result.service.user_id)
    .bind(result.service.account_id)
    .bind(result.service.is_platform)
    .bind(&result.service.url)
    .bind(i32::from(result.status_code))
    .bind(result.response_time_ms)
    .bind(result.is_active)
    .bind(&result.error)
    .fetch_optional(&mut *transaction)
    .await?;

    if inserted.is_none() {
        transaction.rollback().await?;
        return Ok(false);
    }

    sqlx::query(
        r#"
        INSERT INTO endpoints
            (id, user_id, is_platform, url, last_tested, status_code, response_time,
             ip_address, location, asn, isp, device_type, os_name, browser_name,
             is_bot, is_active, telemetry_context)
        VALUES ($1, $2, $3, $4, NOW(), $5, $6 * INTERVAL '1 millisecond',
                '127.0.0.1', 'Cluster', 'N/A', 'Internal Network', 'Bot', 'Unknown',
                'Unknown', true, $7, $8)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(result.service.user_id)
    .bind(result.service.is_platform)
    .bind(&result.service.url)
    .bind(i32::from(result.status_code))
    .bind(result.response_time_ms)
    .bind(result.is_active)
    .bind(serde_json::json!({
        "source": "deml-rust-probe",
        "observation_key": observation_key,
        "error": result.error,
    }))
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::is_public_ip;
    use std::net::{IpAddr, Ipv4Addr};

    #[test]
    fn rejects_private_and_loopback_addresses() {
        assert!(!is_public_ip(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1))));
        assert!(!is_public_ip(IpAddr::V4(Ipv4Addr::new(10, 0, 0, 1))));
        assert!(is_public_ip(IpAddr::V4(Ipv4Addr::new(8, 8, 8, 8))));
    }
}
