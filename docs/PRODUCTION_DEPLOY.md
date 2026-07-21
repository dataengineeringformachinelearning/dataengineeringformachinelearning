# Production deploy — DEML (Vercel + Fly) → FORJD

Operator runbook for production. Pair with
[`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md),
[`FORJD_INTEGRATION.md`](./FORJD_INTEGRATION.md),
[`FLY.md`](./FLY.md), [`VERCEL.md`](./VERCEL.md).

**Last live baseline (2026-07-18, before the SIEM/SOAR hardening in this
change set):**

| Check                                    | Result                                            |
| ---------------------------------------- | ------------------------------------------------- |
| `https://deml.app`                       | HTTP 200                                          |
| `https://deml.vercel.app`                | HTTP 200                                          |
| `https://backend.deml.app/api/v1/health` | `ok` / user-control-plane                         |
| `https://backend.deml.app/api/v1/ready`  | DB ok + FORJD URL/token/tenant configured         |
| Fly `deml-backend`                       | started, 2/2 checks passing (iad)                 |
| `https://backend.forjd.co/ready`         | postgres + redis + `schema_rls` + engine `All`    |
| FORJD modes                              | `FORJD_WRITE_MODE=forjd`, `FORJD_READ_MODE=forjd` |

Treat this table as the rollback baseline, not proof that the new migrations
are deployed. Re-run every check in this runbook after applying the DEML and
FORJD migrations below.

---

## 1. Vercel — Angular (`deml`)

```bash
cd frontend
npx vercel link --project deml --yes

# Required production env (baked at build by set-env.js)
npx vercel env add BACKEND_URL production --value 'https://backend.deml.app' --force --yes --no-sensitive
npx vercel env add FRONTEND_URL production --value 'https://deml.app' --force --yes --no-sensitive
npx vercel env add MARKETING_URL production --value 'https://dataengineeringformachinelearning.com' --force --yes --no-sensitive
# Also set FIREBASE_* web config (see docs/VERCEL.md)

npx vercel deploy --prod --yes

# Confirm SPA XSS headers (site-wide CSP from vercel.json)
curl -sI https://deml.app | grep -Ei 'content-security-policy|x-content-type-options'
```

| Setting        | Value                              |
| -------------- | ---------------------------------- |
| Root Directory | `frontend`                         |
| Output         | `dist/frontend/browser`            |
| Node           | 24.x                               |
| Domain         | `deml.app` → Vercel project `deml` |

**Never** set `BACKEND_URL` to `backend.forjd.co` or localhost.

Browser CSRF/XSS model: [`SECURITY_BROWSER.md`](./SECURITY_BROWSER.md).

---

## 2. Fly.io — Django BFF (`deml-backend`)

```bash
cd backend
fly deploy -a deml-backend

# Steady-state FORJD modes
fly secrets set FORJD_WRITE_MODE=forjd FORJD_READ_MODE=forjd -a deml-backend

curl -fsS https://backend.deml.app/api/v1/health
curl -fsS https://backend.deml.app/api/v1/ready
fly checks list -a deml-backend
```

`start.py` applies Django migrations before accepting traffic. The release must
include `monitor/0058_bugreport_delivery_outbox` and
`monitor/0059_headless_rate_limit_bucket`; confirm both are applied after the
deploy:

```bash
fly ssh console -a deml-backend -C \
  "python manage.py showmigrations monitor"
```

Required secrets: see [`FLY.md`](./FLY.md) (`DATABASE_URL`, Firebase, `FORJD_API_URL`,
`FORJD_SERVICE_TOKEN`, `FORJD_TENANT_ID`, CORS/CSRF for `deml.app`).

Map accounts (secret ref only):

```bash
fly ssh console -a deml-backend -C \
  "python manage.py map_forjd_tenant <deml-account-uuid> <forjd-tenant-uuid> --service-token-secret-ref env:FORJD_SERVICE_TOKEN"
```

---

## 3. FORJD (dependency — deploy first)

On the FORJD repo:

```bash
# Schema (003 → 025: least-privilege auth, SIEM/SOAR, exports, and durable ingest)
cd backend && uv run python scripts/apply_sql_migrations.py
POSTGRES_DSN='…' uv run python scripts/verify_supabase_post_migration.py

# Remint the DEML partner token so the stored scopes include the new surfaces.
# Add tenants:erase only when account deletion is enabled.
./scripts/remint_service_account.sh deml-production
# Account deletion enabled for this DEML deployment:
# FORJD_INCLUDE_ERASE=1 ./scripts/remint_service_account.sh deml-production
# → set Fly deml-backend FORJD_SERVICE_TOKEN + FORJD_TENANT_ID

cd backend && fly deploy -a forjd-backend
cd engine && fly deploy -a forjd-engine

curl -fsS https://backend.forjd.co/ready
curl -fsS https://forjd-engine.fly.dev/ready
```

---

## 4. Rollback

| Symptom                 | Action                                                             |
| ----------------------- | ------------------------------------------------------------------ |
| Bad Angular build       | Vercel → Promote previous deployment                               |
| Bad Django deploy       | `fly releases -a deml-backend` → deploy prior image                |
| FORJD 5xx / bad shapes  | Pause reads/writes: `FORJD_WRITE_MODE=off` + `FORJD_READ_MODE=off` |
| Wrong `fjsvc_`          | Remint on FORJD → rotate Fly secret → remap if needed              |
| Engine data-plane fault | On FORJD: `fly secrets set FORJD_ROLE=engine -a forjd-engine`      |

---

## 5. Smoke (Angular + sealed path)

1. Open `https://deml.app` → Firebase login → `/dashboard` CES loads.
2. Status pages: create page → add service → create incident (BFF → FORJD).
3. Submit a SIEM signal, observe its correlated case, execute a playbook, then
   acknowledge or retry a partner-owned action through DEML.
4. Vulns list + exports list return FORJD-backed JSON; create an idempotent
   export, poll it to completion, and obtain its short-lived signed download.
   A dependency outage is a typed `503` in steady mode.
5. Sealed path (service token / staging): register crypto session →
   `POST /api/v1/ingest` (via Django sealed adapter) → `GET` projections.
6. Exceed a staging headless quota and verify `429`, `Retry-After`, and
   `X-RateLimit-*` are scoped to the credential/account.
7. Staging account delete: FORJD erase then local teardown, including private
   export/report artifacts and durable processing metadata.

---

## Production readiness

| Surface                | Current gate                                                                  |
| ---------------------- | ----------------------------------------------------------------------------- |
| Angular on Vercel      | Local tests/build pass; deploy and re-check `BACKEND_URL`                     |
| Django BFF on Fly      | Apply migrations `0058`–`0059`; verify API + outbox worker health             |
| FORJD sealed plane     | Apply SQL `020`–`025`; verify Postgres, Dragonfly, engine, and object storage |
| FORJD write/read modes | Set both to `forjd` only after the staged end-to-end smoke passes             |

**Verdict:** the code and local contract suites are release-ready. Do not call
the production cutover complete until both migration sets are applied, the
DEML `fjsvc_` credential is reminted with the required scopes, private object
storage is configured, and the live smoke sequence above passes.
