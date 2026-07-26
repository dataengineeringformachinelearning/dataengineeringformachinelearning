# DEML ↔ FORJD connection map

Observable wiring for the control plane (DEML) and data plane (FORJD). Prefer
this map over legacy “Pathway / Airflow” wording — those are not in the live
stack.

## Topology

```
Browser (deml.app / Vercel)
  │  Firebase Auth (ID token) — never fjsvc_
  ▼
Django/Ninja BFF (backend.deml.app / Fly)
  │  Postgres (identity, billing, consent, sessions)
  │  Tenant-bound fjsvc_ → FORJD
  ▼
FastAPI (backend.forjd.co / Fly)
  │  Supabase Auth JWT (operators) + fjsvc_ (partners)
  │  Supabase Postgres + Dragonfly
  ▼
forjd-engine (Rust HTTP / PyO3) + Prefect 3 YAML workflows
```

## Auth lanes

| Lane                   | Who holds it                    | Accepted by | Notes                                  |
| ---------------------- | ------------------------------- | ----------- | -------------------------------------- |
| Firebase ID token      | Browser → DEML                  | Django only | Session registry + `X-DEML-Session-Id` |
| `fjsvc_` service token | DEML secrets / partner backends | FORJD       | Tenant-bound; never in browser         |
| Supabase user JWT      | FORJD operators                 | FORJD       | Not used by DEML end users             |

## Health contracts

| Surface               | Liveness             | Readiness           | Soft dependency signal                         |
| --------------------- | -------------------- | ------------------- | ---------------------------------------------- |
| DEML BFF              | `GET /api/v1/health` | `GET /api/v1/ready` | `forjd_health` + `mode` (`full` \| `degraded`) |
| FORJD API             | `GET /health`        | `GET /ready`        | `engine` block informational                   |
| Fly admission (FORJD) | —                    | `/ready`            | Machines leave the pool when deps fail         |

DEML `/ready` stays HTTP 200 when Postgres + FORJD credentials are configured,
even if the soft FORJD `/ready` probe is degraded — product UIs show continuity
instead of taking the whole control plane offline.

## Resilience patterns (simple)

| Path                            | Pattern                                                                     |
| ------------------------------- | --------------------------------------------------------------------------- |
| DEML → FORJD HTTP               | Bounded retries on idempotent GETs; host circuit breaker (5 failures / 20s) |
| Django SSE live bridge          | Typed `degraded` frames + REST `code=forjd_degraded`                        |
| Landing / product-home / status | Continuity probe with timeout; never optimistic `ok`                        |
| Engine version probe            | 2-attempt bounded retry; readiness wait_for timeout                         |

## Pipeline ownership (no Airflow / no Pathway)

- **Orchestration:** Prefect 3 + YAML under FORJD `backend/workflows/`
- **Sealed hot path:** Rust `forjd-engine` (`run_sealed_pipeline` / HTTP)
- **Soft fallback:** dependency-free Python rollup when the engine is down
- **Batch:** Polars LazyFrames (finite), not streaming
- **Compose (DEML only):** Angular **Pipeline** (`/pipeline`) reads
  `GET /api/v1/workflows` via BFF, exports YAML; DEML never persists workflows.
  Deploy on FORJD → `npm run validate:workflows` (FORJD
  [`docs/EXTENDING.md`](https://github.com/dataengineeringformachinelearning/forjd/blob/main/docs/EXTENDING.md)).
  Contract: [`FORJD_INTEGRATION.md`](FORJD_INTEGRATION.md) § Pipeline Studio.

## Runtime verification

See [`scripts/verify_stack_health.sh`](../scripts/verify_stack_health.sh).
