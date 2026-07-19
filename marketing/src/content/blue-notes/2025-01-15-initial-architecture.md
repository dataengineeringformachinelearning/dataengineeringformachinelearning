---
title: "DEML architecture: control plane + FORJD"
summary: DEML owns identity and the Angular product; FORJD is the universal secure streaming engine.
publishedAt: 2025-01-15
note: Platform Note 010
categories:
  - Architecture
  - FORJD
---

DEML is the Firebase-authenticated user control plane and Angular product surface.
Django owns identity, billing, consent, learning content, and BFF adapters.
[FORJD](https://github.com/dataengineeringformachinelearning/forjd) is the
universal secure streaming engine: sealed ingest, projections, analytics, ML,
and replay/DLQ via tenant-bound `fjsvc_` tokens.

Production hosts: Angular on Vercel, Django on Fly, FORJD on Fly + Supabase.
Integration contract: [docs/FORJD_INTEGRATION.md](../../../docs/FORJD_INTEGRATION.md).
