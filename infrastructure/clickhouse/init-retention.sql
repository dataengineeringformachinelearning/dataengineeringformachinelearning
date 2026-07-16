CREATE TABLE IF NOT EXISTS audit_archive
(
    audit_id String,
    timestamp DateTime64(6, 'UTC'),
    action LowCardinality(String),
    resource_id String,
    user_id UInt64,
    ip_address String,
    user_agent String,
    details_json String
)
ENGINE = ReplacingMergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (audit_id, timestamp)
TTL timestamp + INTERVAL 180 DAY DELETE;

CREATE TABLE IF NOT EXISTS security_events
(
    event_id String,
    timestamp DateTime64(6, 'UTC'),
    event_type LowCardinality(String),
    source LowCardinality(String),
    severity LowCardinality(String),
    account_id String,
    user_id UInt64,
    correlation_id String,
    raw_json_text String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, event_id)
TTL timestamp + INTERVAL 365 DAY DELETE;

CREATE TABLE IF NOT EXISTS asset_vulnerability_ledger
(
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
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (account_id, timestamp, cve_id)
TTL timestamp + INTERVAL 730 DAY DELETE;
