# Production checklist — DEML

Operator checklist for the DEML user plane. FORJD platform steps live in the
FORJD repo. Deploy commands: [`PRODUCTION_DEPLOY.md`](./PRODUCTION_DEPLOY.md).
Integration contract: [`FORJD_INTEGRATION.md`](./FORJD_INTEGRATION.md).

| Layer                               | Owner | Host                                 |
| ----------------------------------- | ----- | ------------------------------------ |
| Angular product UI                  | DEML  | Vercel `deml`                        |
| Django BFF / identity               | DEML  | Fly `deml-backend`                   |
| Sealed streaming / projections / ML | FORJD | Fly `forjd-backend` + `forjd-engine` |
| FORJD cache / Postgres              | FORJD | Fly Dragonfly + Supabase             |

---

## A. FORJD binding

| Step | Action                                                        |
| ---- | ------------------------------------------------------------- |
| A1   | Confirm FORJD SQL + `/ready` healthy                          |
| A2   | Map account → FORJD tenant + secret ref                       |
| A3   | Set `FORJD_API_URL`, `FORJD_SERVICE_TOKEN`, `FORJD_TENANT_ID` |
| A4   | Set `FORJD_WRITE_MODE=forjd`, `FORJD_READ_MODE=forjd`         |

## B. Fly + Vercel

| Step | Action                                                                    |
| ---- | ------------------------------------------------------------------------- |
| B1   | Deploy Django (`docs/FLY.md`)                                             |
| B2   | Deploy Angular (`docs/VERCEL.md`, `BACKEND_URL=https://backend.deml.app`) |
| B3   | Confirm Firebase Auth → Django only                                       |

## C. Smoke

1. Login → dashboard loads via Django BFF.
2. Sealed ingest → projections list via FORJD.
3. Account deletion calls FORJD erase before local teardown.

## D. Separation invariants

| Concern                     | DEML                                  | FORJD                                          |
| --------------------------- | ------------------------------------- | ---------------------------------------------- |
| End-user auth               | Firebase                              | Supabase Auth (platform) / `fjsvc_` (partners) |
| Browser API                 | Django BFF                            | Never called with Firebase tokens              |
| Ingest / projections / ML   | BFF → FORJD                           | Owns storage + processing                      |
| Learning content / progress | Local                                 | Optional future contract                       |
| Tenant erase                | Calls FORJD erase then local teardown | `POST /api/v1/tenants/{id}/erase`              |
