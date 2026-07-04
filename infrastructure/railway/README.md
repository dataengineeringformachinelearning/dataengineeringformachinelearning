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
| deml-daemon           | `daemon/railway.json`           | —                                  |
| Scanner               | `scanner/railway.json`          | `scanner.railway.internal`         |

ClickHouse (`deml-clickhouse`), Dragonfly, Tor proxy, CPE guesser and similar infra services use their `Dockerfile` directly (config path often points at the `infrastructure/xxx` dir or root with explicit dockerfilePath in Railway UI). Deprecated services (e.g. dtrack, otel-collector) may still exist for cleanup only.

See `scripts/railway_env_cleanup.py` for the full list of active `deml-*` services.

## Deployment

1. Link each Railway service to its config directory (Settings → Build → Config path).
2. Set shared secrets via Railway variables: `DATABASE_URL`, `REDPANDA_BROKERS`, `INTERNAL_SECRET`, `REDPANDA_SASL_*`.
3. Run `python scripts/railway_env_cleanup.py --dry-run` before deploy to strip polluted env vars.

## Health checks

Railway health checks are defined per `railway.json`. Verify deployment status in the Railway dashboard or:

```bash
curl -sf "$BACKEND_URL/api/v1/system-status/health"
```

## Cron / workers

Scheduled tasks are published by `deml-daemon` cron_publisher to the `internal-tasks` Redpanda topic. The `deml-workers` container consumes and dispatches whitelisted Django management commands.

| Task                   | Cadence | Command               |
| ---------------------- | ------- | --------------------- |
| Analytics aggregation  | 1h      | `aggregate_analytics` |
| Subscription sync      | 6h      | `sync_subscriptions`  |
| Account reconciliation | 6h      | `reconcile_accounts`  |
| Database cleanup       | 24h     | `db_cleanup`          |
| Model training         | 7d      | `train_all_models`    |
| Key rotation           | 90d     | `rotate_keys`         |

Do not run both Rust `deml-daemon` outbox relay and Python `relay_start.py` against the same Redpanda cluster — pick one relay path per environment.
