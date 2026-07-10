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
