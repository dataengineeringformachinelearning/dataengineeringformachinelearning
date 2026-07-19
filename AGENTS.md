# AGENTS.md — DEML Platform

**Mission:** Build DEML as a zero-compromise, user-focused learning platform.
DEML owns identity, profiles, roles, subscriptions, consent, account lifecycle,
and user interactions. FORJD is the universal secure streaming engine for intake,
processing, analytics, projections, replay, and machine learning.
Integration contract: [docs/FORJD_INTEGRATION.md](docs/FORJD_INTEGRATION.md).

## DEML ↔ FORJD Boundary

- Keep the complete Angular product surface intact: dashboards, analytics, status
  pages, vulnerability views, monitoring UI, onboarding, and generated API contracts.
- Django is the Firebase-authenticated user control plane and backend-for-frontend.
  Identity, profiles, roles, billing, consent, API credentials, issue reports,
  learning/library content, and account lifecycle remain local.
- FORJD owns sealed intake, streaming, transformation, projections, analytics, ML,
  threat processing, replay, and DLQ.
- DEML calls FORJD with a tenant-bound opaque `fjsvc_` service token. It never calls
  an OAuth token endpoint, uses Supabase `service_role`, or forwards Firebase
  end-user tokens.
- DEML stores an explicit account-to-FORJD-tenant mapping and a secret reference,
  never a plaintext service token. Body/query tenant IDs must match the mapped
  tenant or fail closed.
- Missing FORJD capabilities are explicit dependencies — never filled with DEML
  stream workers or direct FORJD database access.

**Operations:** [docs/FORJD_INTEGRATION.md](docs/FORJD_INTEGRATION.md),
[docs/PRODUCTION_DEPLOY.md](docs/PRODUCTION_DEPLOY.md),
[docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md).

**Steady-state flags (`deml-backend`):** `FORJD_WRITE_MODE=forjd`,
`FORJD_READ_MODE=forjd` (or `FORJD_CUTOVER_PHASE=2`).

## Core Philosophy

- **Zero-Compromise Standards:** Quality is non-negotiable. Automate enforcement.
- **Precision Engineering:** Focus on architectural logic, not trivia.
- **Path of Least Resistance:** Tooling guides developers to the right thing.
- **Symmetrical Multi-Account Control Plane:** Account-scoped Django paths treat
  every mapped account identically. Stream processing and ML are FORJD’s job.
- **FORJD Data Plane:** Sealed ingest, projections, replay/DLQ, analytics, and
  threat/ML execute exclusively in FORJD via tenant-bound `fjsvc_` tokens.
- **Defense-in-Depth Security:** Firebase at DEML; Supabase Auth + service
  principals at FORJD; least privilege; automated scanning.
- **Observability as First-Class:** Product UI observability stays DEML-owned;
  sealed telemetry and analytics live in FORJD.
- **Automation Over Vigilance:** Pre-commit hooks, CI enforcement, doc sync.
- **Pragmatic & Sovereign:** Own identity, billing, consent, and learning content
  locally. Decouple content (Sanity) and edge (Cloudflare) where needed.
- **Inclusive & Accessible:** WCAG 2.1 AA enforced automatically.
- **Future-Proof:** Plan for PQC and FORJD-backed ML. Use `state_dict` only
  (no pickle) if any local model artifacts remain.

## Code Quality & Tooling

- **Frontend:** Prettier + ESLint; `@axe-core/cli` via `scripts/run_axe.js`
  (WCAG 2.1 AA); mobile-first `.page-inner-wrapper`; Viking-UI only
  ([THEME.md](THEME.md), [.cursorrules](.cursorrules)); distroless Node containers.
- **Backend (Python/Django):** Ruff; `uv` / `uvx pre-commit`; Postgres with UUID
  PKs; AES-256-GCM + GCP KMS for secrets; no pickle for models.
- **General:** `scripts/git_flow.py`, `scripts/sync_content.py`, Semgrep/Trivy in CI.

## Architecture & Data Principles

- **Decoupling:** Client (Angular) ↔ Server (Django) via REST + CORS.
  Streaming/processing ↔ FORJD via sealed envelopes + `fjsvc_` tokens.
- **Storage (DEML-owned):** Postgres (accounts, billing, consent, credentials,
  FORJD tenant mapping, learning progress); sessions in Postgres
  (`browser_sessions`, `auth_handoff_tokens`). Firebase is Auth-only — no
  Firestore, Storage, or Cloud Functions.
- **Storage (FORJD-owned):** Sealed events, `stream_results`, report documents,
  replay/DLQ, analytics, threat/ML tables.
- **Multi-Tenancy:** Absolute isolation. Explicit
  `company_account → forjd_tenant_id` mapping. UUIDs everywhere.
- **ML/Intelligence:** Executed in FORJD.
- **UI/Frontend:** Full Angular surface; Signals; Viking-UI; Headless Sanity for
  learning content.
- **Security:** Firebase Auth + Django middleware for end users; never forward
  Firebase tokens to FORJD; FORJD token secret refs only; UUID PKs; ABAC + RBAC
  on DEML surfaces; FORJD enforces tenant binding + RLS.
- **Deployment:** Django on Fly (`deml-backend`, `docs/FLY.md`); Angular on
  Vercel (`deml`, `docs/VERCEL.md`).

## Workflows & Automation

- Pre-commit: `uvx pre-commit run --all-files`
- Docs start in BOOK.md/README; `scripts/sync_content.py` propagates
- Run `node scripts/run_axe.js` and lint before commits

## What Agents Must Do

