# Rust Data Plane Operations

The DEML Rust workspace owns high-volume and timing-sensitive work while Django remains the control plane. One compiled image is deployed with exactly one `DEML_ROLE` per production service:

| Role         | Service           | Durable boundary                                                                       |
| ------------ | ----------------- | -------------------------------------------------------------------------------------- |
| `relay`      | `deml-relay`      | Leased `monitor_outboxevent` rows; stable `x-deml-event-id` header                     |
| `scheduler`  | `deml-scheduler`  | Unique `(task_name, scheduled_for)` UTC buckets in `scheduled_task_runs`               |
| `probe`      | `deml-probe`      | Unique `health_probe_observations.observation_key` and transactional `endpoints` write |
| `normalizer` | `deml-normalizer` | Unique Kafka topic/partition/offset receipt in `telemetry_ingest_receipts`             |
| `ingest`     | `deml-ingest`     | API-key auth, Dragonfly rate limiting, chain-of-custody hash, transactional Outbox     |
| `cpe`        | `deml-cpe`        | Lua-ranked CPE lookup against the imported Dragonfly database 8 index                  |

`DEML_ROLE=all` exists only for local diagnostics. Production uses separate roles so a probe spike, Kafka rebalance, scheduler failure, or CPE refresh cannot take down relay delivery. The pinned Python CPE package remains a one-shot dictionary importer; Rust owns the request-time `/unique` lookup path.

## Python-to-Rust ownership ledger

The migration changes runtime ownership, not the Django control-plane contract.
Python models, migrations, admin/API behavior, and rollback commands remain in
the repository; only one runtime may own each loop in production.

| Capability                                            | Production owner       | Python status                              | Durable / failure contract                                                         |
| ----------------------------------------------------- | ---------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Outbox delivery                                       | `deml-relay`           | `outbox_relay` is rollback-only            | `SKIP LOCKED` lease, broker `acks=all`, stable event header, exponential retry     |
| Schedule creation                                     | `deml-scheduler`       | embedded interval schedulers disabled      | unique UTC task bucket plus a 60-second renewable claim                            |
| Database retention and rollups                        | `deml-scheduler`       | management commands are guarded fallbacks  | native SQL; failed runs remain `failed` and retry instead of being marked complete |
| Service probes                                        | `deml-probe`           | embedded pinger disabled                   | bounded concurrency, SSRF-safe resolution, transactional observation write         |
| Raw telemetry normalization                           | `deml-normalizer`      | removed from projection worker ownership   | topic/partition/offset receipt, explicit Kafka acknowledgement, DLQ before commit  |
| High-volume ingest                                    | optional `deml-ingest` | Django remains the default/canary fallback | API-key auth, fail-closed rate limit, batch idempotency, transactional Outbox      |
| Request-time CPE lookup                               | `deml-cpe`             | Python imports the pinned dictionary only  | Dragonfly DB 8 Lua ranking; no Python HTTP lookup service                          |
| Business projections, ML, billing, KMS, external APIs | Django workers         | active                                     | Rust scheduler publishes whitelisted triggers; Python performs ecosystem work      |

## Required rollout order

1. Deploy the Django migration and verify `python manage.py migrate` completes
   (`monitor.0041_rust_data_plane`, `monitor.0042_alter_outboxevent_available_at`).
2. Start `deml-relay`; stop `relay_start.py` and any Python `outbox_relay` process.
3. Start `deml-normalizer`, then confirm new endpoint telemetry is published to `telemetry-raw` and the `telemetry-raw-dlq` depth remains zero.
4. Start `deml-probe`; keep `PYTHON_EMBEDDED_SCHEDULERS_ENABLED=0` on the telemetry worker.
5. Start `deml-scheduler`; keep the same Python flag disabled on `deml-workers` and the ML worker.
6. Populate CPE Dragonfly DB 8 via the pinned Python importer, then start `deml-cpe`.
7. Deploy `deml-ingest` behind the `/api/v1/ingest` route only after API-key, quota, duplicate-batch, and payload-size canaries pass. `/api/v1/predict` and `/api/v1/ingest/security-alert` remain on Django.

Railway service configs live under `infrastructure/railway/{relay,scheduler,probe,normalizer,ingest,cpe}/` and bake `DEML_ROLE` into each `startCommand`. The full production topology (all services, required/forbidden env, retired names) is catalogued in [`infrastructure/railway/services.json`](../infrastructure/railway/services.json); agents should audit with `python scripts/railway_audit.py` and follow [infrastructure/railway/README.md](../infrastructure/railway/README.md).

Do not change all owners at once in an existing production environment. Observe one complete cadence and backlog recovery before advancing to the next role.

## Environment

All roles require `DATABASE_URL`. Relay, scheduler, and normalizer require `REDPANDA_BROKERS` plus the existing `REDPANDA_SASL_*` variables when authentication is enabled. Ingest requires `REDIS_URL` and fails closed when Dragonfly is unavailable. Probe accepts `PINGER_INTERVAL_SECS` and `MAX_CONCURRENCY`; TLS verification is on unless the explicitly local-only `HEALTH_PINGER_SKIP_TLS_VERIFY=true` flag is set.

