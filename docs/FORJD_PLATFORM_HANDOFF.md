# DEML to FORJD Runtime Contract

## Purpose and sources of truth

DEML is the Firebase-authenticated user control plane and Angular backend-for-frontend. It owns identities, profiles, roles, subscriptions, consent, API credentials, issue reports, learning content, learner progress currently stored by DEML, and account-lifecycle UI. FORJD is the exclusive data plane for sealed intake, processing, projections, analytics, replay, dead-letter handling, threat processing, and machine learning. DEML must not add a local processing fallback when a FORJD feature is unavailable.

This contract reflects what FORJD ships now. Its canonical implementation references are `backend/docs/AUTH.md`, `ARCHITECTURE.md`, `backend/app/models/ingest.py`, and `backend/workflows/threat_telemetry.yaml` (with config-only `aliases` for partner wire ids such as `deml_telemetry`) in the FORJD repository. Earlier DEML documentation describing `POST /oauth/token`, Supabase `service_role`, `X-DEML-*` authorization headers, `/api/v1/deml-compat/*`, `deml_learning.yaml`, or tenant deletion is superseded by this document.

DEML never sends Firebase end-user tokens to FORJD, never connects directly to FORJD Postgres or Dragonfly, and never places plaintext lesson content, answers, personal information, scores, learner IDs, or course IDs in ingest metadata.

## Tenant-scoped service authentication

A FORJD enterprise administrator provisions the integration once with a human FORJD JWT:

1. Create the FORJD tenant with `POST /api/v1/tenants`.
2. Create a service account with `POST /api/v1/service-accounts` for that tenant.
3. Set `subprocessor` to `deml` and grant only required scopes, normally `ingest:write`, `ingest:read`, `projections:read`, and `projections:run`.
4. Store the returned opaque token immediately. FORJD returns it only once.

At runtime DEML authenticates only with the tenant-bound opaque credential:

```http
Authorization: Bearer fjsvc_<prefix>_<secret>
```

FORJD rejects Supabase `service_role` tokens on application routes. It does not expose `POST /oauth/token`, so DEML neither mints nor caches an OAuth access token. `X-Request-ID` may be sent for correlation. `X-DEML-Subprocessor`, `X-DEML-Actor-ID`, and `X-DEML-Account-ID` are not credentials and must not be sent. Actor attribution remains in DEML until FORJD defines audited attribution headers that cannot override the credential's tenant binding.

## DEML tenant binding

DEML maintains an explicit control-plane mapping:

```text
deml_account_id -> forjd_tenant_id -> service_token_secret_ref
```

The database stores a secret reference, not the `fjsvc_` token. Each active account resolves to exactly one FORJD tenant, and each FORJD tenant is bound to one DEML account mapping. The request body or query-string `tenant_id` must equal the tenant bound to that service credential. A missing mapping, unavailable secret, malformed token, or tenant mismatch fails closed before the network call. A single global credential must never authorize arbitrary DEML account IDs.

For the initial single-tenant deployment, the mapping may reference `env:FORJD_SERVICE_TOKEN` and use `FORJD_TENANT_ID`. Multi-tenant deployments should use one environment or secret-manager reference and one FORJD service account per mapped tenant.

After the FORJD administrator provisions the tenant and service account, an authorized DEML operator creates the local binding without passing the token on the command line:

```shell
python manage.py map_forjd_tenant <deml-account-uuid> <forjd-tenant-uuid> \
  --service-token-secret-ref env:FORJD_SERVICE_TOKEN
```

## Native FORJD APIs

FORJD does not ship `/api/v1/deml-compat/*`. Angular continues to call Django. Where an existing Angular path must remain stable, Django uses an explicit, version-controlled adapter to a real native FORJD path and maps the response to the established DEML shape. Django must not construct a path that merely pretends a FORJD compatibility router exists.

The supported data-plane foundation is:

| Capability                  | Native FORJD route                                         |
| --------------------------- | ---------------------------------------------------------- |
| Sealed ingest               | `POST /api/v1/ingest`                                      |
| Batch sealed ingest         | `POST /api/v1/ingest/events:batch`                         |
| Event metadata              | `GET /api/v1/ingest/events?tenant_id=...`                  |
| Workflow results            | `GET /api/v1/ingest/results?tenant_id=...&workflow_id=...` |
| Projections                 | `GET /api/v1/projections?tenant_id=...&workflow_id=...`    |
| Projection checkpoints      | `GET /api/v1/projections/checkpoints?tenant_id=...`        |
| Advance projections         | `POST /api/v1/projections/run`                             |
| Process health              | `GET /health`, `GET /ready`                                |
| Optional public status page | `GET /api/v1/status/pages/slug/{slug}`                     |

FORJD collection APIs are limit-based today; DEML must not claim stable cursor support. `GET /api/v1/replay/{job_id}` is not available.

