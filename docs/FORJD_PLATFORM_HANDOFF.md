# DEML to FORJD Runtime Contract

## Purpose and sources of truth

DEML is the Firebase-authenticated user control plane and Angular backend-for-frontend. It owns identities, profiles, roles, subscriptions, consent, API credentials, issue reports, learning content, learner progress currently stored by DEML, and account-lifecycle UI. FORJD is the exclusive data plane for sealed intake, processing, projections, analytics, replay, dead-letter handling, threat processing, and machine learning. DEML must not add a local processing fallback when a FORJD feature is unavailable.

This contract reflects what FORJD ships now. Its canonical implementation references are `backend/docs/AUTH.md`, `ARCHITECTURE.md`, `CUTOVER.md`, `backend/app/models/ingest.py`, and `backend/workflows/threat_telemetry.yaml` in the FORJD repository. Partner/legacy wire ids are either rewritten in the DEML BFF or declared as config-only YAML `aliases` on the partner’s FORJD deployment — never hardcoded in FORJD `app/` or `engine/`.

DEML never sends Firebase end-user tokens to FORJD, never connects directly to FORJD Postgres or Dragonfly, and never places plaintext lesson content, answers, personal information, scores, learner IDs, or course IDs in ingest metadata.

Cutover checklist: [CUTOVER.md](CUTOVER.md).

## Tenant-scoped service authentication

A FORJD enterprise administrator provisions the integration once with a human FORJD JWT:

1. Create the FORJD tenant with `POST /api/v1/tenants`.
2. Create a service account with `POST /api/v1/service-accounts` for that tenant.
3. Set `subprocessor` to a partner slug (e.g. `deml`) and grant required scopes: `ingest:*`, `projections:*`, `sessions:*`, `replay:*`, `status:*`, `analytics:read`.
4. Store the returned opaque token immediately. FORJD returns it only once.
5. After applying FORJD `sql/017` (service-principal cutover; ML is `016`), **remint** tokens so stored scopes include the cutover surfaces.

At runtime DEML authenticates only with the tenant-bound opaque credential:

```http
Authorization: Bearer fjsvc_<prefix>_<secret>
```

FORJD rejects Supabase `service_role` tokens on application routes. It does not expose `POST /oauth/token`, so DEML neither mints nor caches an OAuth access token. `X-Request-ID` may be sent for correlation. `X-DEML-*` headers are not credentials and must not be sent.

## DEML tenant binding

DEML maintains an explicit control-plane mapping:

```text
deml_account_id -> forjd_tenant_id -> service_token_secret_ref
```

The database stores a secret reference, not the `fjsvc_` token. Each active account resolves to exactly one FORJD tenant, and each FORJD tenant is bound to one DEML account mapping. The request body or query-string `tenant_id` must equal the tenant bound to that service credential. A missing mapping, unavailable secret, malformed token, or tenant mismatch fails closed before the network call.

```shell
python manage.py map_forjd_tenant <deml-account-uuid> <forjd-tenant-uuid> \
  --service-token-secret-ref env:FORJD_SERVICE_TOKEN
```

## Native FORJD APIs

FORJD does not ship `/api/v1/deml-compat/*`. Angular continues to call Django. Where an existing Angular path must remain stable, Django uses an explicit adapter to a real native FORJD path and maps the response to the established DEML shape.

| Capability                  | Native FORJD route                                         |
| --------------------------- | ---------------------------------------------------------- |
| Sealed ingest               | `POST /api/v1/ingest`                                      |
| Batch sealed ingest         | `POST /api/v1/ingest/events:batch`                         |
| Event metadata              | `GET /api/v1/ingest/events?tenant_id=...`                  |
| Workflow results            | `GET /api/v1/ingest/results?tenant_id=...&workflow_id=...` |
| Projections                 | `GET /api/v1/projections?tenant_id=...&workflow_id=...`    |
| Projection checkpoints      | `GET /api/v1/projections/checkpoints?tenant_id=...`        |
| Advance projections         | `POST /api/v1/projections/run`                             |
| Crypto sessions             | `POST/GET /api/v1/sessions` (+ revoke)                     |
| Replay / DLQ                | `/api/v1/replay/*`                                         |
| Status pages                | `/api/v1/status/*` (public slug unauthenticated)           |
| Analytics overview          | `GET /api/v1/analytics/overview`                           |
| Process health              | `GET /health`, `GET /ready`                                |

