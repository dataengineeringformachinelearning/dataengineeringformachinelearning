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

| Step | Action                                                                                                                                                                                                                                                   |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1   | Apply FORJD SQL `003`–`025`; confirm migration checksums and `/ready` (including private object storage and worker contracts)                                                                                                                            |
| A2   | Map account → FORJD tenant + secret ref                                                                                                                                                                                                                  |
| A3   | Set `FORJD_API_URL`, `FORJD_SERVICE_TOKEN`, `FORJD_TENANT_ID`                                                                                                                                                                                            |
| A4   | Set `FORJD_WRITE_MODE=forjd`, `FORJD_READ_MODE=forjd`                                                                                                                                                                                                    |
| A5   | Set `FORJD_REQUIRED_CONTRACT_VERSION=1.0`; verify `/api/v1/forjd/capabilities` is `ready`                                                                                                                                                                |
| A6   | Remint from FORJD canonical defaults; verify ingest, cases, playbooks/runs, SIEM, vulnerabilities, replay/DLQ, reports, exports, status, analytics, ML-read, and threat-intel-read scopes; include `tenants:erase` only when account deletion is enabled |

## B. Fly + Vercel

| Step | Action                                                                                                                  |
| ---- | ----------------------------------------------------------------------------------------------------------------------- |
| B1   | Deploy Django (`docs/FLY.md`); confirm `monitor` migrations through `0062` and the supervised report-outbox worker      |
| B2   | Deploy Angular (`docs/VERCEL.md`, `BACKEND_URL=https://backend.deml.app`)                                               |
| B3   | Confirm Firebase Auth → Django only                                                                                     |
| B4   | Confirm headless keys use `deml_…` via `X-API-Key` or Bearer and are accepted only on integration routes                |
| B5   | Keep `ENABLE_LEGACY_PLAINTEXT_TELEMETRY=false`; verify the browser has no legacy queue                                  |
| B6   | Set and load-test `DEML_HEADLESS_{INGEST,WRITE,READ}_RPM` and `DEML_PUBLIC_STATUS_RPM` for the production database size |
| B7   | Confirm Stripe webhook + `python manage.py sync_subscriptions`; checkout binds `client_reference_id` / customer id only |

## C. Smoke

1. Login → dashboard loads via Django BFF.
2. `GET /api/v1/forjd/capabilities` reports contract `1.0`, `status=ready`, and an `X-FORJD-Request-ID`.
3. Sealed ingest → projections list via FORJD; no Firebase/API-key credential appears in the upstream request.
4. SIEM signal → correlated case → case update; playbook execution produces a visible run.
5. Vulnerability create/update and compliance SOC read preserve Angular response contracts.
6. Create an idempotent export, poll its durable job through DEML, and obtain a short-lived signed download URL after completion.
7. Account deletion calls FORJD erase before local teardown.

## D. RBAC and degradation

| Step | Assertion                                                                                                                                             |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1   | Viewer reads succeed and every write returns `403 forjd_action_forbidden`                                                                             |
| D2   | Operator + Pro can ingest, update cases/vulnerabilities, replay/DLQ, create exports, submit SIEM signals, and execute approved playbooks              |
| D2b  | Standard (non-Pro) receives `403 pro_required` on exports, ML admin, SIEM writes, projections run, vulnerabilities, cases, and playbook execute/admin |
| D3   | Only Security Admin can administer playbooks/status/integrations/models and destructive resources                                                     |
| D4   | Privileged attempts and results appear in DEML audit logs with local/upstream request ids and no bodies or credentials                                |
| D5   | In `FORJD_READ_MODE=forjd`, remove a mapping or simulate an upstream 5xx and verify typed `503 forjd_degraded`, never empty `200`                     |
| D6   | In an intentional `dual` drill, verify empty fallback responses identify `deml_forjd_fallback`                                                        |
| D7   | Verify every write verb (`POST`, `PUT`, `PATCH`, `DELETE`) is blocked when `FORJD_WRITE_MODE=off`                                                     |
| D8   | Exercise per-credential and per-account headless quotas; verify `429`, `Retry-After`, and `X-RateLimit-*` without one account starving another        |

## E. Separation invariants

| Concern                     | DEML                                  | FORJD                                          |
| --------------------------- | ------------------------------------- | ---------------------------------------------- |
| End-user auth               | Firebase                              | Supabase Auth (platform) / `fjsvc_` (partners) |
| Browser API                 | Django BFF                            | Never called with Firebase tokens              |
| Ingest / projections / ML   | BFF → FORJD                           | Owns storage + processing                      |
| Learning content / progress | Local                                 | Optional future contract                       |
| Tenant erase                | Calls FORJD erase then local teardown | `POST /api/v1/tenants/{id}/erase`              |
