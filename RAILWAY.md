# Railway Deployment & Environment Variables

**Canonical reference for the DEML platform deployment on Railway.**

The platform runs as a multi-service architecture on Railway (project: `deml`).

## Services Overview (production)

- **deml-backend**: Django + Ninja API (https://backend.deml.app). Handles auth handoff, telemetry ingestion (Outbox), user data.
- **deml-frontend**: Angular SPA (https://deml.app). Built with `set-env.js` at deploy time.
- **deml-telemetry-worker**: Consumes Redpanda topics (`frontend-events`, `app-events`, ...), does idempotent projections to Firestore `deml` DB + enrichment.
- **deml-machine-learning-worker**: ML training/inference loops.
- **deml-security-worker**: Threat intel, OSINT, scanners.
- **deml-queue**: Redpanda (Kafka-compatible). Internal: `deml-queue.railway.internal:9092`.
- **deml-dragonfly**: Redis-compatible (Channels + rate limiting). Internal: `deml-dragonfly.railway.internal:6379`.
- **deml-postgres**: Primary transactional DB (OutboxEvent lives here).
- **deml-clickhouse**: OLAP for OpenTelemetry.
- **deml-otel-collector**: OpenTelemetry collector.
- **deml-scanner**, **deml-cpe-guesser**, **deml-dtrack-api**, **deml-tor-proxy**: Supporting infra services.

**Private internal DNS** (`.railway.internal`): Use these between services for low-latency, private networking. Never use public domains for inter-service traffic.

**Event Projections / Outbox**: No dedicated extra env vars. Relies on:

- `DATABASE_URL` + Postgres for transactional `OutboxEvent`.
- `REDPANDA_BROKERS` + `DRAGONFLY_HOST` for workers/relay.
- `outbox_relay` command (runs in worker or as separate process) + `telemetry_worker`.

Firebase Cloud Functions (`ingestEvent`) are deployed separately via GitHub Actions (`.github/workflows/...`). They use `REDPANDA_*` (may need public endpoint since CF cannot reach Railway internals) and fall back to Firestore.

## Cross-Site Auth Handoff & Marketing Integration (Env-Driven)

All hard-coded domains removed. Use the **same three names** everywhere:

| Variable        | Value (prod)                                    | Meaning                                             |
| --------------- | ----------------------------------------------- | --------------------------------------------------- |
| `FRONTEND_URL`  | `https://deml.app`                              | Angular app (status pages, dashboard, widget links) |
| `BACKEND_URL`   | `https://backend.deml.app`                      | Django API                                          |
| `MARKETING_URL` | `https://dataengineeringformachinelearning.com` | Astro marketing site                                |

**Where to set them:**

| Service                                                 | Variables needed                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| deml-backend                                            | `FRONTEND_URL`, `MARKETING_URL` (`BACKEND_URL` optional — inferred from deploy) |
| deml-frontend                                           | `FRONTEND_URL`, `BACKEND_URL`, `MARKETING_URL` (build via `set-env.js`)         |
| Marketing site (Astro, **not** in this Railway project) | `FRONTEND_URL`, `BACKEND_URL`, `MARKETING_URL` at **build** time                |

Legacy `PUBLIC_MAIN_APP_URL` / `PUBLIC_API_BASE` on marketing builds still work but are deprecated.

## Per-Service Environment Variables

### deml-backend (and most workers that share config)

Required / commonly set:

| Variable                                                  | Prod Example (internal)                                                                     | Notes                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------- |
| SECRET_KEY                                                | (secret)                                                                                    | Django               |
| DEBUG                                                     | False                                                                                       |                      |
| ALLOWED_HOSTS                                             | backend.deml.app,...                                                                        | CSV                  |
| DATABASE_URL                                              | postgresql://...@deml-postgres.../railway                                                   |                      |
| CORS_ALLOWED_ORIGINS                                      | https://deml.app,https://dataengineeringformachinelearning.com,https://backend.deml.app,... | Must be complete     |
| REDPANDA_BROKERS                                          | deml-queue.railway.internal:9092                                                            |                      |
| DRAGONFLY_HOST                                            | deml-dragonfly.railway.internal                                                             |                      |
| FIREBASE_SERVICE_ACCOUNT_JSON                             | (full JSON or file)                                                                         |                      |
| FRONTEND_URL                                              | https://deml.app                                                                            | Angular app links    |
| MARKETING_URL                                             | https://dataengineeringformachinelearning.com                                               | Auth handoff / CORS  |
| RESEND*API_KEY, ALERT*\*, DISCORD_WEBHOOK_URL, SENTRY_DSN | (as needed)                                                                                 |                      |
| All threat keys (ABUSEIPDB, OTX, IPINFO...)               | ...                                                                                         |                      |
| STRIPE\_\*                                                | ...                                                                                         |                      |
| GCP*KMS*\_ , HF\_\_                                       | ...                                                                                         |                      |
| RAILWAY\_\* (auto)                                        | ...                                                                                         | Injected by platform |

Additional for specific workers (same base +):

- telemetry / security / ml workers: same DB, REDPANDA, DRAGONFLY, Firebase SA.

### deml-frontend (Angular)

| Variable      | Example                                       | Notes                 |
| ------------- | --------------------------------------------- | --------------------- |
| FRONTEND_URL  | https://deml.app                              | Widget + status links |
| BACKEND_URL   | https://backend.deml.app                      | API base              |
| MARKETING_URL | https://dataengineeringformachinelearning.com | Auth handoff          |
| FIREBASE\_\*  | ...                                           |                       |
| SANITY\_\*    | ...                                           |                       |

`set-env.js` runs during Railway build and writes `src/environments/environment.ts`.

### deml-queue (Redpanda)

Minimal. Usually just `PORT=9092`. Expose `REDPANDA_BROKERS` to consumers. SASL/SSL configured in broker if needed; clients read `REDPANDA_SSL`, `REDPANDA_SASL_*`.

### deml-dragonfly

Minimal config. Consumers point via `DRAGONFLY_HOST`.

### Other supporting services

- **deml-clickhouse**: Provide host/user/pass to backend/workers where OLAP queries happen (e.g. `CLICKHOUSE_HOST`).
- **deml-scanner / cpe-guesser**: `CPE_GUESSER_URL=http://deml-cpe-guesser.railway.internal:1323/unique`
- Databases auto-provide `DATABASE_URL` style connection strings.

## Updating Environment Variables

1. Prefer setting in Railway dashboard (Variables tab per service) or via CLI.
2. After changing build-time vars (MARKETING*URL, BACKEND_URL, FIREBASE*\*) for frontend, trigger a new deploy so `set-env.js` runs.
3. Keep `backend/.env.example`, `frontend/.env.example`, and `marketing/.env.example` in sync with reality.

## CLI Examples

```bash
# Link (if needed)
railway link

# Set on specific service
railway variables --service deml-backend --set "MARKETING_URL=https://dataengineeringformachinelearning.com"
railway variables --service deml-frontend --set "MARKETING_URL=https://dataengineeringformachinelearning.com"

# Bulk view
railway variables --service deml-backend
```

## Local Development vs Prod

- Local uses `localhost` values + docker-compose or manual services.
- Prod strictly uses `*.railway.internal` for brokers/DB/cache.
- Firebase Functions use public or configured broker (or Firestore fallback documented in `functions/src/index.ts`).

## Security Notes

- Never commit real `.env`.
- Secrets (Stripe, Resend, Firebase SA, KMS, HF) should use Railway secret variables or Infisical integration.
- CORS/CSRF lists are the primary control for cross-origin auth handoff.

See also: `backend/.env.example`, `frontend/.env.example`, `marketing/.env.example`, BOOK.md (Event Projections chapter), and AGENTS.md (CORS rule: never hardcode domains).

Last updated: 2026-06-27 (added full handoff vars, Outbox notes, cleaned domains).
