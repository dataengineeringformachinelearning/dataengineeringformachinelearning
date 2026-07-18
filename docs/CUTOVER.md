# DEML ↔ FORJD production cutover

Safe sequence for cutting DEML’s user plane over to FORJD as the exclusive
sealed streaming engine. **Angular remains unchanged** — only Django BFF
flags, credentials, and Railway topology move.

Authoritative runtime contract: [FORJD_PLATFORM_HANDOFF.md](FORJD_PLATFORM_HANDOFF.md).
FORJD operator checklist: forjd repo `CUTOVER.md`.

## Ownership after cutover

| Plane | Owner |
|-------|--------|
| Identity, billing, consent, API keys, learning content, Angular UX | DEML |
| Sealed ingest, projections, sessions, replay/DLQ, analytics, threat/ML | FORJD |

## Preflight

1. Deploy FORJD with SQL `003`→`017`; remint `fjsvc_` after `017` (ML is `016`).
2. Map each DEML account (or bootstrap tenant) via `map_forjd_tenant`.
3. Set DEML secrets: `FORJD_API_URL`, `FORJD_SERVICE_TOKEN`, `FORJD_TENANT_ID`
   (or per-tenant secret refs). Never store plaintext tokens in Postgres.
4. Confirm Django rewrites legacy `deml_telemetry` / `deml.metric|alert` to
   FORJD-canonical `threat_telemetry` / `threat.metric|alert` before forward.
5. Staging smoke (Firebase user → Django → FORJD): session register → sealed
   ingest → projections list → analytics overview → status pages.
6. Confirm Angular dashboards still hit existing DEML routes (no frontend deploy
   required for this cutover).

## Feature flags (Django only)

| Setting | Default | Purpose |
|---------|---------|---------|
| `FORJD_READ_FROM_FORJD` | `true` | Authenticated FORJD adapters; `false` → 503 fail-closed |
| `FORJD_DUAL_WRITE_ENABLED` | `false` | Advisory only — local brokers are retired; any dual-write bridge is external |

## Cutover sequence

| Phase | Action | Rollback |
|-------|--------|----------|
| **0 — Dual-write (optional)** | If a temporary external bridge still mirrors legacy traffic, keep it while FORJD receives sealed writes. | Stop FORJD writes; keep bridge. |
| **1 — Read switch** | Ensure `FORJD_READ_FROM_FORJD=true`. Angular continues on DEML paths; Django reads FORJD. | Set `FORJD_READ_FROM_FORJD=false` (UI data-plane adapters 503). |
| **2 — Write switch** | All sealed ingest via Django → FORJD. Firebase `ingestEvent` fails closed (retired). | Redeploy previous Functions build only if an emergency bridge still exists. |
| **3 — Decommission** | Confirm Railway `retired[]` services stay off; no Redpanda/ClickHouse/RustFS/workers in compose or IaC. | Redeploy last known-good data-plane images (costly; avoid). |

## Security gates

1. Firebase tokens terminate at Django; never appear on FORJD requests.
2. Every authenticated FORJD call uses `Authorization: Bearer fjsvc_…`.
3. Cross-tenant body/query `tenant_id` fails closed in Django and FORJD.
4. Metadata outside the routing allowlist is rejected before forward.
5. Account deletion stays blocked until FORJD durable erase exists.

## Post-cutover

- Watch Django 502/503 from FORJD, ingest 4xx validation, empty projection lists.
- Rotate `fjsvc_` on schedule; update secret refs without putting tokens in git.
- Keep Angular/product UX deploys independent of FORJD engine deploys.
