# DEML ↔ FORJD Integration Contract

## Boundary

DEML is the Firebase-authenticated user control plane and Angular backend-for-frontend.
It owns identities, profiles, roles, subscriptions, consent, API credentials, issue
reports, learning content, learner progress stored by DEML, and account-lifecycle UI.

FORJD is the universal secure streaming engine. It owns sealed intake, processing,
projections, analytics, replay, dead-letter handling, threat processing, exports,
vulnerabilities, integrations, machine learning, and durable tenant erase.

DEML calls FORJD with a tenant-bound opaque `fjsvc_` service token. Browser callers
authenticate to DEML with Firebase. Headless callers may use `X-API-Key: deml_…` or
`Authorization: Bearer deml_…`; the same local role policy applies. DEML never forwards
Firebase or DEML API-key credentials, never uses Supabase `service_role`, never connects directly
to FORJD Postgres or Dragonfly, and never places plaintext lesson content, answers,
personal information, scores, learner IDs, or course IDs in ingest metadata.

The SOAR action acknowledgement and explicit retry routes are stricter: because they
are CSRF-exempt control operations, they require a verified non-cookie credential and
never accept cookie/session authentication. A DEML API key remains usable through
`X-API-Key: deml_…`, `Authorization: ApiKey deml_…`, or
`Authorization: Bearer deml_…`.

Run reads preserve FORJD's immutable, allowlisted configuration for
control-plane actions (`email_alert`, `block_ip`, and `revoke_api_key`) so an
operator has the exact inputs needed to perform and acknowledge the action.
Webhook URLs, signing references, signing secrets, and worker leases remain
hidden at the DEML boundary.

DEML applies replica-safe Postgres token buckets to both the verified credential/user
and its account before exchanging identity for the tenant service token. Tune
`DEML_HEADLESS_INGEST_RPM`, `DEML_HEADLESS_WRITE_RPM`, and
`DEML_HEADLESS_READ_RPM`; callers receive `429`, `Retry-After`, and
`X-RateLimit-*`. FORJD independently enforces its service-principal quota.

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
3. Set a descriptive `subprocessor` label (e.g. `deml`) and omit `scopes` to use
   FORJD's canonical partner defaults—ingest, projections, sessions, replay/DLQ,
   status, analytics, `ml:read`, exports, vulnerabilities, integrations,
   SIEM/SOAR, threat-intel reads, and reports. Set `include_tenant_erase=true`
   only when this credential must run the account-deletion saga; `ml:write` and
   other administrative scopes remain explicit opt-ins.
4. Store the returned opaque token immediately. FORJD returns it only once.

At runtime DEML authenticates only with the tenant-bound opaque credential:

```http
Authorization: Bearer fjsvc_<prefix>_<secret>
```

FORJD rejects Supabase `service_role` tokens on application routes. It does not expose
`POST /oauth/token`. DEML propagates a validated 8–128 character `X-Request-ID` and
surfaces FORJD's correlation id as `X-FORJD-Request-ID`.

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

## DEML authentication and authorization

The caller is authorized before Django exchanges its identity for the mapped FORJD
service credential. API keys do not bypass user roles.

| DEML role      | FORJD-backed permissions                                                                                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Viewer         | Read-only tenant analytics, SIEM, cases, playbooks/runs, vulnerabilities, compliance, exports, replay/DLQ state, status, and ML results                                                |
| Operator       | Viewer plus sealed ingest, case/vulnerability changes, replay/DLQ actions, export creation, SIEM signal submission, approved playbook execution, and SOAR action acknowledgement/retry |
| Security Admin | Operator plus playbook/status/integration/model administration and destructive domain actions                                                                                          |

**Pro entitlement (DEML-side):** role alone is not enough for premium writes. Exports,
ML admin, SIEM signal writes, projections run, vulnerability/case writes, and playbook
execute/admin also require `tier=Pro` and `subscription_active` (Stripe). Standard keeps
core read/ingest/status/report/session/security-alert/replay paths. FORJD has no billing
awareness — entitlement is enforced in `backend/forjd/policy.py` before the BFF exchanges
credentials. Denials return `403` with `code=pro_required`.

Privileged attempts, denials, successes, and failures create metadata-only DEML audit
records. Audit details may contain actor, role, action, local and upstream request ids,
resource, mapped tenant, result, and status. They never contain request bodies,
ciphertext, Firebase tokens, API keys, or `fjsvc_` credentials.

## Native FORJD APIs (BFF-adapted)

