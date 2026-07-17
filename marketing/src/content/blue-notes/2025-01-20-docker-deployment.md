---
title: "Containerized Deployment: Docker and Railway Production Mesh"
summary: "Production-ready containerization with distroless images, multi-service Railway topology, and health-check-driven deployment orchestration."
publishedAt: 2025-01-20
note: Platform Note 003
categories:
  - Infrastructure
  - Docker
  - Railway
  - Deployment
featured: false
draft: false
---

## What shipped

- **Distroless containers** for both Python (Django) and Node.js (Angular) services
- **Railway production topology** with 10-service mesh (backend, frontend, workers, telemetry)
- **Health check endpoints** at `/health` and `/ready` for orchestration
- **TLS termination** with verified certificates for all services

## Deployment architecture

The deployment uses a clear separation:

- **Control plane** (`deml-backend`): Django API, migrations, admin
- **Data plane** (`deml-scheduler`, `deml-relay`, `deml-normalizer`): Rust services for async work
- **Presentation** (`deml-frontend`): Angular SSR with Viking-UI

Each service has explicit `requiredEnv` and `forbiddenEnv` in the service catalog, enforcing least-privilege deployment.

## Why it mattered

This infrastructure became the foundation for zero-downtime rolling deploys, automated migrations, and the Rust data plane cutover that followed. The `services.json` catalog enforces architectural invariants at deploy time.
