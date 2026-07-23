---
title: "Sealed projections through FORJD"
summary: Durable projections and analytics execute in FORJD; DEML adapts product paths through Django.
publishedAt: 2025-02-10
note: Platform Note 012
categories:
  - Architecture
  - FORJD
  - Projections
---

## Projection boundary

Product dashboards stay on DEML. Sealed telemetry flows Angular → Django BFF →
FORJD with a tenant-bound `fjsvc_` token. FORJD materializes durable
`stream_results` projections; Django adapters return those shapes to Angular.

## Integration guide

See [docs/FORJD_INTEGRATION.md](../../../docs/FORJD_INTEGRATION.md).
