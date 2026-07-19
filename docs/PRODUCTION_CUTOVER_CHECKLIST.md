# Production cutover checklist — FORJD + DEML

Single ops checklist for the final DEML → FORJD cutover. No overlapping data planes.
Deploy commands: [`PRODUCTION_DEPLOY.md`](./PRODUCTION_DEPLOY.md).

| Layer                                             | Owner | Host                                     | Status (2026-07-18)         |
| ------------------------------------------------- | ----- | ---------------------------------------- | --------------------------- |
| Angular UI                                        | DEML  | **Vercel** project `deml`                | **Live** (`deml.app` 200)   |
| Django BFF / Firebase identity                    | DEML  | **Fly** `deml-backend`                   | **Live** (ready)            |
| Sealed streaming, projections, ML, exports, vulns | FORJD | **Fly** `forjd-backend` + `forjd-engine` | **Live** (RLS + engine All) |
| Cache (data plane)                                | FORJD | **Fly** Dragonfly                        | **Live**                    |
| Control-plane Postgres                            | DEML  | Neon (optional → Supabase `deml`)        | **Live**                    |
| Data-plane Postgres                               | FORJD | Supabase `public`                        | **Live**                    |

**Do not** run Redpanda, ClickHouse, deml-dragonfly, or DEML Rust workers in production.

**Cutover phase:** steady state — `FORJD_CUTOVER_PHASE=2` / write+read `forjd`.

---

## A. FORJD (Fly)

| Step | Action                                                                 | Status                                                   |
| ---- | ---------------------------------------------------------------------- | -------------------------------------------------------- |
| A1   | Apply SQL `003` → `018` on Supabase                                    | **Done** (`schema_rls=true`)                             |
| A2   | Apply SQL `019` (least-privilege erase default)                        | **Pending** on next migrate                              |
| A3   | Remint `fjsvc_` after `017`–`019` (include erase for DEML delete saga) | **Done** for current token; remint after `019` if needed |
| A4   | Fly secrets + deploy `forjd-backend` / `forjd-engine`                  | **Live**                                                 |
| A5   | `curl -fsS https://backend.forjd.co/ready`                             | **Pass**                                                 |
| A6   | Sealed smoke: session → ingest → projections                           | **Operator confirm** with service token                  |

```bash
./scripts/remint_service_account.sh deml-production   # in forjd repo
```

## B. DEML Fly + Vercel

| Step | Action                                                         | Status                                       |
| ---- | -------------------------------------------------------------- | -------------------------------------------- |
| B1   | Fly secrets: `DATABASE_URL`, `FORJD_*`, Firebase, Stripe, CORS | **Done**                                     |
| B2   | `fly deploy -a deml-backend` (latest `main`)                   | **Live**; redeploy after security/perf merge |
| B3   | `map_forjd_tenant` for production accounts                     | **Operator confirm**                         |
| B4   | `/api/v1/health` + `/api/v1/ready`                             | **Pass**                                     |
| B5   | Vercel `deml` — `BACKEND_URL=https://backend.deml.app`         | **Live**                                     |
| B6   | `FORJD_CUTOVER_PHASE=2`                                        | **Configured**                               |
| B7   | Angular smoke (login, CES, status, vulns, exports)             | **Operator confirm**                         |

```bash
cd backend && fly deploy -a deml-backend
cd frontend && npx vercel deploy --prod --yes
```

## C. Retire legacy Railway

| Step | Action                                     | Status                |
| ---- | ------------------------------------------ | --------------------- |
| C1   | Data-plane services deleted                | **Done**              |
| C2   | `deml-frontend` / `deml-dragonfly` retired | **Done**              |
| C3   | Railway `deml-backend` cold standby        | **Optional teardown** |
| C4   | Detached volumes purge                     | **Optional**          |

```bash
python scripts/railway_audit.py --apply --service deml-backend
python scripts/railway_retire_dataplane.py --apply
```

## D. Separation invariants (no overlaps)

| Concern                   | DEML                                  | FORJD                                          |
| ------------------------- | ------------------------------------- | ---------------------------------------------- |
| End-user auth             | Firebase                              | Supabase Auth (platform) / `fjsvc_` (partners) |
| Browser API               | Django only                           | Never called with Firebase tokens              |
| Ingest / projections / ML | BFF → FORJD                           | Owns storage + processing                      |
| Sessions (browser)        | Postgres `browser_sessions`           | Crypto sessions (E2EE)                         |
| Cache                     | None required                         | Fly Dragonfly                                  |
| Tenant erase              | Calls FORJD erase then local teardown | `POST /api/v1/tenants/{id}/erase`              |

## E. Rollback (quick reference)

| Symptom                | Action                                           |
| ---------------------- | ------------------------------------------------ |
| FORJD 5xx / bad shapes | `FORJD_CUTOVER_PHASE=1` or `0` on `deml-backend` |
| Bad Vercel build       | Promote previous Vercel deployment               |
| Bad Fly Django         | Prior `deml-backend` release                     |
| Wrong token            | Remint + `fly secrets set FORJD_SERVICE_TOKEN=…` |
| Stop FORJD IO          | `FORJD_WRITE_MODE=off` + `FORJD_READ_MODE=off`   |

Never re-enable Redpanda/ClickHouse as rollback.

## F. Production readiness verdict

| Gate                                | Result                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------ |
| Angular UI functional (hosts + BFF) | **Ready** — UI unchanged; adapters on FORJD                              |
| Sealed path E2E (platform)          | **Ready** — FORJD `/ready` + engine All; BFF token wired                 |
| Docs / deploy runbooks              | **Ready** — `PRODUCTION_DEPLOY.md`                                       |
| Remaining polish                    | sql/019 apply, redeploy security/perf commits, optional Railway teardown |

**Both repos are ready for production cutover.** Complete pending migrate/remint/redeploy steps in A2–A3 / B2, then run smoke B7 + A6.
