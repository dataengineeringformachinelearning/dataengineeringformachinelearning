# DEML scale architecture

Lightweight structural guidance for the **control plane** (Django/Ninja BFF +
Angular). Product telemetry and stream processing stay in FORJD — do not grow
a second data plane here.

## Bounded contexts (target)

| Context | Should own | Today |
|---------|------------|-------|
| Identity / sessions | Firebase bind, `BrowserSession`, API keys | Mostly `monitor` + `config` |
| Billing / entitlements | Stripe, plan gates | `billing/` + policy checks in `forjd/` |
| Tenancy bridge | `ForjdTenantMapping`, `fjsvc_` refs | `monitor` models + `forjd/tenancy` |
| FORJD BFF adapters | Allowlisted proxy + reshape | `forjd/views.py` monolith |
| Learning / agent | Interactions | `agent/` |
| Product UI | Pages + thin services | `frontend/src/app/pages` |

`monitor` currently holds too many persistent models — carve **logical packages**
(same Postgres) when next touching those models; do **not** microservice yet.

## Scale risks (ordered)

1. **Explore / status fan-out** — per-slug + per-page ML hydrations multiply BFF→FORJD hops.
2. **Session touch amplification** — every Bearer request refreshed `last_seen` (throttled in this change).
3. **SSE poll-per-client** — each browser SSE polls FORJD projections independently.
4. **`forjd/views.py` size** — hard to review; split by surface without changing topology.
5. **In-process sidecars in `start.py`** — web scale-out multiplies reconcile/maintenance workers.

## Highest-ROI refactors (ranked)

1. **Done here:** throttle `touch_session` (120s) to cut Postgres write churn under dashboards/SSE.
2. **Collapse explore into one BFF DTO** — enrich published directory (or `/api/v1/explore`) with KPIs so Angular drops per-slug fan-out.
3. **Split `forjd/views.py`** by surface (`status_adapters`, `analytics_adapters`, `ingest_adapters`, `ml_adapters`) — file move, same URLs.
4. **Logical packages out of `monitor`** — `identity/`, `tenancy/` modules, shared DB.
5. **SSE cursor cache per tenant** — short TTL so N clients ≠ N FORJD polls.
6. **Fold honeypot into FORJD analytics overview** (or lazy secondary call).
7. **Extract AuthSessionFacade** from `auth.service.ts` (Firebase vs DEML session vs UI signals).
8. **Move long-interval workers** (`daily_maintenance`, `analytics_sync`) off the Daphne VM when Fly process groups are justified.

## Frontend maintainability

Keep:

- Standalone + lazy routes
- Pages orchestrate; services hold HTTP/signals
- Viking-UI composition

Avoid:

- NgRx / heavy domain layers
- Growing `auth.service.ts` and fat pages further — extract facades when a page next gains a feature
- Putting `fjsvc_` or Supabase keys in the browser

## Observability at higher load

Have: correlation IDs, structured logs, Sentry/Rollbar, FORJD circuit breaker, ready `mode`/`forjd_health` (on reliability branch).

Add next (metrics only — no OTel collector / ClickHouse plane):

- Proxy latency histogram per allowlisted path
- SSE connection gauge + FORJD poll rate
- Session-touch write vs skip counters

## Deploy / config (keep simple)

```
Vercel (Angular) → Fly deml-backend (Daphne + thin sidecars) → FORJD → Supabase
```

Fail-fast env validation stays in `utils/env.py`. Prefer retiring forever cutover flags (`FORJD_WRITE_MODE`, etc.) once phase-2 is permanent.

## What not to build

- Local Pathway / Airflow / stream brokers on DEML
- Replacing Django/Ninja with FastAPI on the control plane
- Control-plane microservices for billing/auth before package boundaries are clean
- Browser access to `fjsvc_` or Supabase Realtime for product users

See also: [`FORJD_INTEGRATION.md`](FORJD_INTEGRATION.md), [`CONNECTION_MAP.md`](CONNECTION_MAP.md) (when present).
