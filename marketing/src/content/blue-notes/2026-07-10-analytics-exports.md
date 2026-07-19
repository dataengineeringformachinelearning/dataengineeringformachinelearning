---
title: "Analytics exports via FORJD"
summary: Export jobs are tenant-scoped and executed in FORJD; DEML exposes them through the BFF.
publishedAt: 2026-07-10
note: Platform Note 015
categories:
  - Analytics
  - FORJD
  - Exports
---

Account-scoped export requests enter through Django and execute in FORJD.
Downloads use FORJD-backed export APIs adapted to Angular paths. DEML does not
run a local object-store export worker.

See [docs/FORJD_INTEGRATION.md](../../../docs/FORJD_INTEGRATION.md).
