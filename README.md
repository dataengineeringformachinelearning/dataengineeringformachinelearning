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

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/dataengineeringformachinelearning/dataengineeringformachinelearning)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?logo=github&logoColor=fff)](https://github.com/dataengineeringformachinelearning/dataengineeringformachinelearning)
[![Acknowledgements](https://img.shields.io/badge/Acknowledgements-%26_Technologies-2176ff)](#acknowledgements--technologies)

![Project Banner](https://raw.githubusercontent.com/dataengineeringformachinelearning/dataengineeringformachinelearning/main/frontend/public/data-engineering-for-machine-learning-preview.png)

**Data Engineering for AI Engineering and Cybersecurity (DEML)** is operational intelligence infrastructure for the new digital battlefield. The platform fuses high-throughput telemetry engineering, AI engineering (including predictive machine learning, model serving, and intelligent systems), and intelligence-driven cybersecurity into a single multi-tenant SaaS fabric—where every command path is versioned, every projection is idempotent, and every tenant traverses identical symmetrical pipelines without exception.

In contested operational environments, reactive dashboards are insufficient. DEML ingests telemetry at scale, forecasts SLA breach before degradation manifests, detects AI threats and anomalies, manages secure model lifecycles, and serializes high-confidence indicators into STIX 2.1 for downstream SOAR consumption. The architecture is specified with doctoral rigor; the system is deployed for production operations today.

> **Looking for the Book or Whitepaper?**
> The philosophical, educational, and narrative deep dives into data engineering, AI engineering, MLOps, and cybersecurity operations can be found in our comprehensive book: **[Read the Book (BOOK.md)](BOOK.md)**
>
> For a brief summary of the platform's hypothesis, architecture diagrams, and algorithms, please read the **[Whitepaper (WHITEPAPER.md)](WHITEPAPER.md)**.
>
> For the unified visual design system (Viking-UI premium theme), see **[THEME.md](THEME.md)**. Cursor agents and contributors must also read **[.cursorrules](.cursorrules)** for mandatory Viking-UI component usage.

> [!NOTE]
> **arXiv Endorsement Request:** We are currently seeking an arXiv endorsement to formally publish the architectural whitepaper to `cs.CR` (Cryptography and Security). If you are a qualified arXiv author and find this work valuable, we would greatly appreciate your endorsement! You can endorse the author [here](https://arxiv.org/auth/endorse?x=ZISEYL) using code **ZISEYL**.

> **Resources:** [GitHub repository](https://github.com/dataengineeringformachinelearning/dataengineeringformachinelearning) · [DeepWiki](https://deepwiki.com/dataengineeringformachinelearning/dataengineeringformachinelearning) · [Glossary](docs/glossary.md) · [Billing](docs/billing.md) · **[Acknowledgements & Technologies](#acknowledgements--technologies)**

> **Recent Architectural Evolution**: The platform has adopted an **Event Projections** model with Firebase Cloud Functions as the client command gateway, Redpanda for reliable event streaming, Django workers for processing, and Firestore (named `deml` database) for real-time queries. See the updated architecture diagram. The end-to-end loop is monitored automatically by a synthetic health probe in the telemetry worker and surfaced as the **"Event Projections"** component on the public `platform-status` page (no manual test button). Firebase Functions and rules are deployed via a dedicated GitHub workflow.

---

## Concept of Operations (CONOPS)

How the platform is **operated** in production—vendor boundaries, actor workflows, data paths, maintenance cadence, and degraded-mode behavior—is documented in three layers:

| Document                                                         | Audience                                                               |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [BOOK.md § CONOPS](BOOK.md#concept-of-operations-conops)         | Full operational narrative (architecture, security ops, contingencies) |
| [WHITEPAPER.md §2](WHITEPAPER.md#2-concept-of-operations-conops) | Executive summary for reviewers                                        |
| [docs/conops.md](docs/conops.md)                                 | On-call checklists and quick reference                                 |

**Operational summary:** Compute runs on a **multi-target container topology**—**Railway**, **Google Cloud Run**, or **AWS Lightsail/Fargate**—with Django as the control plane and a role-selected Rust data plane. The same compiled image runs independently as `deml-relay`, `deml-scheduler`, `deml-probe`, `deml-normalizer`, `deml-cpe`, or optional `deml-ingest`; Postgres leases and idempotency constraints make replicas safe. Firebase provides Auth, the `ingestEvent` command gateway, Firestore read models, and marketing hosting. Client commands flow **Angular → Firebase Functions → Redpanda → Django projector → Firestore**; raw endpoint telemetry flows through `telemetry-raw` to the Rust normalizer; API integrators use a transactional Outbox published by the Rust relay.

### Supported runtimes

| Runtime                     | Role                                                                                | Entry                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Railway**                 | Multi-service mesh with private DNS (`*.railway.internal`); catalog + audit in-repo | [`services.json`](infrastructure/railway/services.json) · [playbook](infrastructure/railway/README.md) · `python scripts/railway_audit.py` |
| **Cloud Run**               | Fully managed GCP services; detailed env matrix in the Book                         | [BOOK.md Appendix C](BOOK.md#appendix-c-cloud-run-deployment)                                                                              |
| **AWS Lightsail + Fargate** | Cost-optimized alternate with ECR images                                            | [BOOK.md Appendix E / Ch. 23](BOOK.md#chapter-23-production-deployment-on-aws-lightsail-container-services-and-fargate)                    |

All targets share the same Docker images, Event Projections loop, symmetrical multi-account workers, and Firebase command/projection paths. Every background responsibility has one production owner. Python relay, pinger, and interval schedulers are rollback-only when the corresponding Rust role is deployed.

### Product surfaces (`deml.app`)

| Route                 | Purpose                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `/dashboard`          | CES / KPI overview and performance telemetry                                                |
| `/analytics`          | Latency, geographic origins, threat charts, gauges                                          |
| `/status`, `/explore` | Status directory and public pages                                                           |
| `/status/:slug`       | Isolated public status (e.g. `platform-status`)                                             |
| `/settings`           | Sites, services, incidents, analytics IDs (**MFA-verified session** required for mutations) |
| `/account`            | Profile, MFA enrollment, linked accounts                                                    |
| `/vulnerabilities`    | SOC / vuln Kanban                                                                           |
| `/success`            | Post–Stripe Checkout re-sync                                                                |

See [docs/features.md](docs/features.md), [docs/glossary.md](docs/glossary.md), and [docs/billing.md](docs/billing.md).

---

## Core Capabilities

- **Event Projections Architecture**: Commands ingress via Firebase Cloud Functions (`ingestEvent`) to Redpanda with Firestore fallback; projections materialize into the named `deml` database; queries execute through direct real-time subscriptions. Django workers constitute the authoritative projection layer.
- **High-Throughput Ingestion**: Broker-native telemetry pipelines via Redpanda and Polars micro-batch aggregation—engineered for sub-second dispatch without JVM overhead.
- **Account & Site Isolation**: One login per account (`UserProfile.account_id`); many status pages per operator. Telemetry and widgets remain strictly account-scoped—no org hierarchies, no shared sub-logins, no cross-tenant bleed.
- **Aggregate Threat Modeling**: Global models train on anonymized platform telemetry to establish collective anomaly baselines—herd immunity without raw cross-account exposure.
- **Account-Scoped Evaluation**: Threat reports correlate tenant-specific telemetry against the aggregate model under strict UUID isolation.
- **Predictive SLAs**: PyTorch MLP modules forecast service-level breach trajectories from latency variance, error-rate vectors, and temporal patterns.
- **Hugging Face Integrations**: Namespaced model Hub publishing and Spaces deployment with `state_dict` serialization—no pickle.
- **SIEM/SOAR Federation**: ML-scored anomalies serialize to STIX 2.1 payloads for TAXII distribution to CISA AIS, MS-ISAC, and IT-ISAC hubs.
- **Operational Assurance**: Automated testing, static analysis (Ruff, ESLint, Axe), and pre-commit enforcement sustain production-grade reliability under continuous deployment.
- **Billing (Stripe)**: Live Standard → Pro checkout, webhooks, and `sync_subscriptions` reconciliation ([docs/billing.md](docs/billing.md)).
- **Embeddable status widgets**: Zero-dependency `widget.js` for public status embeds (Viking-UI package / marketing assets).
- **Viking-UI Design System**: Unified premium theme ([THEME.md](THEME.md), [.cursorrules](.cursorrules)) across marketing, application, API, and documentation surfaces—composable primitives, zero third-party UI runtimes, WCAG 2.1 AA by construction.

## Design System (Viking-UI)

All DEML surfaces share one visual language defined in **[THEME.md](THEME.md)** — the Viking-UI premium theme. **[.cursorrules](.cursorrules)** enforces Viking-UI imports and token-only styling for Cursor agents.

| Surface                                                                                      | Theme entry point                              |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [dataengineeringformachinelearning.com](https://dataengineeringformachinelearning.com)       | `/assets/viking-ui.css`                        |
| [deml.app](https://deml.app)                                                                 | `@dataengineeringformachinelearning/viking-ui` |
| [backend.deml.app](https://backend.deml.app)                                                 | `backend/static/viking-ui.css`                 |
| [ui.dataengineeringformachinelearning.com](https://ui.dataengineeringformachinelearning.com) | Viking-UI docs + static CSS build owner        |
| Swagger / OpenAPI UI                                                                         | Same tokens via static CSS                     |

**Design doctrine:** Precision-engineered industrial surfaces—composable primitives on a **premium restrained luxury** palette: dark charcoal foundations (`--viking-charcoal-900`), deep teal primary actions (`--viking-teal-600`), crimson secondary emphasis (`--viking-crimson-600`), machined metallic borders, and native SVG telemetry charts. Import `viking-*` components exclusively; never hardcode styles. See [Chapter 31 in BOOK.md](BOOK.md#chapter-31-viking-ui--the-zero-dependency-ui-kit) for component coverage and build instructions. **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md) and the [live docs site](https://ui.dataengineeringformachinelearning.com/contributing).

## Solution Architecture

The platform implements an **Event Projections** architecture for client-driven events with strong reliability guarantees:

- **Commands** (writes): Angular Client → Firebase Cloud Functions (`ingestEvent`) → Redpanda (topic: `frontend-events`) with Firestore fallback. Django API paths use a **Transactional Outbox** pattern (events written atomically to Postgres `OutboxEvent` table before returning).
- **Projections**: Django `telemetry_worker` consumes from Redpanda, enriches data (e.g. active endpoint counts from Postgres), and writes to Firestore (named `deml` DB). Projections are **idempotent** (using stable message keys) and support a dead-letter queue (`frontend-events-dlq`) for failed messages.
- **Queries** (reads): Direct real-time subscriptions to the projected Firestore state (e.g. `users/uid/data/stats`).
- Events include a `version` field for schema governance. The Rust `deml-relay` service leases Outbox rows with `SKIP LOCKED`, publishes with stable event IDs and `acks=all`, and supports multiple replicas.

```mermaid
flowchart TB
    subgraph Frontend
        L[Astro Landing Page]
        A[Angular Client]
    end

    subgraph "Client Event Gateway (Commands)"
        FCF[Firebase Cloud Functions<br/>ingestEvent callable]
        C[Firebase Authentication]
        FCF -.->|Auth Context| C
    end

    subgraph "Event Broker & Processing"
        D[Redpanda Kafka Broker<br/>frontend-events topic]
        TW["Django Telemetry Worker<br/>(Polars + ORM enrichment)"]
    end

    subgraph "Event Projections (Read Models)"
        FS[(Firestore<br/>named DB: deml)]
    end

    subgraph "API Gateway & Auth (Legacy/Integrations)"
        B[Django REST API]
        C2[Firebase Authentication]
        B -.->|Verifies JWT| C2
    end

    subgraph "Analytics & ML"
        E[Polars Batch Worker]
        F[PyTorch SLA Models]
        G[Scikit-learn Tuning]
    end

    subgraph "Data Storage & Observability"
        H[(PostgreSQL)]
        I[(ClickHouse)]
        J[OpenTelemetry Collector]
    end

    A -->|Client Events / get_stats| FCF
    FCF -->|Try publish| D
    FCF -->|Fallback write| FS
    D -->|Consume| TW
    TW -->|Enriched write| FS
    FS -.->|"onSnapshot users/uid/data/stats"| A
    A -->|REST / CORS| B
    B -->|Produces Event| D
    E -->|Consumes & Writes| H
    E -->|Triggers Training| F
    F -->|Optimizes| G
    B -->|OTLP Traces| J
    E -->|OTLP Traces| J
    J -->|Stores| I
```

**Key Recent Architectural Additions (Reliability & Event Projections):**

- **Transactional Outbox Pattern**: Events are durably recorded in Postgres `OutboxEvent` and published by the leased Rust relay with exponential retry, explicit DLQ state, and event-driven wakeups.
- **Idempotent Projections + DLQ**: The `telemetry_worker` now uses stable message keys (`idempotency_key`) for deduplication of projections into Firestore; failed messages are routed to a `frontend-events-dlq` topic.
- Firebase Cloud Functions (`ingestEvent`) as the primary client command gateway (includes `version` and `idempotency_key` for governance).
- Event Projections using Firestore (named "deml" database) for low-latency materialized read models, with the worker as the authoritative projection layer.
- Event schema versioning ("1.0") and dedicated GitHub Actions workflow (`.github/workflows/firebase-backend-deploy.yml`) for Functions + Firestore rules.
- Dedicated Firestore security rules for user-owned data isolation.
- Simplified projection flow: worker is now the single source for stats/projections (removed direct writes from the function).

---

## The Integration Gateway

DEML is not a standalone observability console—it is the command-and-control layer for MLOps workflows. A hardened API gateway enables external systems to stream telemetry, invoke inference, and exchange threat indicators under zero-trust authentication.

### API Key Management

To interact with the integration gateway, you must authenticate using API keys.

1.  **Create an Account:** Register via the web dashboard.
2.  **Generate a Key:** Navigate to your User Profile -> API Keys and click "Generate New Key".
3.  **Authentication:** Pass the key in the `Authorization` header of your requests:
    ```http
    Authorization: Bearer YOUR_API_KEY
    ```

### Rate Limits

To ensure platform stability, we enforce the following default rate limits:

- **Standard Tier (Free):** 60 requests / minute
- **Pro Tier ($39/mo):** 1,000+ requests / minute

---

## API Endpoints

### Data Ingestion: `/api/v1/ingest`

High-throughput endpoint optimized for receiving batched or streaming data from pipelines like Apache Spark or Databricks.

**Example Request:**

```bash
curl -X POST https://your-domain.com/api/v1/ingest \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_id": "123", "records": [{"feature1": 1.0, "feature2": "A"}]}'
```

### Inference: `/api/v1/predict`

Low-latency endpoint for real-time model inference, ideal for Kubernetes sidecars or PyTorch/TensorFlow direct calls.

**Example Request:**

```bash
curl -X POST https://your-domain.com/api/v1/predict \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model_version": "v2", "inputs": [0.5, 0.2, 0.9]}'
```

---

## Official Integrations

DEML provides first-class integration paths for the tools that power modern ML infrastructure. Each guide includes setup steps, code samples, and health-check endpoints.

| Platform         | Integration pattern                                      | Primary endpoint                    | Guide                                                |
| ---------------- | -------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------- |
| **Kubernetes**   | Sidecar proxy, cluster gateway, CRD operator _(roadmap)_ | `/api/v1/predict`, `/api/v1/ingest` | [kubernetes.md](docs/integrations/kubernetes.md)     |
| **TensorFlow**   | `tf.data.Dataset` streaming, remote inference            | `/api/v1/ingest`, `/api/v1/predict` | [tensorflow.md](docs/integrations/tensorflow.md)     |
| **PyTorch**      | Custom `DataLoader`, Hugging Face `state_dict` models    | `/api/v1/ingest`, `/api/v1/predict` | [pytorch.md](docs/integrations/pytorch.md)           |
| **Apache Spark** | Batch + Structured Streaming sinks                       | `/api/v1/ingest`                    | [apache-spark.md](docs/integrations/apache-spark.md) |
| **Databricks**   | Secret Scopes, scheduled jobs, notebook ingest           | `/api/v1/ingest`, `/api/v1/predict` | [databricks.md](docs/integrations/databricks.md)     |
| **AWS Redshift** | UNLOAD/COPY, Data API, scheduled warehouse exports       | `/api/v1/ingest`, `/api/v1/predict` | [redshift.md](docs/integrations/redshift.md)         |

### Authentication (all integrations)

Every integration uses the same bearer token. Generate an API key in **Settings → API Keys** (shown once, SHA-256 hashed at rest):

```http
Authorization: Bearer YOUR_API_KEY
```

### Kubernetes

Deploy a lightweight sidecar alongside your pods to inject credentials and proxy traffic locally:

```yaml
- name: deml-sidecar
  env:
    - name: DEML_UPSTREAM_URL
      value: "https://backend.deml.app/api/v1"
    - name: DEML_API_KEY
      valueFrom:
        secretKeyRef:
          name: deml-platform-credentials
          key: api-key
```

See [docs/integrations/kubernetes.md](docs/integrations/kubernetes.md) for full Pod specs, cluster gateway patterns, and operator roadmap.

### TensorFlow

Stream batched training data into `tf.data.Dataset`:

```python
dataset = tf.data.Dataset.from_generator(record_generator, ...)
dataset = dataset.batch(32).prefetch(tf.data.AUTOTUNE)
model.fit(dataset, epochs=10)
```

See [docs/integrations/tensorflow.md](docs/integrations/tensorflow.md).

### PyTorch

Use a remote `Dataset` backed by `/api/v1/ingest`:

```python
loader = DataLoader(DemlRemoteDataset(page_size=64), batch_size=32, shuffle=True)
for features, labels in loader:
    loss = criterion(model(features), labels)
```

See [docs/integrations/pytorch.md](docs/integrations/pytorch.md).

### Apache Spark

Push micro-batches from Structured Streaming:

```python
def write_batch(batch_df, batch_id):
    records = [row.asDict() for row in batch_df.collect()]
    requests.post(INGEST_URL, headers=headers, json={"records": records})
payload.writeStream.foreachBatch(write_batch).start()
```

See [docs/integrations/apache-spark.md](docs/integrations/apache-spark.md).

### Databricks

Store keys in Secret Scopes and ingest from notebooks or scheduled jobs:

```python
api_key = dbutils.secrets.get(scope="deml", key="api-key")
requests.post(INGEST_URL, headers={"Authorization": f"Bearer {api_key}"}, json={...})
```

See [docs/integrations/databricks.md](docs/integrations/databricks.md).

### AWS Redshift

Export warehouse rollups via UNLOAD or the Redshift Data API, then ingest to DEML:

```python
requests.post(
    INGEST_URL,
    headers={"Authorization": f"Bearer {api_key}"},
    json={"source": "aws-redshift", "batch_id": "daily-rollups", "records": records},
)
```

See [docs/integrations/redshift.md](docs/integrations/redshift.md).

### Integration health checks

Verify connectivity per platform:

```bash
curl https://backend.deml.app/api/v1/integrations/kubernetes -H "Authorization: Bearer YOUR_API_KEY"
curl https://backend.deml.app/api/v1/integrations/tensorflow   -H "Authorization: Bearer YOUR_API_KEY"
curl https://backend.deml.app/api/v1/integrations/pytorch        -H "Authorization: Bearer YOUR_API_KEY"
curl https://backend.deml.app/api/v1/integrations/apache-spark -H "Authorization: Bearer YOUR_API_KEY"
curl https://backend.deml.app/api/v1/integrations/databricks     -H "Authorization: Bearer YOUR_API_KEY"
curl https://backend.deml.app/api/v1/integrations/redshift        -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Getting Started

Operational onboarding requires fewer than five minutes. The sequence below establishes authenticated ingress, tenant-scoped projections, and live dashboard visibility.

### 1. Account Setup

- **Registration**: Sign up for a secure account via the web dashboard (one Firebase login → one account).
- **Sites**: Create one or more status pages under your account. Publish a page (`is_published`) to expose it on `/explore` and to anonymous visitors; leave it unpublished to keep stats private to your login.
- **Roles**: Each account has a single role (`Viewer`, `Operator`, or `Security Admin`) on `UserProfile`—there are no nested org users or team seats. New accounts default to `Operator`.
- **Billing**: Select your tier. The free tier provides up to 60 API requests per minute for sandbox testing and development.

### 2. Connect Your Services

To start analyzing data and building models, you need to route telemetry and pipeline logs to our ingestion endpoints.

- Navigate to the **Integrations** tab in your dashboard.
- Generate a secure ingestion token for your specific application.
- Follow the native integration guides for your specific tech stack (e.g., Kubernetes, Apache Spark, TensorFlow).

### 3. API Authentication

For custom integrations or direct programmatic access, generate a dedicated API key from the **API Keys** section in your user profile. Always pass this key in the `Authorization` header:

```http
Authorization: Bearer YOUR_API_KEY
```

---

## Local Development: Clean Up & Rebuild Environments

To reset **all** local environments with the latest dependencies (recommended after pulls, refactors, or dependency updates):

```bash
# 1. Purge all caches, __pycache__, dists, .angular, node_modules bloat, etc.
npm run hygiene:cache
bash scripts/deml-cleanup.sh

# 2. Backend (Python + uv)
cd backend
rm -rf .venv
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt

# 3. Node workspaces (fresh installs)
cd ../frontend && rm -rf node_modules dist .angular && npm install --legacy-peer-deps
cd ../viking-ui-docs && rm -rf node_modules dist && npm install --legacy-peer-deps
cd ../marketing && rm -rf node_modules dist && npm install
cd ../functions && rm -rf node_modules && npm install   # Firebase functions (optional)

# 4. Rebuild generated assets + sync (Viking-UI, design tokens, content, widgets, icons, etc.)
cd ..
npm run sync
npm run build:viking-ui --prefix frontend
npm run build:viking-ui:package                    # design-tokens.css, deml-components.css, viking-ui.css, Web Components
python3 scripts/sync_design_system.py            # fan-out CSS + fonts + widgets to all surfaces

# 5. (Optional) Rebuild Viking-UI docs site (includes static CSS in prebuild)
npm run build:viking-ui-docs
```

See [BOOK.md](BOOK.md) (Chapter on fresh install + starting services) for full run commands (`docker compose up`, backend workers, `npm start`, etc.), .env setup, and migrations.

This sequence ensures clean, up-to-date venvs + node_modules + all synced/generated files (from `scripts/` + prebuild hooks).

---

## Hugging Face Integrations & Global Threat Intelligence

The DEML Platform natively integrates with Hugging Face to automate the sharing of PyTorch models and static assets. We employ a privacy-first, aggregated architecture to share threat intelligence globally without exposing user data.

- **Global Platform Models**: Background workers securely aggregate anonymized telemetry across the entire platform to train a single global `platform_threat_model.pt`. This model benefits from "herd immunity" without exposing any single account's raw data.
- **Model Hub**: The global PyTorch threat models and SLA models are automatically pushed to the Hugging Face Hub using the `huggingface_hub` API.
- **Spaces Deployment**: GitHub Actions are configured to automatically sync the Book, Whitepaper, and UI to a Hugging Face Space upon commits to `main`.

**Requirements:**

- Add `HF_TOKEN` and `HF_REPO_ID` to your backend environment variables (e.g., in Cloud Run). See [Appendix C in BOOK.md](BOOK.md#appendix-c-cloud-run-deployment) and the `*.env.example` files for the complete, up-to-date list (including `FRONTEND_URL`, `BACKEND_URL`, `MARKETING_URL` for cross-site handoff, Outbox/Redpanda/Dragonfly, etc.).
- Add `HF_TOKEN` and `HF_SPACE_REPO` as GitHub Repository Secrets to enable the Spaces sync action.

---

## Alerting & Notifications

The platform supports automated email alerts for system events and model training completion. To configure these notifications:

- Set `RESEND_API_KEY` to your Resend API Key in your backend environment variables.
- Set `ALERT_EMAIL_TARGET` to the destination email address for system alerts.
- (Optional) Set `ALERT_EMAIL_FROM` to customize the sender address (defaults to `notifications@deml.app`).

---

## Enterprise Security & Compliance

We take data security seriously. As a multi-account SaaS platform, we employ strict isolation protocols to protect your data.

- **Data Isolation:** All account data is cryptographically isolated using account-scoped keys (`UserProfile.account_id`) and dedicated encryption at rest.
- **Continuous Auditing:** Our infrastructure undergoes continuous vulnerability scanning to ensure your models are safe.
- **Application-Level Telemetry:** A native middleware acts similarly to Zeek, passively monitoring all incoming request headers, IPs, methods, and processing latencies. This telemetry is tracked and scoped to the account resolved from the request (cached domain → account mappings) without blocking the main thread.
- **OSINT & Dark Web Scanning:** Daily background cron workers leverage the "Have I Been Pwned" (HIBP) API and query the Tor network via Ahmia to automatically hunt for compromised account emails and brand mentions on dark web forums. Additionally, Certificate Transparency logs are scanned for exposed subdomains. All findings are natively serialized as `ThreatIntelligence` and `Endpoints` records in the database to instantly populate your security dashboard.
- **Post-Quantum Cryptography (PQC):** The platform features a Post-Quantum Key Encapsulation Mechanism (KEM) using `liboqs`. External services can invoke the `/api/v1/telemetry/pq-key-exchange` endpoint to securely negotiate a PQ session key before transmitting transient, highly sensitive telemetry payloads over standard TLS. The server enforces Forward Secrecy by strictly caching the ephemeral secret key for exactly 5 minutes using a unique UUID and permanently destroying it immediately upon decapsulation. This actively prevents "Store Now, Decrypt Later" (SNDL) attacks. (Fails over gracefully to AES if `liboqs` is absent).
- **Platform Status Bootstrapping:** Django signals (`post_migrate`) ensure the public `platform-status` page exists (`user=null`, `is_platform=True`) so workers, ML pipelines, and the marketing sentinel share one canonical showcase scope—no hardcoded tenant strings.
- **Access Control Architecture (RBAC & ABAC):** One login per account; no org hierarchies. Authorization combines role, session, ownership, and publication state (see [WHITEPAPER.md §8](WHITEPAPER.md#8-role-based--attribute-based-access-control-rbac--abac) for the full matrix).
  - **RBAC:** `UserProfile.role` is `Viewer`, `Operator`, or `Security Admin`. Status page create/update/delete requires `Operator` or `Security Admin` via `@role_required`. The Settings UI disables all mutations for `Viewer`. `/analytics` and `/vulnerabilities` require login (`authGuard`).
  - **ABAC:** Anonymous users read **published** pages and **`platform-status`** only. Logged-in owners also read their **unpublished** pages and stats. Writes require ownership + MFA (`amr` contains `mfa` in the Firebase JWT). `platform-status` is read-only for everyone. API ingest keys resolve to `account_id` dynamically.
  - **Public stats pages:** Visiting `/status/:slug` or `/explore` while logged out shows uptime and service health only when `is_published=True` or `slug=platform-status`; private pages return forbidden/empty lists.
- **Compliance:** We are actively pursuing SOC 2 Type II, CMMC 2.0, NIST SP 800-171 Rev. 3, and GDPR compliance certifications. You can review our full security posture and architecture in our Whitepaper.

## Disclaimer & Liability

> [!WARNING]
> **Liability Disclaimer:** The Data Engineering for AI Engineering and Cybersecurity (DEML) Platform, including all associated models, dashboards, and integrations, is provided "as-is" and without warranty of any kind.
>
> Our primary objective is to **highlight and support the identification of potential threats** and anomalies based on aggregated telemetry data. The platform should be used as a supplementary tool for threat intelligence and not as a guaranteed preventative measure or absolute security solution.
>
> We explicitly disclaim all liability for any security breaches, data loss, or system downtime experienced by users, including those on paid or enterprise tiers. While our machine learning models and OSINT scanners are designed to provide robust security insights, the ultimate responsibility for securing infrastructure and responding to identified threats remains with the individual user or organization.

## Support & SLA

We provide dedicated support for our users:

- **Support Tickets:** Open a support ticket directly from your dashboard for any technical assistance or integration help.
- **System Status:** Monitor our real-time API uptime on the global Status page.

---

## Acknowledgements & Technologies

The DEML platform stands on open-source foundations, enterprise design references, and the tooling that authored this architecture. Gratitude is extended to each project, standard, and inspiration cited below.

- **Source & docs**: [GitHub repository](https://github.com/dataengineeringformachinelearning/dataengineeringformachinelearning) · [DeepWiki](https://deepwiki.com/dataengineeringformachinelearning/dataengineeringformachinelearning) (AI-navigable codebase wiki) · [Glossary](docs/glossary.md) · [Billing](docs/billing.md)
- **Frontend**: [Astro](https://astro.build/), [Angular](https://angular.dev/), [Prettier](https://prettier.io/), [ESLint](https://eslint.org/), Native Browser APIs, [Firebase Hosting](https://firebase.google.com/products/hosting), `@dataengineeringformachinelearning/viking-ui` (zero-dependency Angular UI kit themed with [THEME.md](THEME.md) tokens), [ng-packagr](https://github.com/ng-packagr/ng-packagr) (Angular Package Format builds), [AnalogJS](https://analogjs.org/) (`vite-plugin-angular` for Vitest component tests), [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/) + [Chromatic](https://www.chromatic.com/) (visual regression for backend landing, Swagger, and Viking-UI docs via `npm run test:visual`), [Algolia](https://www.algolia.com/) (DocSearch / Experiences via `DemlWidgets.openSearch()` and `algolia-search.js`), [axe-core](https://github.com/dequelabs/axe-core) (WCAG 2.1 AA enforcement via `scripts/run_axe.js`)
- **Design system & typography**: [THEME.md](THEME.md) (Viking-UI premium palette v2); [Inter](https://rsms.me/inter/) (body/UI and `.viking-font-display` caps for CES instrumentation and marketing display)
- **Icons (build-time, zero runtime)**: [Lucide](https://lucide.dev/) — SVG paths inlined at build time into `viking-icon`; no Lucide runtime package in production bundles
- **Viking-UI design language**: `@dataengineeringformachinelearning/viking-ui` composable primitives and [THEME.md](THEME.md) token matrix — zero third-party UI runtimes; premium restrained luxury (charcoal / teal / crimson) with WCAG 2.1 AA by construction
- **Backend & APIs**: [Django](https://www.djangoproject.com/) ([Django Ninja](https://django-ninja.dev/), [Django Channels](https://channels.readthedocs.io/)), [Daphne](https://github.com/django/daphne), [Gunicorn](https://gunicorn.org/), [NGINX](https://nginx.org/), [cryptography](https://cryptography.io/en/latest/), [liboqs (PQC)](https://openquantumsafe.org/)
- **Data & Broker**: [PostgreSQL](https://www.postgresql.org/), [Redpanda](https://redpanda.com/) (internal event bus), [Dragonfly](https://dragonflydb.io/), [Polars](https://pola.rs/), [RustFS](https://github.com/rustfs/rustfs) (S3-compatible report object store for analytics exports — see [docs/exports-rustfs.md](docs/exports-rustfs.md))
- **Rust data plane**: [Rust](https://www.rust-lang.org/), [Tokio](https://tokio.rs/), [Axum](https://github.com/tokio-rs/axum), [SQLx](https://github.com/launchbadge/sqlx), [rust-rdkafka](https://github.com/fede1024/rust-rdkafka), and [RustCrypto AES-GCM](https://github.com/RustCrypto/AEADs) (authenticated DEML Internode Envelopes)
- **Official Integrations** (customer-facing): [Kubernetes](https://kubernetes.io/), [TensorFlow](https://www.tensorflow.org/), [PyTorch](https://pytorch.org/), [Apache Spark](https://spark.apache.org/), [Databricks](https://www.databricks.com/), [AWS Redshift](https://aws.amazon.com/redshift/) — see [`docs/integrations/`](docs/integrations/)
- **Machine Learning & AI**: [PyTorch](https://pytorch.org/), [Scikit-learn](https://scikit-learn.org/), [Skops](https://skops.readthedocs.io/), [Hugging Face](https://huggingface.co/), [Google Gemini](https://google.com/technologies/gemini/), [Norse (Spiking Neural Networks for temporal data)](https://github.com/norse/norse), [Google DeepMind](https://deepmind.google/) (AlphaGo — foundational inspiration for predictive systems), [Antigravity AI Agent (Google)](https://google.com/)
- **Observability, Security & CMS**: [Sentry](https://sentry.io/), [OpenTelemetry](https://opentelemetry.io/), [ClickHouse](https://clickhouse.com/), [Semgrep](https://semgrep.dev/), [Renovate](https://docs.renovatebot.com/), [FOSSA](https://fossa.com/), [Checkov](https://www.checkov.io/), [Trivy](https://trivy.dev/), [Socket.dev](https://socket.dev/), [Gitleaks](https://gitleaks.io/), [detect-secrets](https://github.com/Yelp/detect-secrets), [Mend](https://www.mend.io/), [OSV-Scanner](https://osv.dev/), [Wappalyzer](https://www.wappalyzer.com/), [Sanity.io](https://www.sanity.io/), [AbuseIPDB](https://www.abuseipdb.com/), [ipify](https://www.ipify.org/), [IPinfo](https://ipinfo.io/), [Google Analytics](https://analytics.google.com/), [Microsoft Clarity](https://clarity.microsoft.com/), [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/), [Resend](https://resend.com/), [Dependency-Track](https://dependencytrack.org/), [Tor](https://www.torproject.org/), [Have I Been Pwned](https://haveibeenpwned.com/), [crt.sh](https://crt.sh/), [Ahmia](https://ahmia.fi/)
- **DevOps, Infrastructure & Tooling**: [GitHub Actions](https://github.com/features/actions), [Firebase CLI](https://firebase.google.com/docs/cli), [Docker](https://www.docker.com/), [Distroless](https://github.com/GoogleContainerTools/distroless), [Cloud Run](https://cloud.google.com/run/), [Google Cloud](https://cloud.google.com/), [Amazon Lightsail](https://aws.amazon.com/lightsail/), [Amazon ECR](https://aws.amazon.com/ecr/), [Amazon ECS / Fargate](https://aws.amazon.com/ecs/), [Amazon RDS](https://aws.amazon.com/rds/), [Infisical](https://infisical.com/), [pre-commit](https://pre-commit.com/), [uv](https://docs.astral.sh/uv/), [Ruff](https://docs.astral.sh/ruff/), [Django Migration Linter](https://github.com/3YOURMIND/django-migration-linter), [Gamma](https://gamma.app/) (presentation companion)
- **Billing & Payments**: [Stripe](https://stripe.com/)
- **Organizations & Standards**: [NIST](https://www.nist.gov/), [OASIS CTI](https://www.oasis-open.org/committees/cyber-threat-intelligence/) (STIX 2.1 / TAXII 2.1), [The Python Software Foundation](https://www.python.org/), [The Angular Team](https://angular.dev/)
- **IDEs & AI Coding Assistants** (used to author and maintain this codebase):
  - [Visual Studio Code](https://code.visualstudio.com/) + [Cline](https://cline.bot/) — [Grok Code Fast 1](https://x.ai/) (SpaceXAI)
  - [Windsurf](https://windsurf.com/) — Grok Code Fast 1 (SpaceXAI)
  - [Google Antigravity](https://antigravity.google/) — [Gemini 3.1 Pro](https://deepmind.google/technologies/gemini/), [Gemini 3.5 Flash](https://deepmind.google/technologies/gemini/), [Gemini 3.5 (High)](https://deepmind.google/technologies/gemini/), [Claude Opus](https://www.anthropic.com/claude/opus), [Claude Sonnet](https://www.anthropic.com/claude/sonnet)
  - [OpenAI Codex](https://openai.com/codex/) — Codex: GPT-5.5, GPT-5.3-Codex-Spark
  - [Grok Build Beta](https://x.ai/news/grok-build-cli)
  - [Cursor](https://cursor.com/) — [Grok 4.3](https://docs.spacex.ai/developers/models/grok-4.3), [Grok Build Beta](https://x.ai/news/grok-build-cli), [Fable](https://www.anthropic.com/claude/fable)
  - [Pool](https://pool.ps/) — Pool: Laguna M.1

---

> Full Cloud Run service + environment variable reference: [Appendix C in BOOK.md](BOOK.md#appendix-c-cloud-run-deployment). Always keep `backend/.env.example`, `frontend/.env.example`, and `marketing/.env.example` as the source of truth.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/dataengineeringformachinelearning/dataengineeringformachinelearning)

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning.svg?type=large&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning?ref=badge_large&issueType=license)

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20778532.svg)](https://doi.org/10.5281/zenodo.20778532)

[![Semgrep SAST Scan](https://img.shields.io/badge/Semgrep_SAST_Scan-4C4A73?logo=semgrep&logoColor=fff)](https://semgrep.dev)

![GitHub contributors](https://img.shields.io/github/contributors/dataengineeringformachinelearning/dataengineeringformachinelearning)

![GitHub Repo stars](https://img.shields.io/github/stars/dataengineeringformachinelearning/dataengineeringformachinelearning?style=social)

![GitHub forks](https://img.shields.io/github/forks/dataengineeringformachinelearning/dataengineeringformachinelearning?style=social)

![GitHub issues](https://img.shields.io/github/issues/dataengineeringformachinelearning/dataengineeringformachinelearning)

![GitHub license](https://img.shields.io/github/license/dataengineeringformachinelearning/dataengineeringformachinelearning)
