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

    /// Kafka transport protocol. Production permits only SSL or SASL_SSL.
    pub redpanda_security_protocol: String,

    /// Optional private CA and mTLS client identity paths for Redpanda.
    pub redpanda_ssl_ca: Option<String>,
    pub redpanda_ssl_cert: Option<String>,
    pub redpanda_ssl_key: Option<String>,
    pub redpanda_ssl_ca_pem: Option<String>,
    pub redpanda_ssl_cert_pem: Option<String>,
    pub redpanda_ssl_key_pem: Option<String>,

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

    /// ClickHouse connection URL for archival cleanup.
    pub clickhouse_url: Option<String>,

    /// Dragonfly/Redis URL. Required by the ingress role outside local development.
    pub redis_url: Option<String>,

    /// Dragonfly database containing the imported CPE word/rank index.
    pub cpe_redis_url: Option<String>,

    /// Private CA for verified Dragonfly/Redis TLS, supplied as base64 PEM.
    pub redis_ssl_ca_pem: Option<Vec<u8>>,

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

        let config = Self {
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
            redpanda_security_protocol: env::var("REDPANDA_SECURITY_PROTOCOL")
                .unwrap_or_else(|_| {
                    if env::var("REDPANDA_SSL")
                        .map(|value| value.eq_ignore_ascii_case("true"))
                        .unwrap_or(false)
                    {
                        "SASL_SSL".to_string()
                    } else {
                        "PLAINTEXT".to_string()
                    }
                })
                .to_ascii_uppercase(),
            redpanda_ssl_ca: env::var("REDPANDA_SSL_CA").ok().filter(|v| !v.is_empty()),
            redpanda_ssl_cert: env::var("REDPANDA_SSL_CERT").ok().filter(|v| !v.is_empty()),
            redpanda_ssl_key: env::var("REDPANDA_SSL_KEY").ok().filter(|v| !v.is_empty()),
            redpanda_ssl_ca_pem: decode_pem_env("REDPANDA_SSL_CA_B64")?,
            redpanda_ssl_cert_pem: decode_pem_env("REDPANDA_SSL_CERT_B64")?,
            redpanda_ssl_key_pem: decode_pem_env("REDPANDA_SSL_KEY_B64")?,

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
            clickhouse_url: env::var("CLICKHOUSE_URL").ok().filter(|v| !v.is_empty()),
            redis_url: env::var("REDIS_URL").ok().filter(|v| !v.is_empty()),
            cpe_redis_url: env::var("CPE_REDIS_URL").ok().filter(|v| !v.is_empty()),
            redis_ssl_ca_pem: decode_bytes_env("REDIS_SSL_CA_B64")?,
            normalizer_group_id: env::var("NORMALIZER_GROUP_ID")
                .unwrap_or_else(|_| "deml-rust-telemetry-normalizer-v1".to_string()),
        };
        config.validate_transport_security()?;
        Ok(config)
    }

    fn validate_transport_security(&self) -> Result<()> {
        let production = env::var("RAILWAY_ENVIRONMENT")
            .map(|value| value.eq_ignore_ascii_case("production"))
            .unwrap_or(false);
        if !production {
            return Ok(());
        }
        if !env::var("DEML_TRANSPORT_SECURITY")
            .unwrap_or_else(|_| "required".to_string())
            .eq_ignore_ascii_case("required")
        {
            bail!("DEML_TRANSPORT_SECURITY must be required in production");
        }
        let database = url::Url::parse(&self.database_url).context("DATABASE_URL is invalid")?;
        let sslmode = database
            .query_pairs()
            .find(|(name, _)| name == "sslmode")
            .map(|(_, value)| value.into_owned())
            .unwrap_or_default();
        if !matches!(sslmode.as_str(), "verify-ca" | "verify-full") {
            bail!("production DATABASE_URL must set sslmode=verify-ca or sslmode=verify-full");
        }
        if !matches!(self.redpanda_security_protocol.as_str(), "SSL" | "SASL_SSL")
            && matches!(
                self.role,
                Role::Relay | Role::Scheduler | Role::Normalizer | Role::All
            )
        {
            bail!("production Redpanda transport must use SSL or SASL_SSL");
        }
        for (name, value) in [
            ("REDIS_URL", self.redis_url.as_deref()),
            ("CPE_REDIS_URL", self.cpe_redis_url.as_deref()),
        ] {
            if value.is_some_and(|url| !url.starts_with("rediss://")) {
                bail!("production {name} must use rediss://");
            }
        }
        if (self.redis_url.is_some() || self.cpe_redis_url.is_some())
            && self.redis_ssl_ca_pem.is_none()
        {
            bail!("production Redis TLS requires REDIS_SSL_CA_B64");
        }
        if self.skip_tls_verify {
            bail!("HEALTH_PINGER_SKIP_TLS_VERIFY cannot be enabled in production");
        }
        if let Ok(endpoint) = env::var("OTEL_EXPORTER_OTLP_ENDPOINT") {
            if !endpoint.is_empty() && !endpoint.starts_with("https://") {
                bail!("production OTEL_EXPORTER_OTLP_ENDPOINT must use https://");
            }
        }
        let has_cert = self.redpanda_ssl_cert.is_some() || self.redpanda_ssl_cert_pem.is_some();
        let has_key = self.redpanda_ssl_key.is_some() || self.redpanda_ssl_key_pem.is_some();
        let has_ca = self.redpanda_ssl_ca.is_some() || self.redpanda_ssl_ca_pem.is_some();
        if has_cert != has_key {
            bail!("REDPANDA_SSL_CERT and REDPANDA_SSL_KEY must be configured together");
        }
        if matches!(
            self.role,
            Role::Relay | Role::Scheduler | Role::Normalizer | Role::All
        ) && (!has_ca || !has_cert || !has_key)
        {
            bail!("production Redpanda mTLS requires a CA, client certificate, and key");
        }
        Ok(())
    }
}

fn decode_pem_env(name: &str) -> Result<Option<String>> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};

    let Some(encoded) = env::var(name).ok().filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    let bytes = STANDARD
        .decode(encoded)
        .with_context(|| format!("{name} must be valid base64"))?;
    String::from_utf8(bytes)
        .with_context(|| format!("{name} must decode to UTF-8 PEM"))
        .map(Some)
}

fn decode_bytes_env(name: &str) -> Result<Option<Vec<u8>>> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};

    let Some(encoded) = env::var(name).ok().filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    STANDARD
        .decode(encoded)
        .with_context(|| format!("{name} must be valid base64"))
        .map(Some)
}
