---
title: "Analytics exports become durable report artifacts"
summary: Operators can generate tenant-scoped CSV, JSON, Parquet, and PDF exports backed by private object storage and faster archived rollups.
publishedAt: 2026-07-10
updatedAt: 2026-07-10
note: Platform Note 005
categories:
  - Analytics
  - Exports
  - Storage
featured: true
draft: false
---

## New: export jobs

Analytics is no longer confined to the dashboard. Authenticated operators can request CSV, JSON, Parquet, or PDF reports, follow generation status, and receive a short-lived download URL when an artifact is ready.

Each request creates a tenant-owned export job. Background generation reads only the authorized account scope, writes the result to private RustFS-compatible object storage, and exposes downloads through presigned URLs instead of public buckets.

## New: archived daily rollups

Daily report data is materialized into a dedicated archive table before exports need it. Recent dashboards can continue to use the appropriate operational stores, while historical reports avoid repeatedly scanning raw telemetry or leaning on ClickHouse for every request.

- Daily account and status-page rollups are prepared by a scheduled archive command.
- Export generation prefers archived rows when the requested range is covered.
- Database indexes support tenant, status-page, and time-range access patterns.
- Retention is explicitly governed, with report archives kept for 180 days in the current production policy.

## Why it matters

Exports are part of the evidence path for incident review, compliance, capacity planning, and model evaluation. Treating them as durable jobs makes large reports observable and retryable, while private object storage keeps delivery separate from the transactional database.

This update also ships with Viking-UI 5.2.0, keeping the export panel, navigation, and analytics surfaces on the same design-system release.
