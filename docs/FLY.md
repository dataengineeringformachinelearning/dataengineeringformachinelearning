# DEML Django on Fly.io (`deml-backend`)

Primary host for the DEML **user control plane** (Firebase identity, billing, BFF → FORJD).
Angular stays on Vercel (`docs/VERCEL.md`). FORJD owns streaming/processing on Fly/Vercel separately.

```text
Browser (Vercel deml.app)
  → deml-backend (Fly)     Firebase JWT + session registry (Postgres)
    → FORJD (backend.forjd.co)   fjsvc_ service token
      → Supabase (FORJD platform DB) / Fly Dragonfly (FORJD cache)
```

## App settings

| Setting       | Value                                              |
| ------------- | -------------------------------------------------- |
| App name      | `deml-backend`                                     |
| Config        | `backend/fly.toml`                                 |
| Region        | `iad` (override with `fly regions set …`)          |
| Image         | `backend/Dockerfile` (distroless + Daphne)         |
| Internal port | `8080`                                             |
| Liveness      | `GET /api/v1/health`                               |
| Readiness     | `GET /api/v1/ready` (Postgres + FORJD env present) |

## Database (Neon or Supabase)

| Phase                   | `DATABASE_URL`                                               |
| ----------------------- | ------------------------------------------------------------ |
| **Current**             | Neon Postgres URI with `sslmode=verify-full`                 |
| **After consolidation** | Supabase **pooler** URI + `DATABASE_SEARCH_PATH=deml,public` |

Never restore DEML tables into FORJD’s `public` schema — see FORJD `docs/NEON_TO_SUPABASE.md`.

## Secrets (required)

Set from `backend/` (values never printed by these docs):

```bash
cd backend

fly apps create deml-backend   # once

fly secrets set \
  SECRET_KEY="$(openssl rand -base64 48)" \
  DATABASE_URL='postgresql://USER:PASS@HOST:5432/DB?sslmode=verify-full' \
  FIREBASE_PROJECT_ID=demldotcom \
  FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' \
  FORJD_API_URL=https://backend.forjd.co \
  FORJD_SERVICE_TOKEN='fjsvc_xxxxxxxx_…' \
  FORJD_TENANT_ID='xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' \
  FRONTEND_URL=https://deml.app \
  BACKEND_URL=https://backend.deml.app \
  MARKETING_URL=https://dataengineeringformachinelearning.com \
  ALLOWED_HOSTS=backend.deml.app,deml-backend.fly.dev \
  CORS_ALLOWED_ORIGINS=https://deml.app,https://deml.vercel.app,https://dataengineeringformachinelearning.com \
  CSRF_TRUSTED_ORIGINS=https://deml.app,https://deml.vercel.app,https://dataengineeringformachinelearning.com,https://backend.deml.app
```

Optional:

```bash
fly secrets set \
  STRIPE_PUBLIC_KEY=pk_… \
  STRIPE_SECRET_KEY=sk_… \
  STRIPE_WEBHOOK_SECRET=whsec_… \
  RESEND_API_KEY=re_… \
  SENTRY_DSN=https://… \
  DATABASE_SEARCH_PATH=deml,public
```

Do **not** set `REDIS_URL` / `DRAGONFLY_*` (retired). Do **not** set Redpanda/ClickHouse/data-plane env.

Non-secret cutover defaults are already in `fly.toml` (`FORJD_CUTOVER_PHASE=2`, write/read `forjd`).

## Deploy

```bash
cd backend
fly deploy
```

Verify:

```bash
fly status
fly checks list
curl -fsS https://deml-backend.fly.dev/api/v1/health
curl -fsS https://deml-backend.fly.dev/api/v1/ready
# FORJD reachability (uses service token server-side via /api/v1/forjd/health if exposed)
```

## Custom domain

```bash
fly certs add backend.deml.app
# Point DNS CNAME backend.deml.app → deml-backend.fly.dev
```

Update Vercel `BACKEND_URL=https://backend.deml.app` and Firebase authorized domains as needed.

## FORJD wiring

| Env                                    | Role                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `FORJD_API_URL`                        | HTTPS base for sealed ingest / projections / replay (`https://backend.forjd.co`) |
| `FORJD_SERVICE_TOKEN`                  | Opaque `fjsvc_…` — never a Firebase or Supabase `service_role` JWT               |
| `FORJD_TENANT_ID`                      | Mapped tenant UUID                                                               |
| `FORJD_*_MODE` / `FORJD_CUTOVER_PHASE` | Cutover controls (`docs/CUTOVER.md`)                                             |

Django remains the only browser-facing API for user management. Streaming/processing always goes through `ForjdClient` → FORJD.

## Local Docker parity

```bash
cd backend
docker build -t deml-backend .
docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  -e SECRET_KEY=dev \
  -e DEBUG=true \
  -e DATABASE_URL=postgresql://… \
  -e FORJD_API_URL=https://backend.forjd.co \
  -e FORJD_SERVICE_TOKEN=fjsvc_… \
  -e FORJD_TENANT_ID=… \
  deml-backend
```

(`DEBUG=true` skips PaaS production validators; Fly injects `FLY_APP_NAME` and enforces secrets.)

## Rollback

- Keep Railway `deml-backend` as standby until DNS cutover is stable, **or**
- `fly releases` / `fly deploy --image <previous>` to roll back the Fly release.
