---
title: "Event Projections Architecture: CQRS with Redpanda"
summary: "The Command/Projection/Query separation using Firebase Callable Functions, Postgres Outbox, and Rust normalizer worker for real-time Firestore projections."
publishedAt: 2025-02-10
note: Platform Note 004
categories:
  - Architecture
  - Redpanda
  - Firestore
  - Realtime
featured: false
draft: false
---

## What shipped

- **Commands**: `ingestEvent` callable function publishes to `app-events` topic
- **Reliable Delivery**: Transactional Outbox in Django + `outbox_relay` for publishing
- **Projections**: `telemetry_worker` consumes events and materializes into Firestore
- **Queries**: Direct Firestore subscriptions for real-time UI updates

## Technical flow

1. Client submits event → Firebase callable (`version`, `idempotency_key`)
2. Django writes OutboxEvent atomically with main transaction
3. Outbox relay publishes to Redpanda with Kafka compatibility
4. Rust normalizer (or Python worker) consumes with idempotency
5. Projections written to `deml` Firestore database
6. UI subscribes via Firestore SDK for real-time updates

## Why it mattered

This architecture enables horizontal scaling without state coordination. The platform showcase (Tenant0) processes identically to customer tenants through the same code path. Versioned events provide governance for schema evolution.
