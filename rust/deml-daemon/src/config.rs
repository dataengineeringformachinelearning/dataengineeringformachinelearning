use std::env;

    /// Runtime configuration loaded entirely from environment variables.
/// All fields match the env vars already defined in docker-compose.yml and Railway.
#[derive(Clone, Debug)]
pub struct Config {
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

    /// Base URL of the Django backend service (for internal HTTP calls).
    /// e.g. `http://backend:8000` in docker-compose, Railway internal URL in prod.
    pub backend_internal_url: String,

    /// Shared secret for the Django `/internal/*` endpoints.
    /// Set via `INTERNAL_SECRET` env var on both backend and deml-daemon.
    pub internal_secret: String,

    /// Emit JSON log lines when true; human-readable when false.
    pub structured_logs: bool,

    /// When true, the health probe client skips TLS certificate verification.
    /// Set `HEALTH_PINGER_SKIP_TLS_VERIFY=true` in local dev only — never in production.
    /// Default: false (verification enabled).
    pub skip_tls_verify: bool,
}

impl Config {
    /// Construct from environment. Panics immediately on missing required vars
    /// so misconfiguration is caught at startup rather than at first poll cycle.
    pub fn from_env() -> Self {
        Self {
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL must be set"),

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

            backend_internal_url: env::var("BACKEND_INTERNAL_URL")
                .unwrap_or_else(|_| "http://backend:8000".to_string()),

            internal_secret: env::var("INTERNAL_SECRET")
                .unwrap_or_else(|_| "dev-internal-secret".to_string()),

            structured_logs: env::var("STRUCTURED_LOGS")
                .map(|v| v.eq_ignore_ascii_case("true"))
                .unwrap_or(false),

            skip_tls_verify: env::var("HEALTH_PINGER_SKIP_TLS_VERIFY")
                .map(|v| v.eq_ignore_ascii_case("true"))
                .unwrap_or(false),
        }
    }
}
