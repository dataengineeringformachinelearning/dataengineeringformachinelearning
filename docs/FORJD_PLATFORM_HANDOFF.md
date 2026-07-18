# DEML to FORJD Runtime Contract

## Purpose and sources of truth

DEML is the Firebase-authenticated user control plane and Angular backend-for-frontend. It owns identities, profiles, roles, subscriptions, consent, API credentials, issue reports, learning content, learner progress currently stored by DEML, and account-lifecycle UI. FORJD is the exclusive data plane for sealed intake, processing, projections, analytics, replay, dead-letter handling, threat processing, exports, vulnerabilities, integrations, machine learning, and durable tenant erase. DEML must not add a local processing fallback when a FORJD feature is unavailable.

**Production cutover:** use phase flags `FORJD_CUTOVER_PHASE` / `FORJD_WRITE_MODE` / `FORJD_READ_MODE` and follow [`docs/CUTOVER.md`](./CUTOVER.md) plus the shared [`docs/PRODUCTION_CUTOVER_CHECKLIST.md`](./PRODUCTION_CUTOVER_CHECKLIST.md). Dual-write records metadata-only shadow receipts — never ciphertext — and never revives Redpanda, ClickHouse, or DEML workers.

**Angular during cutover:** Dashboard CES, status pages, sessions, replay/DLQ, vulnerabilities list, exports list/create, ML latest, and security-alert ingest are BFF-mapped to FORJD natives. Remaining unshipped paths (train/forecast detail, export download, some system-status/telemetry) stay empty-stable GET or `501` on writes so the SPA does not hard-crash.

This contract reflects what FORJD ships now. Canonical references: FORJD `backend/docs/AUTH.md`, `ARCHITECTURE.md`, `backend/app/models/ingest.py`, `backend/workflows/threat_telemetry.yaml`. DEML’s Django BFF may accept product-local wire ids (`deml_telemetry` / `deml.metric`) from Angular and rewrite them to the universal FORJD family (`threat_telemetry` / `threat.metric`) before the network call.

DEML never sends Firebase end-user tokens to FORJD, never connects directly to FORJD Postgres or Dragonfly, and never places plaintext lesson content, answers, personal information, scores, learner IDs, or course IDs in ingest metadata.

## Tenant-scoped service authentication

A FORJD enterprise administrator provisions the integration once with a human FORJD JWT:

1. Create the FORJD tenant with `POST /api/v1/tenants`.
2. Create a service account with `POST /api/v1/service-accounts` for that tenant.
3. Set a descriptive `subprocessor` label (e.g. `deml`) and grant default scopes after FORJD `sql/017` + `sql/018` — ingest, projections, sessions, replay/DLQ, status, analytics, exports, vulnerabilities, integrations, and `tenants:erase`.
4. Store the returned opaque token immediately. FORJD returns it only once.
5. **Remint** after applying `017`/`018` (`scripts/remint_service_account.sh` in FORJD) — existing rows keep old scopes until rotated.

At runtime DEML authenticates only with the tenant-bound opaque credential:

```http
Authorization: Bearer fjsvc_<prefix>_<secret>
```

FORJD rejects Supabase `service_role` tokens on application routes. It does not expose `POST /oauth/token`. `X-Request-ID` may be sent for correlation. Actor attribution remains in DEML until FORJD defines audited attribution headers that cannot override the credential's tenant binding.

## DEML tenant binding

```text
deml_account_id -> forjd_tenant_id -> service_token_secret_ref
```

The database stores a secret reference, not the `fjsvc_` token. Body/query `tenant_id` must equal the mapped tenant or fail closed.

```shell
python manage.py map_forjd_tenant <deml-account-uuid> <forjd-tenant-uuid> \
  --service-token-secret-ref env:FORJD_SERVICE_TOKEN
```

## Native FORJD APIs (BFF-adapted)

