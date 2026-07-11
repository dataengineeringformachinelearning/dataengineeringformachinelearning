---
title: "Event Projections gets a permanent pulse check"
summary: DEML replaced a manual verification screen with an automated end-to-end probe across Redpanda, the projection worker, and Firestore.
publishedAt: 2026-06-28
note: Platform Note 002
categories:
  - Reliability
  - Event Projections
  - Observability
featured: true
draft: false
---

## The visible change

Operators no longer need to press a button in Settings to learn whether the real-time data path is alive. The platform now runs a synthetic Event Projections check and publishes the result on the public platform status page.

The probe sends a reserved synthetic event through the same infrastructure used by production traffic, waits for its Firestore projection, and records the round-trip result. A stale result is treated as an outage, so a stopped worker cannot continue to look healthy.

## Under the hood

- A versioned command enters the event path and is published to Redpanda.
- The telemetry worker consumes and projects the event into the named `deml` Firestore database.
- A synthetic monitor records success, failure, and freshness.
- The public status surface renders the Event Projections component as operational or unavailable.
- Synthetic events bypass normal deduplication only for their reserved health identity, allowing every probe to exercise the full loop.

## Why it matters

A queue accepting writes does not prove that users can read fresh data. The synthetic check verifies the whole promise: ingress, broker delivery, worker execution, projection, and query availability. It turns a multi-service architecture into one outcome that can be monitored and explained.

The manual panel and its client-only Firestore test were removed. The worker is now the authoritative source for projection health.
