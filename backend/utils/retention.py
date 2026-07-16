"""Centralized data-retention policy constants for scheduled cleanup tasks.

Neon (PostgreSQL) retention:
- Raw telemetry: 30 days (purged only after compact daily/hourly projections exist)
- AggregatedAnalytics hourly: 30 days (after daily rollups materialized)
- AuditLog: 30 days (archived to ClickHouse before purge)
- CookieConsent: 30 days (compliance-driven cleanup)
- LighthouseScan: 30 days (site-scoped quality history)
- ReportArchive daily: 90 days (queryable report window)
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

from typing import Final

# Raw telemetry, audit logs, and cookie consent records in Postgres.
RAW_TELEMETRY_RETENTION_DAYS = 30

# Page-scoped Lighthouse quality history backs dashboard and export reads.
LIGHTHOUSE_SCAN_RETENTION_DAYS: Final[int] = 30

# Kafka-position idempotency receipts outlive the broker replay window.
TELEMETRY_INGEST_RECEIPT_RETENTION_DAYS = 30

# Published outbox rows are kept briefly for audit, then purged.
OUTBOX_PUBLISHED_RETENTION_DAYS = 30

# Unpublished outbox rows that exhausted retries (DLQ candidates).
OUTBOX_DLQ_RETENTION_DAYS = 7

# DEK rotation threshold (security_worker compliance scheduler).
DEK_ROTATION_MAX_AGE_DAYS = 30

# Report archive retention - materialized daily rollups in Neon serverless.
# Supports 90 days of queryable historical data via ReportArchive.
REPORT_ARCHIVE_RETENTION_DAYS = 90

# Page-scoped uptime projections outlive their 30-day public display window.
STATUS_PAGE_UPTIME_RETENTION_DAYS = 90

# Durable scheduler history is operational evidence, not an indefinite ledger.
SCHEDULED_TASK_RUN_RETENTION_DAYS = 90

# Generated report bytes expire quickly; compact job metadata remains for audit.
EXPORT_ARTIFACT_RETENTION_DAYS = 14
EXPORT_JOB_RETENTION_DAYS = 90

# Threat intelligence retention - deduplicated, short-term for active threats.
THREAT_INTELLIGENCE_RETENTION_DAYS = 90

# PII-bearing search and honeypot evidence follow their active analysis windows.
SEARCH_QUERY_RETENTION_DAYS = 30
HONEYPOT_INTERACTION_RETENTION_DAYS = 90

# Model evaluation evidence supports annual trend comparisons without growing forever.
BENCHMARK_RUN_RETENTION_DAYS = 365

# ClickHouse archival retention periods.
CH_AUDIT_ARCHIVE_RETENTION_DAYS = 180
CH_SECURITY_EVENTS_RETENTION_DAYS = 365
CH_TELEMETRY_RETENTION_DAYS = 730
