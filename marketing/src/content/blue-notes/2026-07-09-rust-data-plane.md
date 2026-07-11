---
title: "One Rust data plane, one role per service"
summary: DEML moved broker relay, scheduling, probing, normalization, and optional ingestion into a role-selected Rust runtime with durable ownership.
publishedAt: 2026-07-09
note: Platform Note 004
categories:
  - Data Plane
  - Rust
  - Reliability
featured: true
draft: false
---

## What changed

The production data plane now ships as one compiled Rust image. Each deployment receives exactly one role—relay, scheduler, probe, normalizer, CPE processing, or optional ingest—so responsibilities remain explicit while builds stay consistent.

Django remains the control plane. It owns account state, policy, models, and operator APIs. Rust owns the high-frequency work that benefits from bounded concurrency, explicit Kafka acknowledgements, and a smaller runtime footprint.

## Reliability work included

- Durable Postgres leases prevent duplicate ownership when services scale or restart.
- Scheduled task runs and outbox progress are recorded rather than held only in memory.
- Event contracts are validated on both the Firebase command path and backend projection path.
- Projection failures can enter a dead-letter path and be replayed deliberately.
- Health and readiness endpoints distinguish a running process from a service ready to own work.
- Native tenant UUIDs remain intact through normalization and projection.

## Deployment impact

The Railway service catalog now declares the role, Dockerfile, and environment contract for every data-plane service. The old Python relay, pinger, and embedded interval schedulers are rollback paths only; they must not run beside the equivalent Rust role.

This change reduces ambiguity more than it reduces code. Every background responsibility has one production owner, which makes failure detection and recovery substantially clearer.
