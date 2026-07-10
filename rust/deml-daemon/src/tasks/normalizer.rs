//! Rust-owned high-volume endpoint telemetry normalization.
//!
//! Only `telemetry-raw` is consumed here. Business/threat events remain on
//! `app-events` for Django control-plane processing.

use std::{net::IpAddr, str::FromStr};

use anyhow::{bail, Context, Result};
use rdkafka::{
    consumer::{CommitMode, Consumer},
    message::Message,
};
use serde::Deserialize;
use serde_json::{Map, Value};
use sqlx::PgPool;
use tracing::{error, info, warn};
use url::Url;
use uuid::Uuid;

use crate::{config::Config, kafka};

#[derive(Debug, Deserialize)]
struct TelemetryEvent {
    /// Tenant/account UUID as string; null/missing on some legacy platform events.
    #[serde(default)]
    account_id: Option<String>,
    /// Endpoint URL; reject only after deserialize when still empty.
    #[serde(default)]
    url: Option<String>,
    status_code: i32,
    #[serde(default)]
    response_time: Option<f64>,
    #[serde(default)]
    response_time_ms: Option<f64>,
    #[serde(default)]
    ip_address: Option<String>,
    #[serde(default)]
    is_active: bool,
    #[serde(default)]
    user_agent: Option<String>,
    #[serde(default)]
    telemetry_context: Map<String, Value>,
    #[serde(default)]
    idempotency_key: Option<String>,
}

struct UserAgentSummary {
    device: &'static str,
    os: &'static str,
    browser: &'static str,
    is_bot: bool,
}

pub async fn run(pool: PgPool, cfg: Config) -> Result<()> {
    let consumer = kafka::build_consumer(&cfg, &cfg.normalizer_group_id)?;
    consumer.subscribe(&["telemetry-raw"])?;
    let producer = kafka::build_producer(&cfg)?;
    info!(group = %cfg.normalizer_group_id, "normalizer: started");

    loop {
        let message = match consumer.recv().await {
            Ok(message) => message,
            Err(error) => {
                warn!(%error, "normalizer: consume error");
                continue;
            }
        };
        let raw = message.payload().unwrap_or_default();
        let result = async {
            let event: TelemetryEvent = serde_json::from_slice(raw)?;
            persist_event(
                &pool,
                message.topic(),
                message.partition(),
                message.offset(),
                &event,
            )
            .await
        }
        .await;

        match result {
            Ok(()) => {
                consumer.commit_message(&message, CommitMode::Async)?;
            }
            Err(processing_error) => {
                error!(
                    partition = message.partition(),
                    offset = message.offset(),
                    error = %processing_error,
                    "normalizer: event failed"
                );
                let headers = serde_json::json!({
                    "x-deml-error": processing_error.to_string().chars().take(500).collect::<String>(),
                    "x-deml-source-topic": message.topic(),
                });
                match kafka::publish(
                    &producer,
                    "telemetry-raw-dlq",
                    message.key_view::<str>().and_then(Result::ok),
                    raw,
                    &headers,
                )
                .await
                {
                    Ok(()) => consumer.commit_message(&message, CommitMode::Async)?,
                    Err(dlq_error) => {
                        error!(%dlq_error, "normalizer: DLQ publish failed; source remains uncommitted");
                    }
                }
            }
        }
    }
}

