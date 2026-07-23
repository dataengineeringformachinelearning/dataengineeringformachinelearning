---
title: "Containerized control plane"
summary: Distroless Django and Angular images keep DEML’s user plane portable across hosts.
publishedAt: 2025-01-20
note: Platform Note 011
categories:
  - Docker
  - Deploy
---

## Deployment model

DEML ships distroless containers for the Django BFF and related control-plane
services. Production Angular runs on Vercel; Django runs on Fly. Sealed streaming
and processing stay on FORJD.

## Operations guides

See [docs/FLY.md](../../../docs/FLY.md) and [docs/VERCEL.md](../../../docs/VERCEL.md).
