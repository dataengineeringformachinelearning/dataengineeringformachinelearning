---
title: "FORJD owns the streaming hot path"
summary: DEML stays the control plane; FORJD’s Rust engine runs sealed pipeline and data-plane roles.
date: 2026-07-09
tags:
  - FORJD
  - Architecture
---

Django remains the DEML control plane for identity, billing, consent, and product
APIs. High-frequency sealed processing runs in FORJD’s Rust engine
(`forjd-engine`) behind tenant-bound `fjsvc_` credentials.

See [docs/FORJD_INTEGRATION.md](../../../docs/FORJD_INTEGRATION.md).
