# AGENTS.md - Coding Principles and Architectural Vision for the DEML Platform

**Mission**: Build a zero-compromise, precision-engineered Data Engineering for Machine Learning (DEML) platform that merges rigorous data engineering with predictive machine learning. Prioritize quality, security, scalability, multi-tenancy isolation, and resilience at every step. The platform dogfoods itself as Tenant0 and must be production-grade, observable, secure, and maintainable.

**Operations**: Production behavior—vendor split (Cloud Run / Firebase / GCP), command/projection/query paths, actor workflows, maintenance cadence, and degraded modes—is defined in [BOOK.md § CONOPS](BOOK.md#concept-of-operations-conops), [WHITEPAPER.md §2](WHITEPAPER.md#2-concept-of-operations-conops), and [`docs/conops.md`](docs/conops.md). Architectural code changes must remain consistent with that CONOPS.

This document captures the core coding principles, philosophies, and "how we build" from the BOOK.md. All agents, contributors, and LLMs working on the codebase must internalize these to align with the vision of "thoughtful coders" and precision engineering.

## Core Philosophy

- **Zero-Compromise Standards**: Quality is non-negotiable and a survival mechanism. No technical debt through human vigilance alone. Everything must be automated, enforced, and precise.
- **Precision Engineering**: Focus on architectural logic, not trivia. High-velocity development enabled by guardrails.
- **Path of Least Resistance**: Tooling guides developers to do the right thing automatically.
- **Symmetrical Multi-Account Pipeline**: Every worker, ML loop, scanner, etc., processes each `User` account (and the platform scope via `is_platform=True` / `platform-status`) through identical code paths. The platform showcase has no login — public metrics only.
- **Event Projections Architecture** (recent evolution):
  - **Commands**: Client events via Firebase Cloud Functions (`ingestEvent` callable, with `version` and `idempotency_key`).
  - **Reliable Delivery**: Transactional Outbox in Django (Postgres `OutboxEvent` written atomically) + `outbox_relay` management command for publishing to Redpanda.
  - **Projections**: `telemetry_worker` consumes (idempotent with DLQ to `frontend-events-dlq`), enriches (e.g., from Postgres), and materializes into Firestore (named `deml` DB).
  - **Queries**: Direct real-time Firestore subscriptions (e.g., `users/{uid}/data/stats`).
  - Events are versioned for governance. Worker is the authoritative source for projections.
- **Defense-in-Depth Security**: Assume breach. Ubiquitous encryption, least privilege, offloaded auth, automated scanning, behavioral threat intel.
- **Observability as First-Class**: OpenTelemetry + ClickHouse for traces/metrics. Enrichment at edge. Real-time via Firestore for key views.
- **Automation Over Vigilance**: Pre-commit hooks, CI enforcement, doc sync, git flow automation.
- **Pragmatic & Sovereign**: Own your data (e.g., subscribers via Resend but internal models). Use best tools (Postgres, Polars, PyTorch, Redpanda) but decouple where needed (Sanity for content, Cloudflare for edge).
- **Inclusive & Accessible**: WCAG 2.1 AA enforced automatically. Premium UX (skeleton loaders, custom palettes, mobile-first).
- **Scalable Decoupling**: Event-driven with Redpanda for high-throughput. Decouple ingestion from transactions. Native SVG / zero-dep where performance matters. Dedicated apps for concerns (monitoring, ML).
- **Future-Proof**: Plan for PQC, automated hyperparameter tuning, Hugging Face model hosting with tenant namespacing. Use state_dict only (no pickle for security).

## Code Quality & Tooling (Enforced Automatically)

- **Frontend**:
  - Prettier + ESLint (via Angular schematics).
  - Use `tsx` for standalone TypeScript scripts outside Angular.
  - Accessibility: `@axe-core/cli` via `scripts/run_axe.js` — enforced in pre-commit. Target WCAG 2.1 AA. Reject commits with violations.
  - Mobile-first: Strict `.page-inner-wrapper` (1260px max), 9px grid. No CLS.
  - Zero-dependency UI: Native SVG for telemetry graphs (high-frequency data without bloat).
  - Distroless containers: `gcr.io/distroless/nodejs22-debian12` for Angular SSR frontend; `gcr.io/distroless/python3-debian12` for Django API.
  - Premium aesthetic: Viking-UI design system ([THEME.md](THEME.md)) — Porsche/Wallace standards, charcoal/teal/crimson tokens, `viking-skeleton` loaders, Orbitron/Michroma on CES/marketing display only.
- **Backend (Python/Django)**:
  - Ruff for linting/formatting (fast, zero-compromise).
  - Use `uv` (Astral) for environment and tool execution (`uvx pre-commit`).
  - Pre-commit hooks: Auto-format, lint, validate on every commit (multi-language: Ruff, Prettier, ESLint, YAML).
  - Django apps for isolation (e.g., dedicated `monitor`, `ml` apps).
  - PostgreSQL: Primary transactional store (ACID, JSONB, UUID PKs to prevent IDOR). Model with DBeaver. Field-level AES-256-GCM + GCP KMS rotation (every 90 days via workers).
  - No pickle for models: Use PyTorch `state_dict` only.
- **General**:
  - Automated enforcement > human review for style/syntax.
  - `scripts/git_flow.py`: Automates PR description, SemVer tagging, branch management.
  - `scripts/sync_content.py`: Auto-syncs BOOK/README content to frontend docs/assets on main merge (keeps AI agents and users in sync).
  - `scripts/run_axe.js`, `deml-cleanup.sh`, etc., for specific enforcement.
  - Tests: Comprehensive pytest (with Django DB), contract tests for events.
  - Linting in CI: Ruff, ESLint, Semgrep, Trivy, etc.

## Architecture & Data Principles

- **Decoupling**: Client (Angular) ↔ Server (Django) via REST + CORS + Signals. Event-driven core (Redpanda for commands/events).
- **Storage**:
  - Postgres: Transactional truth (tenants, endpoints, incidents, keys, etc.).
  - Redpanda: High-throughput event bus (topics: app-events, frontend-events, user-issues).
  - Firestore (named "deml"): Materialized projections / real-time queries (e.g., user stats).
  - ClickHouse: OLAP/analytics from OpenTelemetry.
- **Multi-Tenancy**: Absolute isolation. Symmetrical pipelines. UUIDs everywhere.
- **Event Projections**: As detailed above. Use Outbox for reliability from Django. Idempotent writes. Versioned events.
- **ML/Intelligence**:
  - Isolate in dedicated `ml` app.
  - PyTorch (MLP for SLA/threat), Polars for batch, GridSearchCV.
  - Teacher models (HF), knowledge distillation.
  - Host on Hugging Face (namespaced by hashed tenant slug).
  - Trigger training asynchronously.
- **UI/Frontend**:
  - Signals for state.
  - Native APIs (SVG, fetch).
  - Headless Sanity for content (decoupled from Django).
  - Dynamic injection for 3rd-party (e.g., Cloudflare, no hardcoded tokens).
- **Security**:
  - Firebase Auth + custom Django middleware for JWT.
  - AES-256-GCM + KMS for secrets/tokens at rest.
  - UUID PKs (no sequential IDs).
  - ABAC (public/private via `is_published`, owner checks) + RBAC (Viewer/Operator/Security Admin).
  - Least privilege, unprivileged containers, App Check/reCAPTCHA.
  - Enrichment + threat intel (AbuseIPDB, OTX, behavioral biometrics, ASN/ISP).
  - PQC plans (lattice-based).
  - Audit logs, Kanban for vulns (Semgrep/Trivy auto-ticket).
- **Observability**:
  - OpenTelemetry (OTLP) → Collector → ClickHouse.
  - Edge enrichment (UA parsing, ipwho.is, domain mappings).
  - Real-time projections in Firestore.
  - Synthetic monitoring for Event Projections loop.
- **Deployment & Ops**:
  - Cloud Run for services (with private networking).
  - Zero-downtime rolling deploys, CI/CD webhooks.
  - Symmetrical: Tenant0 dogfooding.
  - Git flow automation + SemVer.
  - Docs auto-sync.
  - Rate limiting (sliding window in Dragonfly/Redis for COGS/security).
  - Unprivileged multi-stage Docker.
- **Resilience & Reliability**:
  - Event-driven decoupling.
  - Outbox + idempotency + DLQ for projections.
  - Circuit breakers, retries (future).
  - Healthchecks, synthetic tests.
  - Snapshots for projections/replay.
- **Accessibility & UX**:
  - Automated WCAG enforcement.
  - Premium, performant (skeletons, no bloat).
  - Mobile-first strict layout.

## Workflows & Automation (Must Use)

- Pre-commit: `uvx pre-commit run --all-files` (enforces all).
- Git: Use `scripts/git_flow.py` for PRs, releases.
- Docs: Changes start in BOOK.md/README; `scripts/sync_content.py` propagates.
- Testing: Run full suites; axe for a11y.
- Deployment: Via Cloud Run + dedicated Firebase workflow.
- Security: Scan on push (Semgrep, etc.); triage via internal Kanban.
- Run `node scripts/run_axe.js` and lint before commits.

## What Agents Must Do

- When editing code: Ensure it follows automated rules (lint will catch, but think ahead).
- When adding features: Align with Event Projections, symmetrical tenancy, zero-compromise security, Postgres-first transactional + projections.
- Update docs first in BOOK.md if architectural.
- For new workers/services: Must be symmetrical (loop over tenants), use Outbox where publishing events, emit OTEL.
- Prioritize: Reliability (Outbox/idempotency), security (encryption, least priv), performance (Polars, native UI), maintainability (automation).
- Never introduce: Hardcoded tenants/exceptions, sequential IDs, pickle for models, manual formatting, inaccessible UI, fire-and-forget without Outbox, unversioned events.
- When in doubt: Refer to "zero-compromise", "precision engineering", "dogfood as Tenant0", "path of least resistance".

## Key Tools & Scripts

- `scripts/git_flow.py`: Versioning, PR automation.
- `scripts/run_axe.js`: A11y enforcement.
- `scripts/sync_content.py`: Doc sync (critical for agents/LLMs).
- `scripts/dump_openapi.py`: Regenerate `frontend/openapi.json` from Django Ninja schema.
- `scripts/deml-cleanup.sh`: Maintenance.
- Pre-commit config, ruff, eslint, prettier.
- uv, tsx, Docker (unprivileged).

## Project-Specific Agent Rules (from .agents/ setup)

These are additional invariants and rules specific to this project's development workflow.

### CORS and Dynamic Domains

- **NEVER** hardcode customer or tenant domains into `CORS_ALLOWED_ORIGINS` in `backend/config/settings.py` or any other configuration file.
- The platform uses a unified, dynamic CORS resolution system.
- For Django endpoints, origin validation is automatically handled via `django-cors-headers` signals which rely on `monitor.cors_utils.is_domain_registered`. This checks the Postgres database (`Tenant`, `ValidatedSite`, `MonitoredService`, `Endpoints`).
- If a domain needs to be allowed, it MUST be registered in the database via the application's models, not hardcoded into configuration files.
- The OpenTelemetry Collector (`infrastructure/otel-collector`) is the only exception; it is configured to accept all origins (`*`) dynamically, and invalid telemetry is filtered downstream.

### Core Architectural Invariants

- **Tenant0 UUID Normalization:** Never use string literals like `"platform"` as foreign keys in background workers or telemetry payloads. The `NetworkTelemetryMiddleware` explicitly intercepts legacy `"platform"` requests and dynamically maps them to the native UUID of Tenant0 (`is_platform_tenant=True`). This guarantees that Redpanda/Kafka streams and Polars aggregations operate on a homogenous stream of valid UUIDs end-to-end, preventing database foreign key constraint errors downstream.
- **Symmetrical Multi-Tenant Pipelines:** When authoring background workers, cron workers, or OSINT scanners, NEVER hardcode execution exclusively for the platform. You must ALWAYS structure the pipeline to iterate dynamically over `Tenant.objects.all()`. Because the platform itself is cleanly bootstrapped as Tenant0, this guarantees that both the core infrastructure and individual customer environments are processed symmetrically within the exact same loop, eliminating architectural debt and hardcoded exceptions.
- **Data Enrichments & Critical Path:** Data enrichments and features must meet Tenant0 standards and follow the system design path of the platform so all tenant data benefits. The explicit pipeline process is: **collect, enhance, aggregate, showcase** to the user. The final processed results must be written to a dedicated table for snappy, optimized access via the UI. This ensures the "critical path of the application" remains highly responsive while delivering deep, enriched insights to the user.

### Antigravity Rules & Persona

This document defines the core roles and collaboration rules for our development workflow.

#### The Team

- **CTO**: Antigravity (Architecture, Frontend, Backend, Data Engineering, Machine Learning)

#### Principles

1.  **Collaboration**: The CTO proposes technical solutions, patterns, and architectures; the product lead provides feedback and approvals.
2.  **Standards**: Adhere strictly to clean code, Section 508 accessibility compliance, robust unit testing, and Semgrep security standards.
3.  **Modern Stack**: Focus on clean, modern, and beautiful designs following the guidelines set in `THEME.md` and standard framework patterns.
4.  **Zero-Dependency & IP Ownership**: Maximize intellectual property and system stability by building independent, highly-cohesive implementations from scratch. Strictly minimize reliance on third-party libraries, external dependencies, or heavy abstraction layers. Our code is our IP.

### Critical Code Styling & Theming Law

- Before creating, editing, or refactoring ANY HTML template, CSS/SCSS file, Tailwind class configuration, or Ant Design component theme token, you MUST read and explicitly conform to the definitions found in the root `THEME.md` file.
- **Never** generate hardcoded color palettes or introduce random hex strings (e.g., `#000` or `#fff` or arbitrary blues/teals) that deviate from the design matrix in `THEME.md`.
- All visual components generated in the browser walkthroughs must match the specific Material Theme token assignments and semantic/data visualization color maps specified in `THEME.md`.
- Keep the theme consistent, usable, 508 compliant, and visually distinct:
  - **Contrast Ratios**: Every text element must meet or exceed WCAG 2.1 AA standards (minimum 4.5:1 contrast ratio for normal text, 3:1 for large text).
  - **Keyboard Navigation**: All interactive elements must be accessible via keyboard and have visible, high-contrast focus indicators (`:focus-visible`).
  - **Screen Reader Support**: Use semantic HTML5 elements and provide descriptive `aria-label` or `aria-labelledby` attributes for controls, especially icon-only buttons.
  - **Visual Distinction**: Ensure interactive controls look clearly actionable (e.g., distinct hover and active states) and never rely solely on color to convey information or status.

### Code Style & Modernization Guidelines

- **Variables (JS/TS)**: Always prefer `const` over `let` and `var`. Use `let` only if the variable must be reassigned. Never use `var`.
- **Functions (JS/TS)**: Always use arrow functions (`const fn = () => {}`) instead of classic `function` statements.
- **Asynchronous Operations**: Always use `async`/`await` with proper `try`/`catch` (JS/TS) or `try`/`except` (Python) blocks for error handling. Avoid raw `.then()`/.`catch()` or old callback-style code.
- **Constants (Python)**: Use `typing.Final` to specify constants (e.g. `MY_CONSTANT: Final = "value"`).
- **Functions (Python)**: Add type annotations to all arguments and return values. Ensure function signatures are modern and clean.
- **Test-Driven Development**: All testing files (e.g., `*.spec.ts`, `test_*.py`) must strictly adhere to the above code style and modernization rules. In particular, Python tests must have full type annotations for arguments (e.g., fixtures like `client: Client`, `db: Any`) and return values (e.g., `-> None`).

### Documentation & Whitepaper Rules

- **BOOK.md as the Book**: The `BOOK.md` file serves as "the book". Each chapter must be comprehensive, containing at least three paragraphs of approximately 200 words each (minimum 600 words per chapter). It must include generic sample code snippets that demonstrate the features, and provide links to all technologies used.
- **Whitepaper Maintenance**: The `WHITEPAPER.md` is a brief, focused on the value add and hypothesis of the platform. It should include architecture diagrams and algorithms, styled similarly to trending papers on HuggingFace. It should be concise and conceptual.
- **Acknowledgements**: Whenever a new technology, framework, or dependency is adopted into the stack, it MUST be explicitly appended to the `## Acknowledgements & Technologies` section in `README.md`. Always ensure there is a clear link from the top of the documentation to the acknowledgements section.

### Tightly Coupled Schedulers & Integrations

- **Unified Intelligent Schedulers**: Schedulers and background workers must be tightly coupled with core integrations (Firebase, Stripe, etc.) and designed to react intelligently to cross-platform signals and events (e.g., logins, checkout completions).
- **Consolidation**: Actively condense and consolidate workers where logically possible to reduce infrastructure overhead. Avoid fragmenting related sync and reconciliation logic across multiple disconnected scripts.
- **Agent Principal**: Treat the background system as an intelligent, unified "Account Manager" that actively governs user data securely, automatically applying state changes globally across all recognized user identities without requiring manual intervention.

This AGENTS.md ensures every agent/LLM knows the "what" (Event Projections, multi-tenant ML platform with zero-compromise security/observability) and "how" (automation, decoupling, Postgres + events + projections, strict enforcement).

Update this file whenever BOOK.md evolves core principles.

**Note on file location**: Per the official AGENTS.md spec (https://agents.md/), the canonical location is at the **root of the repository**. Nested AGENTS.md files are supported for subprojects (nearest one wins).

For Astro-specific (marketing site): See `marketing/AGENTS.md` and `marketing/CLAUDE.md`.
