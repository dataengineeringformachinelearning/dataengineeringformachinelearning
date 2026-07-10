# Railway Infrastructure as Code

Declarative Railway service configs for DEML internal infrastructure. Each subdirectory contains a `railway.json` consumed by Railway's Dockerfile builder.

Ops cutover order and failure semantics: **[docs/rust-data-plane.md](../../docs/rust-data-plane.md)**.

## Services

| Service               | Config                          | Role / notes                              |
| --------------------- | ------------------------------- | ----------------------------------------- |
| Frontend              | `frontend/railway.json`         | Angular SSR                               |
| Backend API           | `backend/railway.json`          | Django control plane                      |
| deml-workers          | `workers/railway.json`          | Durable task claimer (`internal-tasks`)   |
| deml-telemetry-worker | `telemetry-worker/railway.json` | Projections consumer                      |
| deml-relay            | `relay/railway.json`            | `DEML_ROLE=relay`                         |
| deml-scheduler        | `scheduler/railway.json`        | `DEML_ROLE=scheduler`                     |
| deml-probe            | `probe/railway.json`            | `DEML_ROLE=probe`                         |
| deml-normalizer       | `normalizer/railway.json`       | `DEML_ROLE=normalizer`                    |
| deml-ingest           | `ingest/railway.json`           | `DEML_ROLE=ingest` (public ingress later) |
| deml-cpe              | `cpe/railway.json`              | `DEML_ROLE=cpe`                           |
| Scanner               | `scanner/railway.json`          | OSINT scanner                             |

ClickHouse, Dragonfly, Tor, and similar infra use their Dockerfiles directly in the Railway UI. Deprecated monolith `deml-daemon` should be removed after the six role services are healthy.

See `scripts/railway_env_cleanup.py` for the active `deml-*` service set used during env hygiene.

## Required Railway variables (by service)

Shared on all Rust data-plane roles + Django API/workers:

| Variable           | Required by                                     |
| ------------------ | ----------------------------------------------- |
| `DATABASE_URL`     | All Rust roles + Django                         |
| `REDPANDA_BROKERS` | relay, scheduler, normalizer (+ Django workers) |
| `REDPANDA_SASL_*`  | Same, when production auth is enabled           |
| `REDPANDA_SSL`     | `true` when using SASL_SSL                      |
| `STRUCTURED_LOGS`  | Recommended `true`                              |
| `PORT`             | Optional; defaults to `8080` for Rust health    |

Role-specific:

| Variable                                             | Service(s)                                                        |
| ---------------------------------------------------- | ----------------------------------------------------------------- |
| `REDIS_URL`                                          | **deml-ingest** (fail-closed)                                     |
| `CPE_REDIS_URL`                                      | **deml-cpe** (Dragonfly DB 8)                                     |
| `PINGER_INTERVAL_SECS`                               | deml-probe (optional, default 30)                                 |
| `MAX_CONCURRENCY`                                    | probe/relay (optional, default 64)                                |
| `BATCH_SIZE` / `POLL_INTERVAL_SECS` / `MAX_ATTEMPTS` | deml-relay                                                        |
| `PYTHON_EMBEDDED_SCHEDULERS_ENABLED=0`               | deml-workers, deml-telemetry-worker (also forced in startCommand) |

`DEML_ROLE` is set by each service's `startCommand` in `railway.json` — do not leave a bare `deml-daemon` image without a role.

## Deployment (aligned with docs/rust-data-plane.md)

1. **Migrate control plane** (Django/backend first):
   ```bash
   # on deml-backend release / one-off shell
   python manage.py migrate
   ```
   Confirm `0041_rust_data_plane` and `0042_alter_outboxevent_available_at` are applied.
2. Link each Railway service to its config path (`infrastructure/railway/<service>/`).
3. Set variables above; run `python scripts/railway_env_cleanup.py --dry-run` before broad env edits.
4. **Start `deml-relay`**; stop any Python `outbox_relay` / `relay_start.py` process.
5. **Start `deml-normalizer`**; watch `telemetry-raw` / `telemetry-raw-dlq`.
6. **Start `deml-probe`** with Python embedded schedulers **off**.
7. **Start `deml-scheduler`** with the same flag off on workers.
8. **CPE**: run the pinned Python importer job into Dragonfly DB 8, then start **deml-cpe**.
9. **deml-ingest** only after API-key/quota canaries; keep Swagger demo on Django during cutover.

Do not flip every owner in one deploy. Observe one full cadence before the next role.

## Health checks

Rust roles expose `/health` and `/ready` (Railway healthcheck uses `/ready`). Backend:

```bash
curl -sf "$BACKEND_URL/api/v1/system-status/health"
```

Per role:

```bash
curl -sf "http://$SERVICE.railway.internal:${PORT:-8080}/ready"
```

## Cron / workers

Scheduled tasks are materialized by **deml-scheduler** onto `internal-tasks`. **deml-workers** claims the durable `scheduled_task_runs` row and runs a whitelisted management command.

| Task                   | Cadence      | Command                |
| ---------------------- | ------------ | ---------------------- |
| Analytics aggregation  | 1h           | `aggregate_analytics`  |
| Subscription sync      | 24h          | `sync_subscriptions`   |
| Account reconciliation | 24h          | `reconcile_accounts`   |
| Database cleanup       | 24h          | `db_cleanup`           |
| Model training         | 24h          | `train_all_models`     |
| Key policy check       | 24h          | `rotate_keys_if_due`   |
| DB optimize            | as scheduled | `optimize_database`    |
| TAXII ingest           | as scheduled | `ingest_taxii`         |
| Lighthouse             | as scheduled | `run_lighthouse_scans` |

Multiple replicas of a Rust role are supported via Postgres leases and idempotency constraints. Never run the Python relay, pinger, or embedded interval schedulers beside the equivalent Rust role.