Every role exposes `/health` and `/ready` on `PORT` (default `8080`). Readiness is Postgres-backed except for the CPE role, whose only runtime dependency is its imported Dragonfly index. The ingest role additionally exposes `POST /api/v1/ingest` with the existing `{batch_id, records}` response contract. Bodies are limited to 2 MiB and 10,000 records, batch IDs are path-safe, API-key comparison is constant-time, and rate limiting uses one atomic Dragonfly Lua operation. The Swagger demo credential remains Django-only; gateways must keep that traffic on Django during an ingest cutover.

## Delivery and failure semantics

The relay provides at-least-once delivery. A crash after Redpanda acknowledgement but before the Postgres completion update can republish an event; consumers must deduplicate by `x-deml-event-id` or their domain idempotency key. Failed publishes use exponential backoff and become explicit DLQ candidates after the configured maximum attempts.

The scheduler never treats an in-memory timer as durable state. Replicas materialize the same UTC bucket, the database unique constraint elects one logical run, and a lease elects one publisher. `deml-workers` moves the run through `published → running → completed`; command failures become `failed` and are republished with the same run ID after the retry lease.

The probe role never calls Django. It rejects credentials in URLs, non-HTTP schemes, redirects, and targets resolving to private, loopback, link-local, multicast, documentation, or unspecified addresses. A probe result and its compatibility `endpoints` row commit in one Postgres transaction.

Kafka values published or consumed by relay, scheduler, and normalizer use the
versioned DEML Internode Envelope (`deml-internode+jwe`, A256GCM). The Kafka
topic is authenticated as envelope context, so ciphertext cannot be moved to a
different topic and still validate. Production uses
`DEML_INTERNODE_ENCRYPTION=required`; `optional` is only for bounded key
rotation, and `disabled` is local/test only. The active key ID and JSON keyring
support overlap during rotation without accepting unknown keys.

## Durable scheduler and native maintenance

The scheduler polls every 15 seconds, materializes absolute UTC buckets, and
claims at most 20 due rows with `FOR UPDATE SKIP LOCKED`. Native maintenance is
executed in-process. Ecosystem tasks are encrypted and published to
`internal-tasks`, where `deml-workers` accepts only its command allowlist.

| Task                   | Cadence / UTC offset | Owner          | Result                                                                           |
| ---------------------- | -------------------- | -------------- | -------------------------------------------------------------------------------- |
| `aggregate_analytics`  | hourly + 5m          | Python trigger | refreshes analytical rollups                                                     |
| `fetch_threat_intel`   | hourly + 10m         | Python trigger | external threat enrichment                                                       |
| `ingest_taxii`         | hourly + 12m30s      | Python trigger | STIX/TAXII ingestion                                                             |
| `run_lighthouse_scans` | 6-hourly + 15m       | Python trigger | accessibility/performance scan                                                   |
| `archive_reports`      | daily + 30m          | Rust native    | upserts yesterday's user and Tenant0 report rows symmetrically                   |
| `rotate_keys_if_due`   | daily + 20m          | Python trigger | KMS policy work                                                                  |
| `train_all_models`     | daily + 1h           | Python trigger | tenant-scoped PyTorch training                                                   |
| `scan_dark_web`        | daily + 1h15m        | Python trigger | OSINT/Tor workflow                                                               |
| `sync_subscriptions`   | daily + 2h           | Python trigger | Stripe reconciliation                                                            |
| `reconcile_accounts`   | daily + 2h5m         | Python trigger | identity/account reconciliation                                                  |
| `db_cleanup`           | daily + 3h           | Rust native    | 30-day raw/hourly/published retention, 7-day outbox DLQ, 90-day threat retention |
| `cleanup_clickhouse`   | weekly + 3h20m       | Rust native    | 180/365/730-day archive retention                                                |
| `optimize_database`    | daily + 4h           | Rust native    | `VACUUM ANALYZE` on core tables                                                  |

Native task errors are recorded on `scheduled_task_runs`, release the lease with
a bounded retry delay, and never transition to `completed`. `CLICKHOUSE_URL` is
therefore mandatory on `deml-scheduler`; missing configuration makes the weekly
cleanup fail visibly instead of silently succeeding.

## Rollback

Stop the affected Rust role before enabling its Python fallback. Set `PYTHON_EMBEDDED_SCHEDULERS_ENABLED=1` only when both `deml-probe` and `deml-scheduler` are stopped. The Python relay may be started only after every `deml-relay` replica is stopped or drained. The migration is additive; rollback does not require dropping data-plane tables.

## Acceptance gates

- Two relay replicas process a seeded backlog without concurrently leasing the same row.
- Killing a relay after broker acknowledgement produces at most an idempotent duplicate and no lost event.
- Restarting two scheduler replicas does not create a second logical task bucket.
- A Django outage does not stop probe observations or Outbox delivery.
- A poison `telemetry-raw` record reaches its DLQ before the source offset is committed.
- Firestore projections continue while raw telemetry normalization is intentionally stopped.
- Rust unit tests, Clippy with warnings denied, Django migration checks, backend tests, and `docker compose config` pass before promotion.
