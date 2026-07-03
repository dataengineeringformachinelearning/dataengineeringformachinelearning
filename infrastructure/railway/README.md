# Railway Infrastructure as Code

Declarative Railway service configs for DEML internal infrastructure. Each subdirectory contains a `railway.json` consumed by Railway's Dockerfile builder.

## Services

| Service | Config | Internal hostname |
| ------- | ------ | ----------------- |
| Redpanda queue | `queue/railway.json` | `deml-queue.railway.internal:9092` |
| Backend API | `backend/railway.json` | Set via Railway service name |
| deml-workers | `workers/railway.json` | — |
| deml-daemon | `daemon/railway.json` | — |
| Dragonfly | `dragonfly/railway.json` | `deml-dragonfly.railway.internal` |
| ClickHouse | `clickhouse/railway.json` | — |
| Scanner | `scanner/railway.json` | `scanner.railway.internal` |

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
