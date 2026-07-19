# Production deploy — DEML (Vercel + Fly) → FORJD

Operator runbook for production. Pair with
[`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md),
[`FORJD_INTEGRATION.md`](./FORJD_INTEGRATION.md),
[`FLY.md`](./FLY.md), [`VERCEL.md`](./VERCEL.md).

**Verified live (2026-07-18):**

| Check                                    | Result                                            |
| ---------------------------------------- | ------------------------------------------------- |
| `https://deml.app`                       | HTTP 200                                          |
| `https://deml.vercel.app`                | HTTP 200                                          |
| `https://backend.deml.app/api/v1/health` | `ok` / user-control-plane                         |
| `https://backend.deml.app/api/v1/ready`  | DB ok + FORJD URL/token/tenant configured         |
| Fly `deml-backend`                       | started, 2/2 checks passing (iad)                 |
| `https://backend.forjd.co/ready`         | postgres + redis + `schema_rls` + engine `All`    |
| FORJD modes                              | `FORJD_WRITE_MODE=forjd`, `FORJD_READ_MODE=forjd` |

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
```

| Setting        | Value                              |
| -------------- | ---------------------------------- |
| Root Directory | `frontend`                         |
| Output         | `dist/frontend/browser`            |
| Node           | 24.x                               |
| Domain         | `deml.app` → Vercel project `deml` |

**Never** set `BACKEND_URL` to `backend.forjd.co` or localhost.

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
# Schema (includes sql/019 least-privilege erase default)
cd backend && uv run python scripts/apply_sql_migrations.py

# Remint partner token with erase for account deletion
./scripts/remint_service_account.sh deml-production
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
3. Vulns list + exports list return FORJD-backed JSON (or empty-stable).
4. Sealed path (service token / staging): register crypto session →
   `POST /api/v1/ingest` (via Django sealed adapter) → `GET` projections.
5. Staging account delete: FORJD erase then local teardown.

---

## Production readiness

| Surface                | Ready?                                                            |
| ---------------------- | ----------------------------------------------------------------- |
| Angular on Vercel      | **Yes** — `deml.app` / `deml.vercel.app` 200; `BACKEND_URL` → Fly |
| Django BFF on Fly      | **Yes** — health/ready passing; FORJD wired                       |
| FORJD sealed plane     | **Yes** — `/ready` RLS + engine `All` + Dragonfly                 |
| FORJD write/read modes | **Yes** — `forjd` / `forjd`                                       |

**Verdict:** DEML and FORJD are production-ready. Apply FORJD `sql/019` and
mint or rotate tokens as needed, then run the smoke list above.
