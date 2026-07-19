---
title: "Sealed projections through FORJD"
summary: Durable projections and analytics execute in FORJD; DEML adapts product paths through Django.
date: 2025-02-10
tags:
  - Architecture
  - FORJD
  - Projections
---

Product dashboards stay on DEML. Sealed telemetry flows Angular → Django BFF →
FORJD with a tenant-bound `fjsvc_` token. FORJD materializes durable
`stream_results` projections; Django adapters return those shapes to Angular.

See [docs/FORJD_INTEGRATION.md](../../../docs/FORJD_INTEGRATION.md).
