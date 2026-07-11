"""Centralized data-retention policy constants for scheduled cleanup tasks.

Neon (PostgreSQL) retention:
- Raw telemetry: 30 days (cleanup_clickhouse archives to ClickHouse before purge)
- AggregatedAnalytics hourly: 30 days (after daily rollups materialized)
- AuditLog: 30 days (archived to ClickHouse before purge)
- CookieConsent: 30 days (compliance-driven cleanup)
- ReportArchive daily: 90 days (queryable reports; older in ClickHouse)
- ThreatIntelligence: 90 days (security data with deduplication)

ClickHouse archival:
- audit_archive: 180 days retention
- security_events: 365 days retention
- otel_traces/metrics: 730 days (2 years) via MergeTree TTL

Dragonfly/Redis:
- Rate limit keys: 60 seconds (sliding window)
- IP blocklist: 24 hours TTL
"""

from __future__ import annotations

# Raw telemetry, audit logs, and cookie consent records in Postgres.
RAW_TELEMETRY_RETENTION_DAYS = 30

# Published outbox rows are kept briefly for audit, then purged.
OUTBOX_PUBLISHED_RETENTION_DAYS = 30

# Unpublished outbox rows that exhausted retries (DLQ candidates).
OUTBOX_DLQ_RETENTION_DAYS = 7

# DEK rotation threshold (security_worker compliance scheduler).
DEK_ROTATION_MAX_AGE_DAYS = 30

# Report archive retention - materialized daily rollups in Neon serverless.
# Supports 90 days of queryable historical data via ReportArchive.
# Beyond 90 days, analytics are available via ClickHouse long-term storage.
REPORT_ARCHIVE_RETENTION_DAYS = 90

# Threat intelligence retention - deduplicated, short-term for active threats.
THREAT_INTELLIGENCE_RETENTION_DAYS = 90

# ClickHouse archival retention periods.
CH_AUDIT_ARCHIVE_RETENTION_DAYS = 180
CH_SECURITY_EVENTS_RETENTION_DAYS = 365
CH_TELEMETRY_RETENTION_DAYS = 730
