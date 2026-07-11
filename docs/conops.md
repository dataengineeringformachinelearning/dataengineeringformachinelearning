# Concept of Operations (CONOPS)

**Platform:** Data Engineering for AI Engineering and Cybersecurity (DEML)
**Last aligned:** July 2026 (Event Projections; multi-runtime compute)
**Canonical narrative:** [BOOK.md § CONOPS](../BOOK.md#concept-of-operations-conops)
**Architecture summary:** [WHITEPAPER.md §2](../WHITEPAPER.md#2-concept-of-operations-conops)
**Glossary:** [glossary.md](glossary.md) · **Billing:** [billing.md](billing.md) · **DeepWiki:** [code wiki](https://deepwiki.com/dataengineeringformachinelearning/dataengineeringformachinelearning)

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
| Paid tiers             | Stripe Standard → Pro ([billing.md](billing.md))         |

## 3. Vendor & deployment map

Compute is **multi-target** with **identical container images** and Event Projections invariants:

| Runtime                     | Notes                                            | Docs                                                                    |
| --------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| **Railway**                 | Private service mesh; `railway.json` per service | [infrastructure/railway/README.md](../infrastructure/railway/README.md) |
| **Cloud Run (GCP)**         | Fully managed reference topology                 | BOOK Appendix C                                                         |
| **AWS Lightsail / Fargate** | Cost-optimized alternate; ECR                    | BOOK Ch. 23 / Appendix E                                                |

Firebase (Auth, `ingestEvent`, Firestore, marketing Hosting) is shared across compute hosts. GCP KMS/audit applies when the GCP control plane is enabled.

| Component                             | Example service names                                                                                                               | Deploy trigger                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Angular app (`deml.app`)              | `deml-frontend`                                                                                                                     | Push to `main`                  |
| Django API                            | `deml-backend`                                                                                                                      | Push to `main`                  |
| Workers, **Rust data plane**, scanner | `deml-workers`, `deml-relay`, `deml-scheduler`, `deml-probe`, `deml-normalizer`, `deml-cpe`, optional `deml-ingest`, `deml-scanner` | Push to `main`                  |
| Postgres                              | managed DB / sidecar                                                                                                                | Infrastructure change           |
| Redpanda, ClickHouse                  | `deml-queue`, `deml-clickhouse`                                                                                                     | Infrastructure + image push     |
| `ingestEvent` + Firestore rules       | Firebase / GCP                                                                                                                      | `.github/workflows/firebase...` |
| Marketing site                        | Firebase Hosting                                                                                                                    | `firebase-hosting-merge.yml`    |

**Ownership invariant:** Rust roles own relay, schedules, probes, and raw telemetry normalization. Python equivalents are rollback-only and must not run concurrently.

**Env trio (never hardcode):** `FRONTEND_URL`, `BACKEND_URL`, `MARKETING_URL`.

## 4. Data paths

### 4.0 Cryptographic transport invariant

Production service connections use verified TLS (`https`, `rediss`, Postgres `sslmode=verify-full`, Redpanda `SSL`/`SASL_SSL`, and HTTPS OTLP). Durable Redpanda values are additionally wrapped in the versioned DEML Internode Envelope (`A256GCM`) before publication and decrypted only by authorized consumers. `DEML_INTERNODE_ENCRYPTION=required` is the production steady state; `optional` is a bounded rolling-migration mode, and `disabled` is restricted to local development/tests. The envelope binds the ciphertext to its Kafka topic so a valid message cannot be moved to a different stream without authentication failure.

### 4.1 Client commands (primary)

```
Angular → Firebase callable ingestEvent → Redpanda (frontend-events)
                                      ↘ Firestore events (fallback)
Redpanda → telemetry_worker → Firestore users/{uid}/data/stats
Angular ← onSnapshot ← Firestore
```

- Events carry `version: "1.0"` and a validated, path-safe `idempotency_key` (16–128 characters).
- Worker is the **only** authoritative writer of stats projections.
- Projection failures are committed only after an acknowledged write to `frontend-events-dlq`; a failed DLQ publish leaves the source batch uncommitted for retry.
- Redpanda message values are ciphertext on the wire and at broker rest; idempotency keys remain visible only when deliberately carried as broker headers for routing/deduplication.

### 4.2 API / integration commands

```
Client → Rust ingest (API key, high volume) or Django REST → Postgres txn + OutboxEvent
deml-relay (leased) → Redpanda → role-specific consumer → Firestore/Postgres
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

| Logical Service                              | Role                                                    | AWS Grouping                                       |
| -------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| `deml-frontend`                              | Angular UI (SSR)                                        | Lightsail Container Service                        |
| `deml-backend`                               | Django API                                              | Lightsail Container Service                        |
| `deml-postgres`                              | OLTP database                                           | RDS or Lightsail DB                                |
| `deml-queue`                                 | Redpanda broker                                         | Dedicated Fargate / Lightsail instance             |
| `deml-telemetry-worker`                      | Firestore and business projections only                 | Lightsail Container Service (or workers container) |
| `deml-relay`                                 | Rust leased outbox delivery                             | Lightsail Container Service                        |
| `deml-scheduler`                             | Rust durable schedule claims                            | Lightsail Container Service                        |
| `deml-probe`                                 | Rust bounded probes and durable observations            | Lightsail Container Service                        |
| `deml-normalizer`                            | Rust `telemetry-raw` validation and persistence         | Lightsail Container Service                        |
| `deml-ingest`                                | Optional Rust high-volume integration ingress           | Lightsail Container Service                        |
| `deml-workers`                               | Consolidated ML training, threat intel, and task runner | Lightsail Container Service                        |
| `deml-clickhouse`                            | OLAP                                                    | Dedicated Fargate / Lightsail instance             |
| `deml-dragonfly`                             | Cache / rate limits                                     | Sidecar or small task                              |
| `deml-scanner`, `deml-cpe`, `deml-tor-proxy` | Vulnerability ledger & OSINT; Rust serves CPE lookups   | Lightsail Container Service (sidecars)             |

Full variable checklist: [BOOK.md Appendix C](../BOOK.md#appendix-c-cloud-run-deployment).

## 8. Maintenance schedule

| Cadence    | Job                                    | Owner                                 |
| ---------- | -------------------------------------- | ------------------------------------- |
| Continuous | Leased `outbox_relay`                  | `deml-relay`                          |
| Continuous | Kafka consumers                        | `deml-normalizer`, `telemetry_worker` |
| 30s        | Service pingers                        | `deml-probe`                          |
| Continuous | Durable schedule claims                | `deml-scheduler`                      |
| 1h         | Threat intel                           | `deml-workers` (Security thread)      |
| 24h        | ML training, `db_cleanup`, Stripe sync | `deml-workers`                        |
| Weekly     | `cleanup_clickhouse`                   | `deml-workers` (Security thread)      |

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
- [ ] `platform-status` → **Event Projections DLQ** is Operational (replay-group lag is zero)
- [ ] Outbox unpublished row count (Postgres)
- [ ] CES gauges responding (ClickHouse path)

## 11. Contingency quick reference

| Failure                     | First response                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Stale realtime stats        | Restart telemetry worker + outbox relay                                                                                                    |
| Function publish errors     | Check Redpanda public endpoint; confirm fallback events in Firestore                                                                       |
| DLQ growth                  | Run `python manage.py replay_projection_dlq --dry-run`; fix the transient/code cause, then replay a bounded batch with `--max-records 100` |
| KMS decrypt errors          | Verify `GCP_SERVICE_ACCOUNT_JSON` and KMS IAM on Cloud Run backend                                                                         |
| Firestore permission denied | Redeploy `firestore.rules` via Firebase workflow                                                                                           |

## 12. Related documents

| Document                                                             | Use                                       |
| -------------------------------------------------------------------- | ----------------------------------------- |
| [BOOK.md](../BOOK.md)                                                | Full CONOPS narrative + chapters          |
| [WHITEPAPER.md](../WHITEPAPER.md)                                    | Executive architecture                    |
| [README.md](../README.md)                                            | API integration gateway                   |
| [features.md](features.md)                                           | Feature catalog                           |
| [AGENTS.md](../AGENTS.md)                                            | Contributor / AI agent principles         |
| [Appendix C](../BOOK.md#appendix-c-cloud-run-deployment)             | Cloud Run deploy                          |
| [Appendix D](../BOOK.md#appendix-d-maintenance--automation-schedule) | Schedules                                 |
| [Rust data plane](rust-data-plane.md)                                | Role rollout, failure semantics, rollback |
