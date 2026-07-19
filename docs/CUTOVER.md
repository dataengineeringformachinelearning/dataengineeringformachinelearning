# DEML → FORJD production cutover

Safe sequence for making FORJD the exclusive sealed data plane while keeping
the Angular product UI on Vercel unchanged. Pair with
[`PRODUCTION_CUTOVER_CHECKLIST.md`](./PRODUCTION_CUTOVER_CHECKLIST.md),
[`FLY.md`](./FLY.md), [`VERCEL.md`](./VERCEL.md),
[`CLEANUP_2026-07-18.md`](./CLEANUP_2026-07-18.md), and FORJD
[`CUTOVER.md`](https://github.com/dataengineeringformachinelearning/forjd/blob/main/CUTOVER.md).

## Hosts (no overlaps)

| Layer      | Host                                                                  |
| ---------- | --------------------------------------------------------------------- |
| Angular    | **Vercel** project `deml` (`BACKEND_URL=https://backend.deml.app`)    |
| Django BFF | **Fly** `deml-backend`                                                |
| Data plane | **FORJD** Fly `forjd-backend` + `forjd-engine` + Dragonfly + Supabase |

Do **not** run Redpanda, ClickHouse, `deml-dragonfly`, or DEML Rust workers.

## Cutover flags (`deml-backend`)

| Env                   | Values                   | Role                       |
| --------------------- | ------------------------ | -------------------------- |
| `FORJD_CUTOVER_PHASE` | `0` / `1` / `2` / `3`    | Convenience preset         |
| `FORJD_WRITE_MODE`    | `off` / `forjd` / `dual` | Sealed ingest              |
| `FORJD_READ_MODE`     | `off` / `forjd` / `dual` | Projection / adapter reads |

| Phase | Write | Read  | Angular                                         |
| ----- | ----- | ----- | ----------------------------------------------- |
| **0** | dual  | off   | Writes → FORJD + shadow; list GETs empty-stable |
| **1** | dual  | dual  | Reads FORJD with empty fallback on 5xx          |
| **2** | forjd | forjd | Production steady state                         |
| **3** | forjd | forjd | After Railway data-plane decommission           |

Dual-write records metadata-only `forjd_shadow_receipts` — never ciphertext.

## Preflight

1. **FORJD:** apply SQL `003`→`019`; remint `fjsvc_` (`scripts/remint_service_account.sh`); `/ready` healthy.
   Full deploy/rollback: [`PRODUCTION_DEPLOY.md`](./PRODUCTION_DEPLOY.md).
2. **DEML Fly:** secrets `FORJD_API_URL`, reminted `FORJD_SERVICE_TOKEN`, `FORJD_TENANT_ID`; `map_forjd_tenant`.
3. **Vercel:** `BACKEND_URL` points at Django, never at `backend.forjd.co`.

## Deploy

### Vercel (frontend)

```bash
# Project root Directory = frontend; Output = dist/frontend/browser
# Env: BACKEND_URL=https://backend.deml.app
vercel --prod   # or GitHub integration on main
```

See [`VERCEL.md`](./VERCEL.md).

### Fly (Django BFF)

```bash
cd backend
fly deploy -a deml-backend
fly secrets set FORJD_CUTOVER_PHASE=2 -a deml-backend
curl -fsS https://backend.deml.app/api/v1/ready
```

See [`FLY.md`](./FLY.md).

### Remint after sql/018

```bash
# On FORJD (human JWT):
./scripts/remint_service_account.sh deml-production
# Then on DEML Fly:
fly secrets set FORJD_SERVICE_TOKEN='fjsvc_…' FORJD_TENANT_ID='…' -a deml-backend
```

## Wired Angular adapters

Analytics overview, status pages CRUD + services/incidents, sessions, replay/DLQ,
vulns list, exports list/create, ML latest, security-alert, account erase.

Still empty-stable GET / `501` write: ML train/forecast, export download detail,
status marketing integrations (Clarity/Cloudflare/GA).

## Rollback

| Symptom       | Action                                         |
| ------------- | ---------------------------------------------- |
| FORJD 5xx     | `FORJD_CUTOVER_PHASE=1` or `0`                 |
| Bad shapes    | Phase `0` (empty reads)                        |
| Wrong token   | Remint + rotate Fly secret                     |
| Stop FORJD IO | `FORJD_WRITE_MODE=off` + `FORJD_READ_MODE=off` |

Never re-enable Redpanda/ClickHouse as rollback.

## Smoke

1. Login on deml.app → dashboard CES overview
2. Status page create / service / incident
3. Vulns + exports lists
4. Sealed ingest → projections
5. Staging account delete → FORJD erase then local teardown