FORJD now authorizes tenant-bound `fjsvc_` tokens for crypto sessions, replay/DLQ, status management, and analytics reads. DEML adapters forward those native routes with the mapped service credential and reshape responses only where Angular contracts require it (`analytics/overview`, status-page collections). Exports, ML, integrations, and other domain routes remain blocked until FORJD scopes and response adapters exist. DEML must never substitute a Firebase token, human FORJD JWT, or `service_role` token. Process health, readiness, and public status-page calls are intentionally unauthenticated and DEML sends no `Authorization` header to those public routes.

The FORJD `agent` namespace does not exist. DEML must not call it.

## Sealed telemetry ingest

DEML accepts and forwards only a client-sealed event matching FORJD's current telemetry workflow:

```json
{
  "tenant_id": "00000000-0000-0000-0000-000000000000",
  "client_event_id": "stable-event-id",
  "content_type": "application/forjd-telemetry+v1",
  "event_type": "deml.metric",
  "schema_version": 1,
  "workflow_id": "deml_telemetry",
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

`event_type` is `deml.metric` or `deml.alert`. Metadata is a routing-tag allowlist. Its only permitted keys are `source`, `channel`, `region`, `env`, `environment`, `product`, `component`, `namespace`, `device_id`, `series_id`, `label`, `labels`, and `tags`. Plaintext payloads and identifiers belong only inside the ciphertext. DEML does not persist the plaintext or sealed event body. FORJD provides retry safety through the `(tenant_id, client_event_id)` idempotency key.

When FORJD runs with `REQUIRE_CRYPTO_SESSION=true`, DEML registers `envelope.key_id` through `POST /api/v1/sessions` using the tenant-bound `fjsvc_` service credential before sealed ingest.

## Learning support is blocked on FORJD

FORJD does not currently ship `deml_learning.yaml`, learning content types, or learner-progress projections. DEML therefore does not invent learning processors, projection schemas, or local data-plane substitutes. Existing DEML-owned learner progress remains local; a FORJD-backed progress operation fails closed until an agreed `deml_learning_v1` contract exists.

Telemetry-like learning-adjacent signals may use the existing `application/forjd-telemetry+v1` contract only when they are genuinely `deml.metric` or `deml.alert` events. Any lesson content, answer, score, learner ID, or course ID remains inside the sealed ciphertext.

## Account deletion is blocked on FORJD erase

FORJD does not currently expose an idempotent tenant-erasure API. DEML must not call `DELETE /api/v1/tenants/{tenant_id}` and must not soft-delete or remove Firebase/Django identity while FORJD data remains. A deletion request records an explicit blocked/failed lifecycle state and returns a non-success response without canceling billing, revoking DEML API keys, deleting Firebase identity, or deleting the Django user.

DEML may stop new FORJD calls for the account, revoke or rotate a credential reference when an authorized mechanism exists, and open a FORJD operations ticket. The deletion saga may proceed only after FORJD durably confirms tenant erasure.

## DEML configuration

```dotenv
FORJD_API_URL=https://backend.forjd.co
FORJD_SERVICE_TOKEN=fjsvc_<prefix>_<secret>
FORJD_TENANT_ID=<forjd-tenant-uuid>
```

Do not configure `FORJD_TOKEN_URL`, `FORJD_SERVICE_ACCOUNT_ID`, `FORJD_SERVICE_ACCOUNT_SECRET`, or `FORJD_SERVICE_ACCOUNT_AUDIENCE`. Secrets belong in the deployment secret manager and never in source control or database plaintext.

## Verification gates

1. Firebase tokens terminate at Django and are never copied to FORJD requests.
2. Every authenticated FORJD runtime request uses only `Bearer fjsvc_...`; public health, readiness, and status-page requests send no authorization, and no OAuth token request occurs.
3. An authenticated DEML account resolves through an active tenant mapping, and its request tenant equals the service token's FORJD tenant.
4. Cross-tenant requests fail closed before forwarding; FORJD also returns `403` for a mismatched tenant.
5. The client seals the payload; Django forwards ciphertext only and does not persist the event body.
6. Retrying the same `client_event_id` does not create a second durable event.
7. Ingest results and `deml_telemetry` projections contain only the mapped tenant's data.
8. Metadata outside the routing allowlist is rejected before forwarding.
9. Domain forwards that reject service credentials remain explicit FORJD gaps.
10. Account deletion remains blocked without durable FORJD erasure confirmation.

## FORJD dependency backlog

P0 dependencies are service-principal access for replay, DLQ, crypto sessions, and every other domain route DEML must call (or an official versioned adapter), an idempotent durable tenant-erasure job, a safe short-lived token rotation mechanism that does not use `service_role`, and optional audited attribution headers that cannot override tenant binding.

P1 dependencies are `deml_learning_v1` with E2EE-safe progress projections, cursor pagination plus `GET /api/v1/replay/{job_id}`, and a versioned `/api/v1/deml-compat/*` router only if a future decision makes the Angular schema absolutely immutable.

These are FORJD deliverables. They must not be reimplemented as DEML processing workers or Railway fallbacks.
