use std::env;

use anyhow::{bail, Context, Result};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Role {
    Relay,
    Scheduler,
    Probe,
    Normalizer,
    Ingest,
    Cpe,
    All,
}

impl Role {
    fn from_env() -> Result<Self> {
        let raw = env::var("DEML_ROLE").context("DEML_ROLE must be set explicitly")?;
        match raw.to_ascii_lowercase().as_str() {
            "relay" => Ok(Self::Relay),
            "scheduler" => Ok(Self::Scheduler),
            "probe" => Ok(Self::Probe),
            "normalizer" => Ok(Self::Normalizer),
            "ingest" => Ok(Self::Ingest),
            "cpe" => Ok(Self::Cpe),
            "all" => Ok(Self::All),
            _ => {
                bail!("DEML_ROLE must be relay, scheduler, probe, normalizer, ingest, cpe, or all")
            }
        }
    }

    pub fn runs(self, target: Self) -> bool {
        self == Self::All || self == target
    }
}

/// Runtime configuration loaded entirely from environment variables.
/// All fields match the env vars already defined in docker-compose.yml and Railway.
#[derive(Clone, Debug)]
pub struct Config {
    pub role: Role,

    /// Postgres DSN — same DATABASE_URL used by Django.
    pub database_url: String,

    /// Comma-separated Redpanda/Kafka broker list.
    pub redpanda_brokers: String,

    /// Optional SASL/SCRAM-SHA-256 credentials for production Redpanda.
    pub sasl_username: Option<String>,
    pub sasl_password: Option<String>,

    /// Set to "true" to use SASL_SSL instead of SASL_PLAINTEXT.
    pub sasl_ssl: bool,

    /// Max events fetched per poll cycle.
    pub batch_size: i64,

    /// Seconds between outbox poll cycles.
    pub poll_interval_secs: u64,

    /// Abandon publishing after this many failed attempts (logs as dlq_candidate).
    pub max_attempts: i32,

    /// Seconds between health probe cycles (matches Python pinger default of 30s).
    pub pinger_interval_secs: u64,

    /// Emit JSON log lines when true; human-readable when false.
    pub structured_logs: bool,

    /// When true, the health probe client skips TLS certificate verification.
    /// Set `HEALTH_PINGER_SKIP_TLS_VERIFY=true` in local dev only — never in production.
    /// Default: false (verification enabled).
    pub skip_tls_verify: bool,

    /// Maximum simultaneous Kafka publishes or HTTP probes.
    pub max_concurrency: usize,

    /// Health/ingestion HTTP bind address.
    pub bind_address: String,

    /// Dragonfly/Redis URL. Required by the ingress role outside local development.
    pub redis_url: Option<String>,

    /// Dragonfly database containing the imported CPE word/rank index.
    pub cpe_redis_url: Option<String>,

    /// Kafka group for the Rust telemetry normalizer.
    pub normalizer_group_id: String,
}

impl Config {
    /// Construct from environment. Panics immediately on missing required vars
    /// so misconfiguration is caught at startup rather than at first poll cycle.
    pub fn from_env() -> Result<Self> {
        let max_concurrency = env::var("MAX_CONCURRENCY")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(64);
        if max_concurrency == 0 {
            bail!("MAX_CONCURRENCY must be greater than zero");
        }

        Ok(Self {
            role: Role::from_env()?,
            database_url: env::var("DATABASE_URL").context("DATABASE_URL must be set")?,

            redpanda_brokers: env::var("REDPANDA_BROKERS")
                .unwrap_or_else(|_| "redpanda:9092".to_string()),

            sasl_username: env::var("REDPANDA_SASL_USERNAME")
                .ok()
                .filter(|s| !s.is_empty()),
            sasl_password: env::var("REDPANDA_SASL_PASSWORD")
                .ok()
                .filter(|s| !s.is_empty()),
            sasl_ssl: env::var("REDPANDA_SSL")
                .map(|v| v.eq_ignore_ascii_case("true"))
                .unwrap_or(false),

            batch_size: env::var("BATCH_SIZE")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(100),

            poll_interval_secs: env::var("POLL_INTERVAL_SECS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(5),

            max_attempts: env::var("MAX_ATTEMPTS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(5),

            pinger_interval_secs: env::var("PINGER_INTERVAL_SECS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(30),

            structured_logs: env::var("STRUCTURED_LOGS")
                .map(|v| v.eq_ignore_ascii_case("true"))
                .unwrap_or(false),

            skip_tls_verify: env::var("HEALTH_PINGER_SKIP_TLS_VERIFY")
                .map(|v| v.eq_ignore_ascii_case("true"))
                .unwrap_or(false),

            max_concurrency,
            bind_address: format!(
                "0.0.0.0:{}",
                env::var("PORT").unwrap_or_else(|_| "8080".to_string())
            ),
            redis_url: env::var("REDIS_URL").ok().filter(|v| !v.is_empty()),
            cpe_redis_url: env::var("CPE_REDIS_URL").ok().filter(|v| !v.is_empty()),
            normalizer_group_id: env::var("NORMALIZER_GROUP_ID")
                .unwrap_or_else(|_| "deml-rust-telemetry-normalizer-v1".to_string()),
        })
    }
}
