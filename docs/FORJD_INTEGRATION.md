# DEML ↔ FORJD Integration Contract

## Boundary

DEML is the Firebase-authenticated user control plane and Angular backend-for-frontend.
It owns identities, profiles, roles, subscriptions, consent, API credentials, issue
reports, learning content, learner progress stored by DEML, and account-lifecycle UI.

FORJD is the universal secure streaming engine. It owns sealed intake, processing,
projections, analytics, replay, dead-letter handling, threat processing, exports,
vulnerabilities, integrations, machine learning, and durable tenant erase.

DEML calls FORJD with a tenant-bound opaque `fjsvc_` service token. It never forwards
Firebase end-user tokens, never uses Supabase `service_role`, never connects directly
to FORJD Postgres or Dragonfly, and never places plaintext lesson content, answers,
personal information, scores, learner IDs, or course IDs in ingest metadata.

Canonical FORJD references: `backend/docs/AUTH.md`, `ARCHITECTURE.md`,
`backend/app/models/ingest.py`, `backend/workflows/threat_telemetry.yaml` in the
[FORJD](https://github.com/dataengineeringformachinelearning/forjd) repository.

Django may accept product-local wire ids (`deml_telemetry` / `deml.metric`) from
Angular and rewrite them to the universal FORJD family (`threat_telemetry` /
`threat.metric`) before the network call.

## Tenant-scoped service authentication

A FORJD enterprise administrator provisions the integration once with a human FORJD JWT:

1. Create the FORJD tenant with `POST /api/v1/tenants`.
2. Create a service account with `POST /api/v1/service-accounts` for that tenant.
3. Set a descriptive `subprocessor` label (e.g. `deml`) and grant scopes — ingest,
   projections, sessions, replay/DLQ, status, analytics, exports, vulnerabilities,
   integrations, and `tenants:erase` when account deletion is required.
4. Store the returned opaque token immediately. FORJD returns it only once.

At runtime DEML authenticates only with the tenant-bound opaque credential:

```http
Authorization: Bearer fjsvc_<prefix>_<secret>
```

FORJD rejects Supabase `service_role` tokens on application routes. It does not expose
`POST /oauth/token`. `X-Request-ID` may be sent for correlation.

## DEML tenant binding

```text
deml_account_id -> forjd_tenant_id -> service_token_secret_ref
```

The database stores a secret reference, not the `fjsvc_` token. Body/query `tenant_id`
must equal the mapped tenant or fail closed.

```shell
python manage.py map_forjd_tenant <deml-account-uuid> <forjd-tenant-uuid> \
  --service-token-secret-ref env:FORJD_SERVICE_TOKEN
```

## Native FORJD APIs (BFF-adapted)

| Capability         | Native FORJD route                         | DEML Angular path                    |
| ------------------ | ------------------------------------------ | ------------------------------------ |
| Sealed ingest      | `POST /api/v1/ingest`                      | `/api/v1/ingest` (+ batch)           |
| Projections        | `GET /api/v1/projections`                  | `/api/v1/projections`                |
| Analytics overview | `GET /api/v1/analytics/overview`           | `/api/v1/analytics/overview`         |
| Status pages       | `GET /api/v1/status/pages`                 | `/api/v1/system-status/status_pages` |
| Crypto sessions    | `/api/v1/sessions/*`                       | `/api/v1/sessions/*`                 |
| Replay / DLQ       | `/api/v1/replay/*`                         | `/api/v1/replay/*`                   |
| Vulnerabilities    | `GET /api/v1/vulnerabilities`              | `/api/v1/agent/vulnerabilities`      |
| Exports            | `GET/POST /api/v1/exports`                 | `/api/v1/exports/`                   |
| ML latest          | `GET /api/v1/ml/scores` (fallback models)  | `/api/v1/ml/latest`                  |
| Security alert     | `POST /api/v1/integrations/security-alert` | same path                            |
| Tenant erase       | `POST /api/v1/tenants/{id}/erase`          | account deletion saga                |
| Health             | `GET /health`, `GET /ready`                | proxied / local ready                |

FORJD collection APIs are limit-based. `GET /api/v1/replay/{job_id}` is not available.

## Sealed telemetry ingest

DEML accepts and forwards only a client-sealed event. Angular may keep product-local
`deml.metric` / `deml.alert` and `workflow_id=deml_telemetry`; Django rewrites to
`threat.metric` / `threat.alert` and `threat_telemetry`. Metadata is a routing-tag
allowlist only. Plaintext belongs inside ciphertext.

When FORJD runs with `REQUIRE_CRYPTO_SESSION=true`, register `envelope.key_id`
through the crypto-session API.

## Learning support

FORJD does not ship learning workflows. Existing DEML-owned learner progress remains
local until an agreed `deml_learning_v1` contract exists.

## Account deletion

1. DEML `DELETE /api/v1/account` starts a lifecycle job.
2. Django calls `POST /api/v1/tenants/{tenant_id}/erase` with the mapped `fjsvc_`
   (`tenants:erase` scope).
3. On success: revoke DEML API keys, best-effort Stripe cancel, delete Firebase user,
   delete Django user.
4. On FORJD failure: return `503` and leave identity intact (fail closed).

## DEML configuration

```dotenv
FORJD_API_URL=https://backend.forjd.co
FORJD_SERVICE_TOKEN=fjsvc_<prefix>_<secret>
FORJD_TENANT_ID=<forjd-tenant-uuid>
FORJD_WRITE_MODE=forjd
FORJD_READ_MODE=forjd
```

Hosts: Angular on Vercel (`docs/VERCEL.md`); Django on Fly (`docs/FLY.md`).

## Verification gates

1. Firebase tokens terminate at Django; never copied to FORJD.
2. Authenticated FORJD calls use only `Bearer fjsvc_...`.
3. Tenant mapping + body/query tenant match fail closed.
4. Ciphertext-only ingest; metadata allowlist enforced.
5. Account deletion requires successful FORJD erase first.
