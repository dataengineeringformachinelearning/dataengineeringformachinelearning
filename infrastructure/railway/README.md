# Railway Infrastructure as Code

Declarative Railway service configs for DEML internal infrastructure. Each subdirectory contains a `railway.json` consumed by Railway's Dockerfile builder.

## Services

| Service               | Config                          | Internal hostname                  |
| --------------------- | ------------------------------- | ---------------------------------- |
| Redpanda queue        | `../queue/railway.json`         | `deml-queue.railway.internal:9092` |
| Frontend              | `frontend/railway.json`         | Set via Railway service name       |
| Backend API           | `backend/railway.json`          | Set via Railway service name       |
| deml-workers          | `workers/railway.json`          | —                                  |
| deml-telemetry-worker | `telemetry-worker/railway.json` | —                                  |
| deml-relay            | `relay/railway.json`            | internal health port               |
| deml-scheduler        | `scheduler/railway.json`        | internal health port               |
| deml-probe            | `probe/railway.json`            | internal health port               |
| deml-normalizer       | `normalizer/railway.json`       | internal health port               |
| deml-ingest           | `ingest/railway.json`           | public integration ingress         |
| deml-cpe              | `cpe/railway.json`              | `deml-cpe.railway.internal`        |
| Scanner               | `scanner/railway.json`          | `scanner.railway.internal`         |

ClickHouse (`deml-clickhouse`), Dragonfly, Tor proxy, CPE guesser and similar infra services use their `Dockerfile` directly (config path often points at the `infrastructure/xxx` dir or root with explicit dockerfilePath in Railway UI). Deprecated services (e.g. dtrack, otel-collector) may still exist for cleanup only.

See `scripts/railway_env_cleanup.py` for the full list of active `deml-*` services.

## Deployment

1. Link each Railway service to its config directory (Settings → Build → Config path).
2. Set shared secrets via Railway variables: `DATABASE_URL`, `REDPANDA_BROKERS`, `REDPANDA_SASL_*`; set `REDIS_URL` on `deml-ingest`.
3. Run `python scripts/railway_env_cleanup.py --dry-run` before deploy to strip polluted env vars.

## Health checks

Railway health checks are defined per `railway.json`. Verify deployment status in the Railway dashboard or:

```bash
curl -sf "$BACKEND_URL/api/v1/system-status/health"
```

## Cron / workers

Scheduled tasks are materialized and published by `deml-scheduler` to the `internal-tasks` Redpanda topic. The `deml-workers` container claims the durable run and dispatches a whitelisted Django management command before explicitly committing its Kafka offset.

| Task                   | Cadence | Command               |
| ---------------------- | ------- | --------------------- |
| Analytics aggregation  | 1h      | `aggregate_analytics` |
| Subscription sync      | 24h     | `sync_subscriptions`  |
| Account reconciliation | 24h     | `reconcile_accounts`  |
| Database cleanup       | 24h     | `db_cleanup`          |
| Model training         | 24h     | `train_all_models`    |
| Key policy check       | 24h     | `rotate_keys_if_due`  |

Set `DEML_ROLE` to the service name without the `deml-` prefix. The `cpe` role also requires `CPE_REDIS_URL` pointing at database 8 after the pinned Python importer job has populated it. Do not enable the Python relay, pinger, or embedded interval schedulers while the corresponding Rust roles run. Multiple replicas of a Rust role are supported through Postgres leases and idempotency constraints.
