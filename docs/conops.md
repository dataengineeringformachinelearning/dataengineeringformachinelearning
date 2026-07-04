# Concept of Operations (CONOPS)

**Platform:** Data Engineering for Machine Learning (DEML)
**Last aligned:** June 2026 (Event Projections architecture)
**Canonical narrative:** [BOOK.md § CONOPS](../BOOK.md#concept-of-operations-conops)
**Architecture summary:** [WHITEPAPER.md §2](../WHITEPAPER.md#2-concept-of-operations-conops)

---

## 1. Purpose

This document tells operators **how DEML runs in production**: vendors, services, data paths, user workflows, maintenance schedules, and degraded-mode behavior. Use it for on-call orientation, compliance evidence, and release planning.

## 2. System mission

| Goal                   | Mechanism                                                |
| ---------------------- | -------------------------------------------------------- |
| Non-blocking ingestion | Firebase `ingestEvent` + Django Outbox → Redpanda        |
| Real-time dashboards   | Firestore projections (`deml` DB) + Angular `onSnapshot` |
| Transactional truth    | PostgreSQL (users, pages, incidents, API keys, outbox)   |
| Analytics & CES        | OpenTelemetry → ClickHouse                               |
| Tenant isolation       | `account_id` scoping + Firestore security rules          |
| Public transparency    | `platform-status` dogfoods under real load               |

## 3. Vendor & deployment map

Canonical production uses Google Cloud (Cloud Run services for the container fleet, Firebase for commands and projections, GCP for KMS/audit). A cost-optimized and manageable alternative deployment exists on AWS using Lightsail Container Services (for the application and worker containers), ECR for images, Fargate or Lightsail instances for Redpanda/ClickHouse, and RDS/Lightsail Database for Postgres. Both topologies use identical container images and preserve the Event Projections architecture.

| Component                       | Canonical Host (GCP)      | AWS Alternative Host (Lightsail / Fargate)        | Deploy trigger                  |
| ------------------------------- | ------------------------- | ------------------------------------------------- | ------------------------------- |
| Angular app (`deml.app`)        | Cloud Run `deml-frontend` | Lightsail Container Service (frontend)            | Push to `main`                  |
| Django API                      | Cloud Run `deml-backend`  | Lightsail Container Service (backend)             | Push to `main`                  |
| Workers, daemon, scanner        | Cloud Run services        | Lightsail Container Service (multiple containers) | Push to `main`                  |
| Postgres                        | Cloud Run / Cloud SQL     | RDS or Lightsail Database                         | Infrastructure change           |
| Redpanda, ClickHouse            | Cloud Run (stateful)      | Fargate task or Lightsail instance + EBS          | Infrastructure + image push     |
| `ingestEvent` + Firestore rules | Firebase / GCP            | Firebase (unchanged)                              | `.github/workflows/firebase...` |
| Marketing site                  | Firebase Hosting          | Firebase Hosting (unchanged)                      | `firebase-hosting-merge.yml`    |

**Env trio (never hardcode):** `FRONTEND_URL`, `BACKEND_URL`, `MARKETING_URL`.

## 4. Data paths

### 4.1 Client commands (primary)

```
Angular → Firebase callable ingestEvent → Redpanda (frontend-events)
                                      ↘ Firestore events (fallback)
Redpanda → telemetry_worker → Firestore users/{uid}/data/stats
Angular ← onSnapshot ← Firestore
```

- Events carry `version: "1.0"` and `idempotency_key`.
- Worker is the **only** authoritative writer of stats projections.

### 4.2 API / integration commands

```
Client → Django REST (API key or JWT) → Postgres txn + OutboxEvent
outbox_relay (5s) → Redpanda → telemetry_worker → Firestore
```

### 4.3 Queries

| Data                       | Store                 | Client access        |
| -------------------------- | --------------------- | -------------------- |
| Live stats                 | Firestore `deml`      | `onSnapshot`         |
| Status pages, incidents    | Postgres + Sanity CMS | REST + Sanity API    |
| CES / historical analytics | ClickHouse            | REST (authenticated) |

## 5. Actors

| Actor          | Access                              | Notes                                |
| -------------- | ----------------------------------- | ------------------------------------ |
| Anonymous      | Published pages + `platform-status` | ABAC enforced server-side            |
| Viewer         | Read dashboards                     | No mutations (`403` on writes)       |
| Operator       | Full account management             | MFA required for writes              |
| Security Admin | Platform bootstrap                  | Same as Operator for owned resources |
| API integrator | `/api/v1/ingest`, `/api/v1/predict` | Bearer API key → `account_id`        |

See [WHITEPAPER §8](../WHITEPAPER.md#8-role-based--attribute-based-access-control-rbac--abac) for the access matrix.

## 6. Operational modes

| Mode                            | Indicators                               | Actions                                                                      |
| ------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| **Normal**                      | Event Projections test passes; DLQ empty | Routine monitoring                                                           |
| **Broker degraded (Functions)** | Function logs show Firestore fallback    | Verify public `REDPANDA_BROKERS` for Functions; internal broker unaffected   |
| **Worker degraded**             | Stale Firestore stats; growing outbox    | Restart `deml-telemetry-worker`, `deml-relay`; inspect `frontend-events-dlq` |
| **Auth degraded**               | 401/403 spikes                           | Check Firebase project, JWT clock skew, rules deploy                         |
| **Maintenance**                 | Deploy in progress                       | Cloud Run rolling deploy; expect brief projection lag                        |

## 7. Service matrix

The logical services are identical across deployment targets. On the canonical Cloud Run path they map 1:1 to Cloud Run services. On the AWS alternative they are grouped: most application containers (frontend, backend, workers, daemon, scanner, sidecars) run inside a single Lightsail Container Service; Redpanda and ClickHouse run as dedicated Fargate tasks or Lightsail instances.

| Logical Service                                      | Role                                                    | AWS Grouping                                       |
| ---------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| `deml-frontend`                                      | Angular UI (SSR)                                        | Lightsail Container Service                        |
| `deml-backend`                                       | Django API                                              | Lightsail Container Service                        |
| `deml-postgres`                                      | OLTP database                                           | RDS or Lightsail DB                                |
| `deml-queue`                                         | Redpanda broker                                         | Dedicated Fargate / Lightsail instance             |
| `deml-telemetry-worker`                              | Projections, pingers, rollups                           | Lightsail Container Service (or workers container) |
| `deml-daemon`                                        | Outbox relay, pinger, cron publisher                    | Lightsail Container Service                        |
| `deml-workers`                                       | Consolidated ML training, threat intel, and task runner | Lightsail Container Service                        |
| `deml-clickhouse`                                    | OLAP                                                    | Dedicated Fargate / Lightsail instance             |
| `deml-dragonfly`                                     | Cache / rate limits                                     | Sidecar or small task                              |
| `deml-scanner`, `deml-cpe-guesser`, `deml-tor-proxy` | Vulnerability ledger & OSINT                            | Lightsail Container Service (sidecars)             |

Full variable checklist: [BOOK.md Appendix C](../BOOK.md#appendix-c-cloud-run-deployment).

## 8. Maintenance schedule

| Cadence    | Job                                    | Owner                                          |
| ---------- | -------------------------------------- | ---------------------------------------------- |
| 5s         | `outbox_relay`                         | `deml-relay`                                   |
| Continuous | Kafka consumers                        | `telemetry_worker`, `deml-workers` (ML thread) |
| 30s        | Service pingers                        | `telemetry_worker`                             |
| 1h         | Threat intel                           | `deml-workers` (Security thread)               |
| 24h        | ML training, `db_cleanup`, Stripe sync | `deml-workers`                                 |

| Weekly | Renovate PRs | GitHub Actions |
| Monthly / Quarterly | Semgrep, audits | GitHub Actions |

Full tables: [BOOK.md Appendix D](../BOOK.md#appendix-d-maintenance--automation-schedule).

## 9. Security operations (summary)

- Firebase Auth + App Check at perimeter; Django verifies JWTs.
- MFA (`amr` claim) required for customer mutations.
- AES-256-GCM + GCP KMS envelope encryption for integration secrets.
- Immutable GCS audit logs (Terraform).
- Pre-commit and CI: Ruff, ESLint, Axe, Semgrep, Trivy, Gitleaks.

## 10. Monitoring checklist

- [ ] Settings → **Event Projections Verification** succeeds
- [ ] `platform-status` loads for anonymous users
- [ ] Sentry error rate baseline
- [ ] Cloud Run CPU/memory on `deml-backend`, `deml-telemetry-worker`
- [ ] DLQ topic depth (`frontend-events-dlq`)
- [ ] Outbox unpublished row count (Postgres)
- [ ] CES gauges responding (ClickHouse path)

## 11. Contingency quick reference

| Failure                     | First response                                                          |
| --------------------------- | ----------------------------------------------------------------------- |
| Stale realtime stats        | Restart telemetry worker + outbox relay                                 |
| Function publish errors     | Check Redpanda public endpoint; confirm fallback events in Firestore    |
| DLQ growth                  | Inspect worker logs; fix enrichment error; replay with idempotency keys |
| KMS decrypt errors          | Verify `GCP_SERVICE_ACCOUNT_JSON` and KMS IAM on Cloud Run backend      |
| Firestore permission denied | Redeploy `firestore.rules` via Firebase workflow                        |

## 12. Related documents

| Document                                                             | Use                               |
| -------------------------------------------------------------------- | --------------------------------- |
| [BOOK.md](../BOOK.md)                                                | Full CONOPS narrative + chapters  |
| [WHITEPAPER.md](../WHITEPAPER.md)                                    | Executive architecture            |
| [README.md](../README.md)                                            | API integration gateway           |
| [features.md](features.md)                                           | Feature catalog                   |
| [AGENTS.md](../AGENTS.md)                                            | Contributor / AI agent principles |
| [Appendix C](../BOOK.md#appendix-c-cloud-run-deployment)             | Cloud Run deploy                  |
| [Appendix D](../BOOK.md#appendix-d-maintenance--automation-schedule) | Schedules                         |