| Capability         | Native FORJD route                                                | Stable DEML path                                                                                |
| ------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Contract probe     | `GET /api/v1/capabilities`                                        | `GET /api/v1/forjd/capabilities`                                                                |
| Sealed ingest      | `POST /api/v1/ingest`                                             | `/api/v1/ingest` (+ batch)                                                                      |
| Ingest processing  | `GET /api/v1/ingest/processing/{batch_id}`                        | same tenant-bound path                                                                          |
| Projections        | `GET /api/v1/projections`                                         | `/api/v1/projections`                                                                           |
| Analytics overview | `GET /api/v1/analytics/overview`                                  | `/api/v1/analytics/overview`                                                                    |
| Tenant selector    | DEML account mapping                                              | `GET /api/v1/analytics/tenants`                                                                 |
| Incident cases     | `GET/POST/PATCH /api/v1/soc/cases[/id]`                           | `/api/v1/analytics/incidents[/id]`                                                              |
| SOAR playbooks     | `/api/v1/playbooks[/id][/execute]`                                | `/api/v1/analytics/playbooks[/id][/execute]`                                                    |
| Playbook runs      | `GET /api/v1/playbooks/runs`                                      | `GET /api/v1/analytics/playbook-runs`                                                           |
| Action acknowledge | `POST /api/v1/playbooks/runs/{run}/actions/{action}/ack`          | `POST /api/v1/analytics/playbook-runs/{run}/actions/{action}/ack`                               |
| Action retry       | `POST /api/v1/playbooks/runs/{run}/actions/{action}/retry`        | `POST /api/v1/analytics/playbook-runs/{run}/actions/{action}/retry`                             |
| SIEM signals       | `GET/POST /api/v1/siem/signals`                                   | `GET/POST /api/v1/siem/signals`                                                                 |
| Vulnerabilities    | `GET/POST/PATCH /api/v1/vulnerabilities[/id]`                     | `/api/v1/agent/vulnerabilities[/id]`                                                            |
| Compliance         | `GET /api/v1/compliance/soc`                                      | `GET /api/v1/ml/compliance/soc-status`                                                          |
| Status pages       | `GET /api/v1/status/pages`                                        | `/api/v1/system-status/status_pages` (anonymous explore: published-only via platform `FORJD_*`) |
| Crypto sessions    | `/api/v1/sessions/*`                                              | `/api/v1/sessions/*`                                                                            |
| Replay / DLQ       | `/api/v1/replay/*`                                                | `/api/v1/replay/*`                                                                              |
| Exports            | `GET/POST /api/v1/exports`, `GET /api/v1/exports/{id}[/download]` | `/api/v1/exports[/id][/download]`                                                               |
| ML latest          | `GET /api/v1/ml/scores` (fallback models)                         | `/api/v1/ml/latest`                                                                             |
| Security alert     | `POST /api/v1/integrations/security-alert`                        | same path                                                                                       |
| Report documents   | `POST/GET /api/v1/reports/documents`                              | `POST /api/v1/agent/report-issue`                                                               |
| Tenant erase       | `POST /api/v1/tenants/{id}/erase`                                 | account deletion saga                                                                           |
| Health             | `GET /health`, `GET /ready`                                       | proxied / local ready                                                                           |

FORJD collection APIs are limit-based. Sealed batches contain at most 25 events and
canonical ingest request bodies are capped at 8 MiB; DEML applies the same limits without
raising Django's lower global limit for unrelated routes. Ingest receipts expose a
`status_path` that remains valid through Django, so recovery polling never bypasses the BFF.
`GET /api/v1/replay/{job_id}` is not available.
Exports are idempotent durable jobs. DEML preserves `202 Accepted` for create and exposes
list, detail, and download;
the final download response contains a short-lived private object-storage URL rather
than proxying artifact bytes through the control plane.

Playbook-run list responses retain FORJD's ordered, durable action results: action and
plan ids, type, state, attempts and cap, HTTP/error classification, external reference,
bounded result metadata, and acknowledgement/retry timestamps. DEML deliberately omits
worker lease ownership and immutable action configuration snapshots. ACK accepts only
`succeeded` (boolean), optional `external_reference` (string or null, maximum 255
characters), and optional object `metadata`; retry accepts an empty object. Both reject
body/query tenant overrides, inject the authenticated account's mapped tenant, require
`playbook.execute`, and obey `FORJD_WRITE_MODE`. DEML forwards each control command once;
FORJD owns idempotent acknowledgement and durable webhook scheduling/attempt limits.

## Failure and cutover semantics

