"""Centralized data-retention policy constants for scheduled cleanup tasks."""

from __future__ import annotations

# Raw telemetry, audit logs, and cookie consent records in Postgres.
RAW_TELEMETRY_RETENTION_DAYS = 30

# Published outbox rows are kept briefly for audit, then purged.
OUTBOX_PUBLISHED_RETENTION_DAYS = 30

# Unpublished outbox rows that exhausted retries (DLQ candidates).
OUTBOX_DLQ_RETENTION_DAYS = 7

# DEK rotation threshold (security_worker compliance scheduler).
DEK_ROTATION_MAX_AGE_DAYS = 30
