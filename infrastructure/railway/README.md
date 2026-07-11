# Railway production topology (agent + human playbook)

**Canonical catalog:** [`services.json`](./services.json)
**Live drift check / safe apply:** `python scripts/railway_audit.py`
**Ops cutover semantics:** [`docs/rust-data-plane.md`](../../docs/rust-data-plane.md)

This directory is the single map of production Railway services for project **deml** / environment **production**. Agents and humans should treat `services.json` as source of truth for service names, Dockerfiles, `DEML_ROLE`s, required/forbidden env, and retired services. Do **not** invent service names or re-create retired ones.

## One-minute agent workflow

```bash
# 1. Confirm CLI is linked to deml / production
railway status

# 2. Dry-run audit (never prints secret values)
python scripts/railway_audit.py

# 3. Apply only safe fixes: missing envDefaults, RAILWAY_DOCKERFILE_PATH, strip forbiddenEnv
python scripts/railway_audit.py --apply

# 4. Machine-readable report (CI / agents)
python scripts/railway_audit.py --json
```

| Need                          | Command                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------ |
| List services                 | `railway service list`                                                         |
| Service status                | `railway service status --service deml-<name>`                                 |
| Logs                          | `railway logs --service deml-<name>`                                           |
| Deploy one Rust role          | `railway up --service deml-<role> --detach --ci`                               |
| Migrate control plane         | `cd backend && railway run --service deml-backend -- python manage.py migrate` |
| Env pollution cleanup (extra) | `python scripts/railway_env_cleanup.py --dry-run`                              |

Auth: Railway CLI token under `~/.railway` (already linked for this workspace). Never commit tokens or dump variable values into chat/logs.

## Service map

| Service                 | Class           | Config dir          | Image / Dockerfile                     | Notes                                                |
| ----------------------- | --------------- | ------------------- | -------------------------------------- | ---------------------------------------------------- |
| `deml-backend`          | django-api      | `backend/`          | `backend/Dockerfile`                   | Control plane; run migrations first                  |
| `deml-frontend`         | frontend        | `frontend/`         | `frontend/Dockerfile`                  | Public SSR only — no Django secrets                  |
| `deml-workers`          | django-worker   | `workers/`          | `backend/Dockerfile`                   | Claims `scheduled_task_runs`; schedulers **off**     |
| `deml-telemetry-worker` | django-worker   | `telemetry-worker/` | `backend/Dockerfile`                   | Projections consumer; schedulers **off**             |
| `deml-relay`            | rust-data-plane | `relay/`            | `rust/deml-daemon/Dockerfile`          | `DEML_ROLE=relay`                                    |
| `deml-scheduler`        | rust-data-plane | `scheduler/`        | same                                   | `DEML_ROLE=scheduler`                                |
| `deml-probe`            | rust-data-plane | `probe/`            | same                                   | `DEML_ROLE=probe`                                    |
| `deml-normalizer`       | rust-data-plane | `normalizer/`       | same                                   | `DEML_ROLE=normalizer`                               |
| `deml-ingest`           | rust-data-plane | `ingest/`           | same                                   | `DEML_ROLE=ingest` (public ingress when cut over)    |
| `deml-cpe`              | rust-data-plane | `cpe/`              | same                                   | `DEML_ROLE=cpe`; CPE `/unique` lookup                |
| `deml-scanner`          | infra-app       | `scanner/`          | `infrastructure/scanner/Dockerfile`    | OSINT scanner; points at `deml-cpe`                  |
| `deml-queue`            | infra           | `queue/`            | `infrastructure/queue/Dockerfile`      | Redpanda                                             |
| `deml-dragonfly`        | infra           | `dragonfly/`        | `infrastructure/dragonfly/Dockerfile`  | Redis-compatible cache                               |
| `deml-clickhouse`       | infra           | `clickhouse/`       | `infrastructure/clickhouse/Dockerfile` | OLAP / OTEL sink                                     |
| `deml-tor-proxy`        | infra           | `tor-proxy/`        | `infrastructure/tor-proxy/Dockerfile`  | Tor egress for scanners                              |
| `deml-rustfs`           | infra           | `rustfs/`           | `infrastructure/rustfs/Dockerfile`     | S3 report blobs (PDF/CSV/Parquet); volume at `/data` |

### Retired (do not recreate)

| Name               | Replacement                                   |
| ------------------ | --------------------------------------------- |
| `deml-daemon`      | Six role services (`deml-relay` … `deml-cpe`) |
| `deml-cpe-guesser` | `deml-cpe` + `CPE_GUESSER_URL` → deml-cpe     |

## Design rules (keep production manageable)

1. **One catalog.** Add or rename a service only by editing `services.json` + a matching `*/railway.json`, then re-audit.
2. **One Rust image, many roles.** Never force Django/infra into `DEML_ROLE`. Only the six `rust-data-plane` services use it (baked into `startCommand`).
3. **Least-privilege env.** Each service lists `requiredEnv` and `forbiddenEnv` in the catalog. Examples:
   - Frontend must never hold `DATABASE_URL` / `SECRET_KEY` / `INTERNAL_SECRET`
   - Rust roles must never hold `SECRET_KEY` / Firebase SA JSON / `INTERNAL_SECRET`
   - Infra (queue, dragonfly, tor) stays near-empty of app secrets