Exports, ML, integrations, and other domain routes remain blocked until FORJD scopes and DEML response adapters exist. Public health/readiness/status-slug calls send no `Authorization` header.

## Sealed telemetry ingest

DEML accepts sealed events and **forwards FORJD-canonical wire ids**:

```json
{
  "tenant_id": "00000000-0000-0000-0000-000000000000",
  "client_event_id": "stable-event-id",
  "content_type": "application/forjd-telemetry+v1",
  "event_type": "threat.metric",
  "schema_version": 1,
  "workflow_id": "threat_telemetry",
  "encryption": { "mode": "e2ee", "algo": "aes-256-gcm" },
  "envelope": {
    "algo": "aes-256-gcm",
    "key_id": "crypto-session-key-id",
    "nonce": "base64",
    "ciphertext": "base64",
    "ciphertext_sha256": "64-character-lowercase-hex",
    "ratchet_header": null
  },
  "metadata": {
    "source": "deml-web",
    "channel": "telemetry",
    "product": "deml",
    "env": "production"
  }
}
```

`event_type` is `threat.metric` or `threat.alert` (canonical). The BFF still accepts legacy `deml.metric` / `deml.alert` and `workflow_id=deml_telemetry` and rewrites them before the FORJD call so FORJD core stays product-agnostic. Metadata is a routing-tag allowlist: `source`, `channel`, `region`, `env`, `environment`, `product`, `component`, `namespace`, `device_id`, `series_id`, `label`, `labels`, `tags`. Plaintext payloads belong only inside the ciphertext.

When FORJD runs with `REQUIRE_CRYPTO_SESSION=true`, DEML registers `envelope.key_id` through `POST /api/v1/sessions` using the tenant-bound `fjsvc_` credential before sealed ingest.

## Learning support is blocked on FORJD

FORJD does not currently ship learning content types or learner-progress projections. DEML does not invent learning processors or local data-plane substitutes. Existing DEML-owned learner progress remains local; a FORJD-backed progress operation fails closed until an agreed learning workflow contract exists.

## Account deletion is blocked on FORJD erase

FORJD does not currently expose an idempotent tenant-erasure API. DEML must not call `DELETE /api/v1/tenants/{tenant_id}` and must not soft-delete Firebase/Django identity while FORJD data remains. A deletion request records a blocked/failed lifecycle state and returns a non-success response without canceling billing or revoking identity until FORJD confirms durable erasure.

## DEML configuration

```dotenv
FORJD_API_URL=https://backend.forjd.co
FORJD_SERVICE_TOKEN=fjsvc_<prefix>_<secret>
FORJD_TENANT_ID=<forjd-tenant-uuid>
FORJD_READ_FROM_FORJD=true
FORJD_DUAL_WRITE_ENABLED=false
```

Do not configure `FORJD_TOKEN_URL`, `FORJD_SERVICE_ACCOUNT_ID`, `FORJD_SERVICE_ACCOUNT_SECRET`, or `FORJD_SERVICE_ACCOUNT_AUDIENCE`. Secrets belong in the deployment secret manager.

## Verification gates

1. Firebase tokens terminate at Django and are never copied to FORJD requests.
2. Every authenticated FORJD runtime request uses only `Bearer fjsvc_...`.
3. An authenticated DEML account resolves through an active tenant mapping, and its request tenant equals the service token's FORJD tenant.
4. Cross-tenant requests fail closed before forwarding; FORJD also returns `403` for a mismatched tenant.
5. The client seals the payload; Django forwards ciphertext only and does not persist the event body.
6. Retrying the same `client_event_id` does not create a second durable event.
7. Ingest results and `threat_telemetry` projections contain only the mapped tenant's data.
8. Metadata outside the routing allowlist is rejected before forwarding.
9. Domain forwards that reject service credentials remain explicit FORJD gaps.
10. Account deletion remains blocked without durable FORJD erasure confirmation.
11. Angular product routes are unchanged; cutover is Django + FORJD + Railway topology only.

## FORJD dependency backlog

P0: idempotent durable tenant-erasure, safe short-lived token rotation without `service_role`, optional audited attribution headers that cannot override tenant binding, staging E2E (session → ingest → projections).

P1: learning workflow + E2EE-safe progress projections, cursor pagination, nested status list completeness where the UI still expects collections.

These are FORJD deliverables. They must not be reimplemented as DEML processing workers or Railway fallbacks.
