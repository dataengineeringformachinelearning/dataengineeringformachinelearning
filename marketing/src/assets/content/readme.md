---
title: DEML Platform
emoji: 🧠
colorFrom: blue
colorTo: indigo
sdk: static
app_file: frontend/dist/frontend/browser/index.html
app_build_command: cd frontend && npm ci && npm run build
pinned: false
license: apache-2.0
---

# Data Engineering for AI Engineering and Cybersecurity: Developer Platform

[Acknowledgements & Technologies](#acknowledgements--technologies)

![Project Banner](https://raw.githubusercontent.com/dataengineeringformachinelearning/dataengineeringformachinelearning/main/frontend/public/data-engineering-for-machine-learning-preview.svg)

> **Platform boundary:** DEML is the Firebase-authenticated user control plane and
> Angular backend-for-frontend. FORJD is the universal secure streaming engine for
> sealed intake, processing, projections, analytics, replay, threat processing, and
> machine learning. DEML calls FORJD with tenant-bound opaque `fjsvc_` tokens and
> sealed AES-256-GCM envelopes. Production hosts: Angular on **Vercel**, Django BFF
> on **Fly** (`deml-backend`), streaming engine on **FORJD** Fly + Supabase.
> Integration contract: [docs/FORJD_INTEGRATION.md](docs/FORJD_INTEGRATION.md).

**Data Engineering for AI Engineering and Cybersecurity (DEML)** is operational intelligence infrastructure for the new digital battlefield. The platform fuses high-throughput telemetry engineering, AI engineering, and intelligence-driven cybersecurity into a single multi-tenant SaaS fabric—where every command path is versioned, every projection is idempotent, and every tenant traverses identical symmetrical pipelines without exception.

---

## Concept of Operations

| Document                                                                                  | Purpose                                 |
| ----------------------------------------------------------------------------------------- | --------------------------------------- |
| [BOOK.md](BOOK.md)                                                                        | Full platform architecture & operations |
| [WHITEPAPER.md](WHITEPAPER.md)                                                            | Executive summary for reviewers         |
| [BOOK.md § Appendix N](BOOK.md#appendix-n-concept-of-operations-operator-quick-reference) | On-call operational checklists          |
| [BOOK.md § Appendix U](BOOK.md#appendix-u-deml-platform-technology-stack)                 | Technology stack overview               |

### Product surfaces (`deml.app`)

| Route                 | Purpose             |
| --------------------- | ------------------- |
| `/dashboard`          | CES / KPI overview  |
| `/analytics`          | Telemetry & threats |
| `/status`, `/explore` | Public status pages |
| `/settings`           | Account management  |

### Native macOS security workbench

The repository also includes `native/macos-app`, a local-first native Rust
security operations client. It provides browser-based Firebase/MFA authentication with
a PKCE-protected return to the app, Keychain-backed desktop sessions, a
persistent vulnerability queue, Ollama and cloud-model triage, and
approval-gated patch application for agent-assisted remediation. See
[BOOK.md § Appendix R](BOOK.md#appendix-r-deml-macos-security-workbench) for the
security model and build instructions.

---

## Core Capabilities

- **Sealed FORJD projections**: Django BFF forwards sealed telemetry; FORJD materializes durable read models
- **High-Throughput Ingestion**: Sub-second telemetry dispatch with micro-batch aggregation
- **Account Isolation**: Strict tenant separation without cross-account data exposure
- **Aggregate Threat Modeling**: Collective anomaly baselines without raw data sharing
- **Predictive SLAs**: Machine learning forecasts service-level breach trajectories
- **SIEM/SOAR Federation**: STIX 2.1 threat intelligence export
- **WCAG 2.1 AA Design**: Premium Viking-UI theme across all surfaces ([THEME.md](THEME.md))
- **Readable Metric Layouts**: Dense Viking-UI cards use a two-column maximum (6/12 each), equal-height rows, and single-line operational labels
- **Canonical Brand Assets**: DEML artwork uses brand navy `#070C20` and brand blue `#0078FF`, governed and synchronized through Viking-UI

---

## Official Integrations

| Platform       | Primary endpoints                   | Guide                                                         |
| -------------- | ----------------------------------- | ------------------------------------------------------------- |
| **Kubernetes** | `/api/v1/predict`, `/api/v1/ingest` | [BOOK.md § Appendix Z](BOOK.md#appendix-z-integration-guides) |
| **TensorFlow** | `/api/v1/ingest`, `/api/v1/predict` | [BOOK.md § Appendix Z](BOOK.md#appendix-z-integration-guides) |
| **PyTorch**    | `/api/v1/ingest`, `/api/v1/predict` | [BOOK.md § Appendix Z](BOOK.md#appendix-z-integration-guides) |
| **Spark**      | `/api/v1/ingest`                    | [BOOK.md § Appendix Z](BOOK.md#appendix-z-integration-guides) |
| **Databricks** | `/api/v1/ingest`, `/api/v1/predict` | [BOOK.md § Appendix Z](BOOK.md#appendix-z-integration-guides) |
| **Redshift**   | `/api/v1/ingest`, `/api/v1/predict` | [BOOK.md § Appendix Z](BOOK.md#appendix-z-integration-guides) |

---

## Getting Started

### 1. Account Setup

Register via the web dashboard to create your account. Each account supports multiple status pages.

### 2. Connect Your Services

Navigate to the **Integrations** tab to generate secure ingestion tokens. Follow the integration guides for your specific tech stack.

### 3. Authentication

```http
Authorization: Bearer YOUR_API_KEY
```

---

## Support & Resources

- **Support:** Open tickets from your dashboard
- **Status:** Monitor on the global Status page
- **Docs:** [DeepWiki](https://deepwiki.com/dataengineeringformachinelearning/dataengineeringformachinelearning) · [Glossary](BOOK.md#appendix-q-deml-glossary) · [Billing](BOOK.md#appendix-m-billing--subscriptions-operator-reference)

---

**Resources:** [GitHub](https://github.com/dataengineeringformachinelearning/dataengineeringformachinelearning)

## Acknowledgements & Technologies

DEML and Viking-UI are original implementations informed by the open standards,
tools, and public design-system guidance below. References are directional
quality bars; their component runtimes and source are not bundled into Viking-UI.

- **Design systems and UI references:** [Material Design 3](https://m3.material.io/) for adaptive foundations and accessibility; [Flux UI](https://fluxui.dev/) for composable, responsive layouts; [Spartan](https://spartan.ng/) for accessible Angular primitives and signal-first ergonomics; [shadcn/ui](https://ui.shadcn.com/) for open composition, blocks, and clear component anatomy; and [Cloudscape Design System](https://cloudscape.design/) for AWS-scale responsive application patterns, accessibility guidance, and operational density.
- **Security and governance reference:** [Trust Controls](https://www.trustcontrols.ai/) for control-oriented product governance and evidence-minded security UX.
- **Design-system delivery:** [Storybook](https://storybook.js.org/) for component documentation and accessibility review; [Chromatic](https://www.chromatic.com/) for published visual regression evidence; [axe-core](https://github.com/dequelabs/axe-core) for automated WCAG checks; and [Inter](https://rsms.me/inter/) for self-hosted variable typography.
- **Core application stack:** [Angular](https://angular.dev/), [Astro](https://astro.build/), [Django](https://www.djangoproject.com/), [PostgreSQL](https://www.postgresql.org/), [Firebase](https://firebase.google.com/), [FORJD](https://github.com/dataengineeringformachinelearning/forjd) (sealed data plane), [Fly.io](https://fly.io/), [Vercel](https://vercel.com/), [OpenTelemetry](https://opentelemetry.io/), and [Firecrawl](https://www.firecrawl.dev/) for verified public-site technology evidence.

The comprehensive technology acknowledgement and software inventory remain in
[BOOK.md](BOOK.md#acknowledgements--technologies) and the generated SBOM.

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning.svg?type=large&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning?ref=badge_large&issueType=license)

![GitHub Repo stars](https://img.shields.io/github/stars/dataengineeringformachinelearning/dataengineeringformachinelearning?style=social)
