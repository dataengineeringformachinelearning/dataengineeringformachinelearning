---
title: "FORJD owns the streaming hot path"
summary: DEML stays the control plane; FORJD’s Rust engine runs sealed pipeline and data-plane roles.
publishedAt: 2026-07-09
note: Platform Note 014
categories:
  - FORJD
  - Architecture
---

## Execution boundary

Django remains the DEML control plane for identity, billing, consent, and product
APIs. High-frequency sealed processing runs in FORJD’s Rust engine
(`forjd-engine`) behind tenant-bound `fjsvc_` credentials.

## Integration guide

See [docs/FORJD_INTEGRATION.md](../../../docs/FORJD_INTEGRATION.md).