4. **Dockerfile path is explicit.** Every monorepo service sets `RAILWAY_DOCKERFILE_PATH` (audit enforces this). Root-context builds need it.
5. **Python schedulers off next to Rust.** `PYTHON_EMBEDDED_SCHEDULERS_ENABLED=0` on `deml-workers` and `deml-telemetry-worker` (env + startCommand).
6. **CPE consumers point at a TLS endpoint for deml-cpe:**
   `CPE_GUESSER_URL=https://<internal-cpe-domain>/unique`
7. **No dual ownership.** Never run Python `outbox_relay` / embedded pinger beside the equivalent Rust role. See cutover order in `docs/rust-data-plane.md`.

## What `railway_audit.py` does / does not do

| Does                                                    | Does not                                   |
| ------------------------------------------------------- | ------------------------------------------ |
| Report missing required keys (names only)               | Print or log secret **values**             |
| Set catalog `envDefaults` and `RAILWAY_DOCKERFILE_PATH` | Create/delete Railway services             |
| Delete `forbiddenEnv` keys when `--apply`               | Rewrite arbitrary live env to match a dump |
| Align `CPE_GUESSER_URL` on backend/workers/scanner      | Deploy code or run migrations              |

For broader Infisical-style pollution (stale Postgres plugin vars, secrets on infra), use `scripts/railway_env_cleanup.py --dry-run` first.

## Required variables (summary)

Shared on Rust data-plane roles + Django API/workers:

| Variable                     | Who needs it                                                       |
| ---------------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`               | All Rust roles + Django; `sslmode=verify-full`                     |
| `REDPANDA_BROKERS`           | relay, scheduler, normalizer (+ Django)                            |
| `REDPANDA_SECURITY_PROTOCOL` | Internal mTLS clients use `SSL`; external Firebase uses `SASL_SSL` |
| `REDPANDA_SSL_*_B64`         | Kafka CA/client certificate/private key as base64 PEM              |
| `DEML_INTERNODE_*`           | Kafka publishers/consumers; active key plus rotation keyring       |
| `DEML_TRANSPORT_SECURITY`    | Production value is `required`                                     |
| `REDIS_SSL_CA_B64`           | Private CA for verified Dragonfly TLS                              |
| `REDPANDA_SASL_*`            | External Firebase listener username/password                       |
| `STRUCTURED_LOGS`            | Recommended `true`                                                 |
| `PORT`                       | Optional; Rust defaults health to `8080`                           |

The `deml-queue` service also requires `REDPANDA_TLS_CERT_B64`,
`REDPANDA_TLS_KEY_B64`, and `REDPANDA_TLS_CA_B64`. The server certificate must
cover every advertised Kafka hostname. Internal port 9092 requires a client
certificate signed by that CA; external port 9093 uses verified TLS plus
SCRAM-SHA-256. Generate and rotate certificates through the deployment secret
manager or organizational PKI—never store PEM material in this repository.

Role-specific:

| Variable                               | Service(s)                           |
| -------------------------------------- | ------------------------------------ |
| `REDIS_URL`                            | **deml-ingest** (fail-closed)        |
| `CPE_REDIS_URL`                        | **deml-cpe** (Dragonfly DB 8)        |
| `CPE_GUESSER_URL`                      | backend, workers, scanner → deml-cpe |
| `PYTHON_EMBEDDED_SCHEDULERS_ENABLED=0` | deml-workers, deml-telemetry-worker  |
| `NORMALIZER_GROUP_ID`                  | deml-normalizer (default in catalog) |

`DEML_ROLE` is set by each Rust service’s `startCommand` in `railway.json` — do not run a bare `deml-daemon` image without a role.

## Deployment order (production)

1. **Migrate control plane** on `deml-backend` (`0041_rust_data_plane`, `0042_alter_outboxevent_available_at`).
2. Ensure each service’s root-directory / config path points at `infrastructure/railway/<service>/` and Dockerfile path is set (audit).
3. Start **deml-relay**; stop any Python `outbox_relay`.
4. Start **deml-normalizer**; watch `telemetry-raw` / `telemetry-raw-dlq`.
5. Start **deml-probe** with Python embedded schedulers **off**.
6. Start **deml-scheduler** with the same flag off on workers.
7. **CPE**: importer job → Dragonfly DB 8, then **deml-cpe**.
8. **deml-ingest** only after API-key/quota canaries; keep Swagger demo on Django during cutover.

Do not flip every owner in one deploy. Observe one full cadence before the next role.

## Health checks

Rust roles: `/health` and `/ready` (Railway healthcheck uses `/ready`). Backend:

```bash
curl -sf "$BACKEND_URL/api/v1/system-status/health"
```

Internal health endpoints must also be exposed through an authenticated TLS route
before production use:

```bash
curl -sf "https://$DEML_RELAY_INTERNAL_HOST/ready"
```

## Cron / workers

**deml-scheduler** materializes UTC buckets onto `internal-tasks`. **deml-workers** claims `scheduled_task_runs` and runs a whitelisted management command.

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

Multiple replicas of a Rust role are safe via Postgres leases and idempotency constraints.

## Changing the topology (checklist)

1. Edit `services.json` (required/forbidden/defaults/class/dockerfile).
2. Add or update `infrastructure/railway/<service>/railway.json`.
3. `python scripts/railway_audit.py` → fix drift → `--apply` if defaults/forbidden only.
4. Deploy the affected service; for control-plane schema, migrate first.
5. If architectural, note cutover impact in `docs/rust-data-plane.md` / BOOK as needed.
6. Never re-add names under `retired` in `services.json`.
