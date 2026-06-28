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

| Component                               | Host                    | Deploy trigger                                  |
| --------------------------------------- | ----------------------- | ----------------------------------------------- |
| Angular app (`deml.app`)                | Railway `deml-frontend` | Push to `main` (watch `/frontend/**`)           |
| Django API                              | Railway `deml-backend`  | Push to `main` (watch `/backend/**`)            |
| Postgres, Redpanda, ClickHouse, workers | Railway (12+ services)  | Push to `main`                                  |
| `ingestEvent` + Firestore rules         | Firebase / GCP          | `.github/workflows/firebase-backend-deploy.yml` |
| Marketing site                          | Firebase Hosting        | `firebase-hosting-merge.yml`                    |
| KMS + audit logs                        | GCP (Terraform)         | Manual / CI Terraform apply                     |
| Model weights                           | Hugging Face Hub        | `ml_worker` + `huggingface-space.yml`           |

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

| Mode                            | Indicators                               | Actions                                                                             |
| ------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| **Normal**                      | Event Projections test passes; DLQ empty | Routine monitoring                                                                  |
| **Broker degraded (Functions)** | Function logs show Firestore fallback    | Verify public `REDPANDA_BROKERS` for Functions; Railway internal broker unaffected  |
| **Worker degraded**             | Stale Firestore stats; growing outbox    | Restart `deml-telemetry-worker`, `deml-outbox-relay`; inspect `frontend-events-dlq` |
| **Auth degraded**               | 401/403 spikes                           | Check Firebase project, JWT clock skew, rules deploy                                |
| **Maintenance**                 | Deploy in progress                       | Railway rolling deploy; expect brief projection lag                                 |

## 7. Service matrix (Railway)

| Service                            | Role                           |
| ---------------------------------- | ------------------------------ |
| `deml-frontend`                    | Angular UI                     |
| `deml-backend`                     | Django API                     |
| `deml-postgres`                    | OLTP database                  |
| `deml-queue`                       | Redpanda broker                |
| `deml-telemetry-worker`            | Projections, pingers, rollups  |
| `deml-outbox-relay`                | Outbox publisher               |
| `deml-ml-worker`                   | Training / inference           |
| `deml-security-worker`             | Intel, retention, billing sync |
| `deml-clickhouse`                  | OLAP                           |
| `deml-otel-collector`              | Trace pipeline                 |
| `deml-dragonfly`                   | Cache / rate limits            |
| `deml-scanner`, `deml-cpe-guesser` | Vulnerability ledger           |
| `deml-tor-proxy`                   | OSINT routing                  |

Full variable checklist: [BOOK.md Appendix C](../BOOK.md#appendix-c-railway-deployment).

## 8. Maintenance schedule

| Cadence             | Job                                    | Owner                           |
| ------------------- | -------------------------------------- | ------------------------------- |
| 5s                  | `outbox_relay`                         | `deml-outbox-relay`             |
| Continuous          | Kafka consumers                        | `telemetry_worker`, `ml_worker` |
| 30s                 | Service pingers                        | `telemetry_worker`              |
| 1h                  | Threat intel                           | `security_worker`               |
| 24h                 | ML training, `db_cleanup`, Stripe sync | `ml_worker`, `security_worker`  |
| Weekly              | Renovate PRs                           | GitHub Actions                  |
| Monthly / Quarterly | Semgrep, audits                        | GitHub Actions                  |

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
- [ ] Railway CPU/memory on `deml-backend`, `deml-telemetry-worker`
- [ ] DLQ topic depth (`frontend-events-dlq`)
- [ ] Outbox unpublished row count (Postgres)
- [ ] CES gauges responding (ClickHouse path)

## 11. Contingency quick reference

| Failure                     | First response                                                          |
| --------------------------- | ----------------------------------------------------------------------- |
| Stale realtime stats        | Restart telemetry worker + outbox relay                                 |
| Function publish errors     | Check Redpanda public endpoint; confirm fallback events in Firestore    |
| DLQ growth                  | Inspect worker logs; fix enrichment error; replay with idempotency keys |
| KMS decrypt errors          | Verify `GCP_SERVICE_ACCOUNT_JSON` and KMS IAM on Railway backend        |
| Firestore permission denied | Redeploy `firestore.rules` via Firebase workflow                        |

## 12. Related documents

| Document                                                             | Use                               |
| -------------------------------------------------------------------- | --------------------------------- |
| [BOOK.md](../BOOK.md)                                                | Full CONOPS narrative + chapters  |
| [WHITEPAPER.md](../WHITEPAPER.md)                                    | Executive architecture            |
| [README.md](../README.md)                                            | API integration gateway           |
| [features.md](features.md)                                           | Feature catalog                   |
| [AGENTS.md](../AGENTS.md)                                            | Contributor / AI agent principles |
| [Appendix C](../BOOK.md#appendix-c-railway-deployment)               | Railway deploy                    |
| [Appendix D](../BOOK.md#appendix-d-maintenance--automation-schedule) | Schedules                         |