#[tracing::instrument(
    name = "normalize_telemetry_event",
    skip_all,
    fields(topic = %topic, partition = partition, offset = offset)
)]
async fn persist_event(
    pool: &PgPool,
    topic: &str,
    partition: i32,
    offset: i64,
    event: &TelemetryEvent,
) -> Result<()> {
    let account_raw = event
        .account_id
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .context("telemetry account_id is required")?;
    let account_id =
        Uuid::parse_str(account_raw).context("telemetry account_id must be a native UUID")?;
    let url = event
        .url
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .context("telemetry url is required")?;
    let parsed_url = Url::parse(url).context("invalid telemetry URL")?;
    if !matches!(parsed_url.scheme(), "http" | "https") || parsed_url.host_str().is_none() {
        bail!("telemetry URL must use http or https and contain a host");
    }
    if !(100..=599).contains(&event.status_code) {
        bail!("status_code must be between 100 and 599");
    }
    let response_time_ms = event
        .response_time_ms
        .or_else(|| event.response_time.map(|seconds| seconds * 1_000.0))
        .unwrap_or_default();
    if !response_time_ms.is_finite() || !(0.0..=86_400_000.0).contains(&response_time_ms) {
        bail!("response time is outside the accepted range");
    }

    let user_id = sqlx::query_scalar::<_, i64>(
        "SELECT user_id::bigint FROM user_profiles WHERE account_id = $1",
    )
    .bind(account_id)
    .fetch_optional(pool)
    .await?
    .context("telemetry account_id is not registered")?;

    let event_id = event
        .idempotency_key
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_owned)
        .unwrap_or_else(|| format!("{topic}:{partition}:{offset}"));
    let mut transaction = pool.begin().await?;
    let receipt = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO telemetry_ingest_receipts
            (id, topic, partition, offset, account_id, event_id, processed_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (topic, partition, offset) DO NOTHING
        RETURNING id
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(topic)
    .bind(partition)
    .bind(offset)
    .bind(account_id)
    .bind(&event_id)
    .fetch_optional(&mut *transaction)
    .await?;
    if receipt.is_none() {
        transaction.rollback().await?;
        return Ok(());
    }

    let user_agent = event.user_agent.as_deref().unwrap_or_default();
    let ua = summarize_user_agent(user_agent);
    let anonymized_ip = event.ip_address.as_deref().and_then(anonymize_ip);
    let context = Value::Object(event.telemetry_context.clone());
    sqlx::query(
        r#"
        INSERT INTO endpoints
            (id, user_id, is_platform, url, last_tested, status_code, response_time,
             ip_address, location, asn, isp, device_type, os_name, browser_name,
             is_bot, is_active, telemetry_context)
        VALUES ($1, $2, false, $3, NOW(), $4, $5 * INTERVAL '1 millisecond',
                $6::inet, 'Unknown', 'Unknown', 'Unknown', $7, $8, $9,
                $10, $11, $12)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(url)
    .bind(event.status_code)
    .bind(response_time_ms)
    .bind(anonymized_ip)
    .bind(ua.device)
    .bind(ua.os)
    .bind(ua.browser)
    .bind(ua.is_bot)
    .bind(event.is_active)
    .bind(context)
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await?;
    Ok(())
}

fn anonymize_ip(raw: &str) -> Option<String> {
    match IpAddr::from_str(raw).ok()? {
        IpAddr::V4(mut ip) => {
            let mut octets = ip.octets();
            octets[3] = 0;
            ip = octets.into();
            Some(ip.to_string())
        }
        IpAddr::V6(ip) => {
            let mut segments = ip.segments();
            segments[3..].fill(0);
            Some(std::net::Ipv6Addr::from(segments).to_string())
        }
    }
}

fn summarize_user_agent(raw: &str) -> UserAgentSummary {
    let lower = raw.to_ascii_lowercase();
    let is_bot = ["bot", "spider", "crawler", "headless", "curl", "wget"]
        .iter()
        .any(|needle| lower.contains(needle));
    let device = if lower.contains("mobile") {
        "Mobile"
    } else {
        "Desktop"
    };
    let os = if lower.contains("windows") {
        "Windows"
    } else if lower.contains("android") {
        "Android"
    } else if lower.contains("iphone") || lower.contains("ipad") {
        "iOS"
    } else if lower.contains("mac os") || lower.contains("macintosh") {
        "macOS"
    } else if lower.contains("linux") {
        "Linux"
    } else {
        "Unknown"
    };
    let browser = if lower.contains("edg/") {
        "Edge"
    } else if lower.contains("firefox/") {
        "Firefox"
    } else if lower.contains("chrome/") {
        "Chrome"
    } else if lower.contains("safari/") {
        "Safari"
    } else {
        "Unknown"
    };
    UserAgentSummary {
        device,
        os,
        browser,
        is_bot,
    }
}

#[cfg(test)]
mod tests {
    use super::{anonymize_ip, summarize_user_agent};

    #[test]
    fn anonymizes_ipv4_and_ipv6() {
        assert_eq!(anonymize_ip("192.0.2.42").as_deref(), Some("192.0.2.0"));
        assert_eq!(
            anonymize_ip("2001:db8:1234:5678:9abc:def0:1111:2222").as_deref(),
            Some("2001:db8:1234::")
        );
    }

    #[test]
    fn detects_basic_user_agent_features() {
        let summary = summarize_user_agent("Mozilla/5.0 (Linux; Android) Chrome/120 Mobile");
        assert_eq!(summary.device, "Mobile");
        assert_eq!(summary.os, "Android");
        assert_eq!(summary.browser, "Chrome");
        assert!(!summary.is_bot);
    }
}
