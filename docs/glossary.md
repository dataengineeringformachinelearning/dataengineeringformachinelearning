# DEML Glossary

Short definitions for architectural patterns, domain concepts, and production code entities. Narrative detail lives in [BOOK.md](../BOOK.md); executive summary in [WHITEPAPER.md](../WHITEPAPER.md); AI-navigable code map on [DeepWiki](https://deepwiki.com/dataengineeringformachinelearning/dataengineeringformachinelearning).

## Architectural patterns

| Term                                    | Definition                                                                                                                                                                                                                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Event Projections**                   | Core data-flow pattern: **commands** (intent) are decoupled from **projections** (materialized read models). Commands ingress via Firebase `ingestEvent` or the Django API; Redpanda carries the bus; `telemetry_worker` projects into Firestore and relational truth. |
| **Transactional Outbox**                | Django or the Rust ingest edge writes an `OutboxEvent` transactionally; `deml-relay` leases rows with `SKIP LOCKED` and publishes at least once to Redpanda. Stable event IDs make consumer deduplication deterministic.                                               |
| **Symmetrical pipelines**               | Every account (and the platform sentinel) traverses the same worker loops—no hardcoded “platform-only” branches in production code.                                                                                                                                    |
| **Command / projection / query planes** | Writes never block dashboards: commands → bus → workers; queries read Firestore projections or ClickHouse OLAP, not raw transactional joins for live UI.                                                                                                               |

## Domain concepts

| Term                          | Definition                                                                                                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tenant0 / platform-status** | Public dogfood sentinel (`is_platform=True`, world-readable). The platform monitors itself through the same pipelines offered to customers.                                                                                  |
| **Account isolation**         | Flat tenancy via `UserProfile.account_id` (UUID). No org hierarchies; telemetry, keys, and widgets cannot bleed across accounts.                                                                                             |
| **STIX 2.1 / TAXII**          | Anomalies and indicators serialize to STIX 2.1 for ISAC-style sharing over TAXII.                                                                                                                                            |
| **CES**                       | Countermeasure Effectiveness Standard—composite operational score (threat, SLA/stableness, temporal forecast) on analytics/status surfaces.                                                                                  |
| **MFA-verified session**      | Site and settings **mutations** require a Firebase ID token that proves second-factor auth (`amr` / `firebase.sign_in_second_factor`, or equivalent). Enrolled MFA without a fresh SMS-verified sign-in leaves forms locked. |

## System components

| Term                              | Definition                                                                                                                         | Pointer                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **`telemetry_worker`**            | Independent Firestore and business projection consumers with DLQ                                                                   | `backend/telemetry/management/commands/telemetry_worker.py` |
| **`ml_worker`**                   | ML-event consumer; daily runs originate in the durable Rust scheduler                                                              | `backend/ml/management/commands/ml_worker.py`               |
| **Rust data plane**               | One compiled image deployed by role: leased relay, durable scheduler, bounded probe, telemetry normalizer, or optional ingest edge | `rust/deml-daemon/`                                         |
| **`deml-relay` / `outbox_relay`** | Outbox publisher role (Rust daemon preferred in multi-service meshes)                                                              | BOOK App. C; `infrastructure/railway/README.md`             |
| **`deml-workers`**                | ML, lifecycle, and durable whitelisted task execution consumers                                                                    | `backend/deml_workers_start.py`                             |
| **Viking-UI**                     | Design system SSoT: tokens, CSS, Angular + Web Components                                                                          | `packages/viking-ui/`, [THEME.md](../THEME.md)              |
| **Kyber / liboqs**                | Post-quantum KEM primitives available on hybrid key-exchange paths                                                                 | BOOK App. A / Ch. 27                                        |

## Data stores & mesh

| Term                   | Definition                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **PostgreSQL**         | Transactional system of record (users, pages, incidents, keys, outbox).                                                |
| **Redpanda**           | Kafka-compatible internal event broker (`frontend-events`, DLQ, `internal-tasks`). Not a customer integration product. |
| **Firestore (`deml`)** | Named database for projected real-time stats (`users/{uid}/data/stats`).                                               |
| **ClickHouse**         | OLAP store for OpenTelemetry traces/metrics and heavy analytics.                                                       |
| **Dragonfly**          | Redis-compatible cache / Channels / rate-limit window store.                                                           |

## Related docs

- [CONOPS operator reference](conops.md)
- [Platform features](features.md)
- [Billing & subscriptions](billing.md)
- [Railway service topology](../infrastructure/railway/README.md)
- [DeepWiki index](https://deepwiki.com/dataengineeringformachinelearning/dataengineeringformachinelearning)