`FORJD_READ_MODE=forjd` is steady state. Missing account mapping, secret resolution,
contract mismatch, timeout, oversized/invalid response, or upstream 5xx returns a
typed `503` with `code=forjd_degraded`. A threat, incident, case, vulnerability, or
export outage must never appear as a healthy empty collection. Empty fallback envelopes
exist only when read mode is explicitly `off` or `dual` and identify their fallback source.

`FORJD_WRITE_MODE=off` blocks every `POST`, `PUT`, `PATCH`, and `DELETE`. DEML never
automatically retries BFF writes. Idempotent reads use bounded jittered retry, honor
`Retry-After`, apply route-specific timeouts, and cap response bodies before buffering.

## Sealed telemetry ingest

DEML accepts and forwards only a client-sealed event. Angular may keep product-local
`deml.metric` / `deml.alert` and `workflow_id=deml_telemetry`; Django rewrites to
`threat.metric` / `threat.alert` and `threat_telemetry`. Metadata is a routing-tag
allowlist only. Plaintext belongs inside ciphertext.

When FORJD runs with `REQUIRE_CRYPTO_SESSION=true`, register `envelope.key_id`
through the crypto-session API.

The generated Angular FORJD client accepts an already sealed `SealedEvent` at
`/api/v1/ingest`. Application code must obtain/register the FORJD crypto-session key,
seal the event locally, and submit only the envelope plus allowlisted routing metadata.
The legacy plaintext response-timing interceptor is disabled by default. If temporarily
enabled for migration, its browser queue holds at most 100 events / 256 KiB, expires
after 24 hours, and is purged when the feature is disabled. This legacy lane is not E2EE.

## Report documents

User issue reports are stored as FORJD report documents (`reports:write` scope,
Supabase `report_documents` with RLS, `sql/022`). Django redacts emails and
credential-like material, bounds the body/context, and submits with an opaque
`acct:<24 lowercase hex>` HMAC pseudonym — never the account UUID or a Firebase identity. If the account is unmapped
or FORJD is unavailable, the report and its delivery state commit to the local
`bug_reports` outbox. The supervised reconciliation worker retries with bounded
backoff and the stable `client_report_id`, so a crash or ambiguous upstream
response cannot lose or duplicate the document.

## Learning support

FORJD does not ship learning workflows. Existing DEML-owned learner progress remains
local until an agreed `deml_learning_v1` contract exists.

## Account deletion

1. DEML `DELETE /api/v1/auth/delete-account` starts a lifecycle job.
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
FORJD_REQUIRED_CONTRACT_VERSION=1.0
FORJD_CONNECT_TIMEOUT_SECONDS=5
FORJD_REQUEST_TIMEOUT_SECONDS=20
FORJD_LONG_REQUEST_TIMEOUT_SECONDS=45
FORJD_RESPONSE_MAX_BYTES=2097152
FORJD_READ_RETRY_ATTEMPTS=3
DEML_HEADLESS_RATE_LIMIT_ENABLED=true
DEML_HEADLESS_INGEST_RPM=120
DEML_HEADLESS_WRITE_RPM=300
DEML_HEADLESS_READ_RPM=1200
ENABLE_LEGACY_PLAINTEXT_TELEMETRY=false
```

DEML enables FORJD's optional integration catalog as a deployment profile. Copy
or mount [`infrastructure/forjd/addons.yaml`](../infrastructure/forjd/addons.yaml)
into the FORJD backend and set `FORJD_ADDONS_CONFIG` to its in-container path
(or set `FORJD_ADDONS=all` as the equivalent environment override). Add-on
enablement does not install scanner binaries or Python packages; FORJD
`GET /api/v1/addons` reports `available` separately from `enabled`.

Hosts: Angular on Vercel (`docs/VERCEL.md`); Django on Fly (`docs/FLY.md`).

## Verification gates

1. Firebase tokens terminate at Django; never copied to FORJD.
2. Authenticated FORJD calls use only `Bearer fjsvc_...`.
3. Tenant mapping + body/query tenant match fail closed.
4. Ciphertext-only ingest; metadata allowlist enforced.
5. Account deletion requires successful FORJD erase first.
6. `/api/v1/forjd/capabilities` reports contract `1.0` and status `ready`.
7. Viewer write attempts are `403`; Operator and Security Admin matrices are exercised.
8. Steady-mode mapping/upstream outages return typed `503`, not empty `200`.
9. Browser plaintext telemetry is disabled and the legacy queue is absent.
10. SIEM correlation and SOAR action ACK/retry preserve stable run/action ids across retries.
11. Export create/detail/download returns a durable job and an expiring private signed URL.
12. Per-principal and per-account quotas return bounded `429` responses without cross-tenant starvation.