| Capability         | Native FORJD route                         | DEML Angular path                    |
| ------------------ | ------------------------------------------ | ------------------------------------ | ------------------ |
| Sealed ingest      | `POST /api/v1/ingest`                      | `/api/v1/ingest` (+ batch)           |
| Projections        | `GET /api/v1/projections`                  | `/api/v1/projections`                |
| Analytics overview | `GET /api/v1/analytics/overview`           | `/api/v1/analytics/overview`         |
| Status pages       | `GET /api/v1/status/pages`                 | `/api/v1/system-status/status_pages` |
| Crypto sessions    | `/api/v1/sessions/*`                       | `/api/v1/sessions/*`                 |
| Replay / DLQ       | `/api/v1/replay/*`                         | `/api/v1/replay/*`                   |
| Vulnerabilities    | `GET /api/v1/vulnerabilities`              | `/api/v1/agent/vulnerabilities`      |
| Exports            | `GET                                       | POST /api/v1/exports`                | `/api/v1/exports/` |
| ML latest          | `GET /api/v1/ml/scores` (fallback models)  | `/api/v1/ml/latest`                  |
| Security alert     | `POST /api/v1/integrations/security-alert` | same path                            |
| Tenant erase       | `POST /api/v1/tenants/{id}/erase`          | account deletion saga                |
| Health             | `GET /health`, `GET /ready`                | proxied / local ready                |

FORJD collection APIs are limit-based; DEML must not claim stable cursor support. `GET /api/v1/replay/{job_id}` is not available.

## Sealed telemetry ingest

DEML accepts and forwards only a client-sealed event. Angular may keep product-local `deml.metric` / `deml.alert` and `workflow_id=deml_telemetry`; Django rewrites to `threat.metric` / `threat.alert` and `threat_telemetry`. Metadata is a routing-tag allowlist only. Plaintext belongs inside ciphertext.

When FORJD runs with `REQUIRE_CRYPTO_SESSION=true`, register `envelope.key_id` through the crypto-session API (service-principal scopes include `sessions:*` after remint).

## Learning support

FORJD does not ship `deml_learning.yaml`. Existing DEML-owned learner progress remains local; FORJD-backed progress fails closed until an agreed `deml_learning_v1` contract exists.

## Account deletion

1. DEML `DELETE /api/v1/account` starts a lifecycle job.
2. Django calls `POST /api/v1/tenants/{tenant_id}/erase` with the mapped `fjsvc_` (`tenants:erase` scope).
3. On success: revoke DEML API keys, best-effort Stripe cancel, delete Firebase user, delete Django user.
4. On FORJD failure: return `503` and leave identity intact (fail closed).

## DEML configuration

```dotenv
FORJD_API_URL=https://backend.forjd.co
FORJD_SERVICE_TOKEN=fjsvc_<prefix>_<secret>
FORJD_TENANT_ID=<forjd-tenant-uuid>
# Optional cutover (see docs/CUTOVER.md)
# FORJD_CUTOVER_PHASE=2
```

Hosts: Angular on Vercel (`docs/VERCEL.md`); Django on Fly (`docs/FLY.md`); Railway standby only.

## Verification gates

1. Firebase tokens terminate at Django; never copied to FORJD.
2. Authenticated FORJD calls use only `Bearer fjsvc_...`.
3. Tenant mapping + body/query tenant match fail closed.
4. Ciphertext-only ingest; metadata allowlist enforced.
5. Dual-write phase stores shadow receipts without ciphertext.
6. Account deletion requires successful FORJD erase first.
7. No Redpanda, ClickHouse, deml-dragonfly, or DEML Rust workers in production.

## Remaining FORJD / DEML backlog (non-blocking for cutover)

- P1: `deml_learning_v1`, cursor pagination, export download detail adapters, ML train/forecast Angular shapes.
- P1: optional audited attribution headers that cannot override tenant binding.
- Ops: apply `sql/018` + remint in each environment; retire Railway data-plane volumes.