- Follow automated rules (lint, theme, a11y).
- Align features with symmetrical tenancy, zero-compromise security, and the
  DEML control plane / FORJD data plane boundary.
- Update BOOK.md first if architectural.
- Never introduce: hardcoded tenants, sequential IDs, pickle for models,
  inaccessible UI, or DEML-local stream processing.

## Key Tools & Scripts

- `scripts/git_flow.py` — versioning, PR automation
- `scripts/run_axe.js` — a11y enforcement
- `scripts/sync_content.py` — doc sync
- `scripts/dump_openapi.py` — regenerate `frontend/openapi.json`
- `.cursorrules` — Viking-UI + THEME.md enforcement
- Pre-commit, ruff, eslint, prettier, uv, tsx, Docker (unprivileged)

## Official Integrations (Customer-Facing)

DEML documents first-class integration paths for enterprise ML infrastructure.
Each platform has a dedicated guide in
[BOOK.md § Appendix Z](BOOK.md#appendix-z-integration-guides) and a health-check
endpoint at `/api/v1/integrations/{platform}`:

| Platform     | Primary endpoints                   |
| ------------ | ----------------------------------- |
| Kubernetes   | `/api/v1/predict`, `/api/v1/ingest` |
| TensorFlow   | `/api/v1/ingest`, `/api/v1/predict` |
| PyTorch      | `/api/v1/ingest`, `/api/v1/predict` |
| Apache Spark | `/api/v1/ingest`                    |
| Databricks   | `/api/v1/ingest`, `/api/v1/predict` |
| AWS Redshift | `/api/v1/ingest`, `/api/v1/predict` |

Streaming and warehouse-style analytics exports are FORJD responsibilities.

## Project-Specific Agent Rules

### CORS and Dynamic Domains

- **NEVER** hardcode customer or tenant domains into `CORS_ALLOWED_ORIGINS`.
- Origin validation uses `monitor.cors_utils.is_domain_registered` against Postgres.
- Domains must be registered in the database, not configuration files.

### Core Architectural Invariants

- **FORJD Exclusive Data Plane:** All sealed ingest, projections, analytics, and
  ML execute in FORJD. Contract: [docs/FORJD_INTEGRATION.md](docs/FORJD_INTEGRATION.md).
- **Tenant UUID Normalization:** Never use string literals like `"platform"` as
  foreign keys. Map platform scope to the native Tenant0 UUID
  (`is_platform_tenant=True`) before any persistence or FORJD call.
- **Account → FORJD Tenant Binding:** Every authenticated FORJD call resolves
  `deml_account_id → forjd_tenant_id → secret_ref` and fails closed on mismatch.
- **Angular Surface Intact:** Django adapters keep established Angular paths stable.

### Antigravity Rules & Persona

- **CTO:** Antigravity (Architecture, Frontend, Backend, Data Engineering, ML)
- Collaboration, clean code, Section 508, Semgrep, Viking-UI / THEME.md
- Zero-dependency & IP ownership — minimize third-party UI kits

### Viking-UI Uniformity Law

All DEML surfaces share one design system: **grid-first modern enterprise SaaS**
with Cyber-Noir dark surfaces and Ocean Blue Serenity accents.
**[.cursorrules](.cursorrules)** is the Cursor agent entry point;
**[THEME.md](THEME.md)** is the canonical token matrix;
**[BOOK.md § Chapter 32](BOOK.md#chapter-32-viking-ui--the-zero-dependency-ui-kit)**
documents the kit. Package:
`@dataengineeringformachinelearning/viking-ui`.

- `packages/viking-ui/` owns all CSS/SCSS, tokens, Web Components, Angular
  wrappers, icons, and visual utilities. No other surface owns styling.
- Always import from `@dataengineeringformachinelearning/viking-ui` — never
  Material, Bootstrap, or other third-party UI kits.
- Compose pages with `viking-page-shell` → `viking-section` and semantic layout
  recipes (`viking-panel-grid`, `viking-form-grid`, `viking-stack`,
  `viking-section-template`).
- Charts: `viking-chart` / `viking-chart-panel` only; series via
  `VIKING_SERIES_PRESETS` / `--viking-series-*`.
- Tokens only: every visual value resolves to a `--viking-*` token.
- Breakpoints: `--viking-bp-*` only.
- After Viking-UI changes: `npm run build:viking-ui:package` +
  `python scripts/sync_design_system.py`.
- Pre-ship: `node scripts/enforce-theme.js` (zero violations),
  `node scripts/run_axe.js`, `npm run test:viking-ui`.

### Critical Code Styling & Theming Law

Before editing HTML/CSS/SCSS/Tailwind/Viking-UI styles, conform to **THEME.md**
and **.cursorrules**. No hardcoded hex outside `_variables.scss` /
`_series-colors.scss`. Angular components must not contain `styleUrl`,
`styleUrls`, or inline `styles`.

### Code Style & Modernization

- Prefer `const`; arrow functions; `async`/`await` with proper error handling.
- Python: type annotations on all args/returns; `typing.Final` for constants.
- Tests must follow the same style rules.

### Documentation Rules

- **BOOK.md** — authoritative architecture and operations narrative.
- **WHITEPAPER.md** — concise value proposition and diagrams.
- New dependencies → Acknowledgements in README.md.
- Architectural changes start in BOOK.md; sync via `scripts/sync_content.py`.

Update this file whenever BOOK.md evolves core principles.

**Note on file location:** Canonical AGENTS.md lives at the repository root
(https://agents.md/). Nested AGENTS.md files are supported for subprojects.

For Astro-specific (marketing site): See `marketing/AGENTS.md` and `marketing/CLAUDE.md`.
