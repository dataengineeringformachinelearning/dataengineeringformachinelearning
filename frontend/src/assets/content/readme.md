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

# Data Engineering for Machine Learning: Developer Platform

![Project Banner](https://raw.githubusercontent.com/dataengineeringformachinelearning/dataengineeringformachinelearning/main/frontend/public/data-engineering-for-machine-learning-preview.png)

Welcome to the **Data Engineering for Machine Learning** Developer Platform. This repository hosts a comprehensive ecosystem designed to seamlessly bridge the gap between complex data pipelines and high-performance machine learning models.

> **Looking for the Book or Whitepaper?**
> The philosophical, educational, and narrative deep dives into data engineering, MLOps, and the architecture of this system can be found in our comprehensive book: **[Read the Book (BOOK.md)](BOOK.md)**
>
> For a brief summary of the platform's hypothesis, architecture diagrams, and algorithms, please read the **[Whitepaper (WHITEPAPER.md)](WHITEPAPER.md)**.

> [!NOTE]
> **arXiv Endorsement Request:** We are currently seeking an arXiv endorsement to formally publish the architectural whitepaper to `cs.CR` (Cryptography and Security). If you are a qualified arXiv author and find this work valuable, we would greatly appreciate your endorsement! You can endorse the author [here](https://arxiv.org/auth/endorse?x=ZISEYL) using code **ZISEYL**.

> **[Jump to Acknowledgements & Technologies](#acknowledgements--technologies)**

> **Recent Architectural Evolution**: The platform has adopted an **Event Projections** model with Firebase Cloud Functions as the client command gateway, Redpanda for reliable event streaming, Django workers for processing, and Firestore (named `deml` database) for real-time queries. See the updated architecture diagram and the Settings → "Event Projections Verification" panel for the end-to-end test loop. Firebase Functions and rules are deployed via a dedicated GitHub workflow.

---

## Core Features

- **Event Projections Architecture**: Commands via Firebase Cloud Functions (`ingestEvent`) to Redpanda (with Firestore fallback); Projections materialized into Firestore (named `deml` DB); Queries via direct real-time subscriptions. Django workers act as the projection layer.
- **High-Throughput Ingestion**: Broker-based telemetry pipelines via Redpanda and Polars.
- **Tenant Isolation**: Absolute database-level isolation ensuring data and widget intake align precisely with your tenant workspace.
- **Big Data Aggregate Threat Modeling**: Models train on global anonymized data to leverage "herd immunity" for catching anomalies based on vast datasets.
- **Tenant-Specific Evaluation**: Threat reports map and evaluate your specific telemetry against the massive platform model.
- **Predictive SLAs**: Deep learning models dynamically forecasting service level agreements.
- **Hugging Face Integrations**: Automated ecosystem for model Hub sharing and Spaces deployment.
- **Next-Gen SIEM/SOAR**: Automated AI anomaly serialization into STIX 2.1 payloads for TAXII sharing.
- **SaaS Reliability & Stability**: Comprehensive automated testing, static analysis (Ruff/ESLint/Axe), and clean-code architecture ensuring production-grade robustness.

## Solution Architecture

The platform implements an **Event Projections** architecture for client-driven events with strong reliability guarantees:

- **Commands** (writes): Angular Client → Firebase Cloud Functions (`ingestEvent`) → Redpanda (topic: `frontend-events`) with Firestore fallback. Django API paths use a **Transactional Outbox** pattern (events written atomically to Postgres `OutboxEvent` table before returning).
- **Projections**: Django `telemetry_worker` consumes from Redpanda, enriches data (e.g. active endpoint counts from Postgres), and writes to Firestore (named `deml` DB). Projections are **idempotent** (using stable message keys) and support a dead-letter queue (`frontend-events-dlq`) for failed messages.
- **Queries** (reads): Direct real-time subscriptions to the projected Firestore state (e.g. `users/{uid}/data/stats`).
- Events include a `version` field for schema governance. A dedicated `outbox_relay` management command ensures reliable publishing from the Outbox.

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
        TW[Django Telemetry Worker<br/>(Polars + ORM enrichment)]
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
    FS -.->|onSnapshot (users/{uid}/data/stats)| A
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

- **Transactional Outbox Pattern**: Events are durably recorded in Postgres `OutboxEvent` model (written atomically with business state changes) and published reliably via the new `outbox_relay` management command (avoids lost events on crashes/restarts).
- **Idempotent Projections + DLQ**: The `telemetry_worker` now uses stable message keys (`idempotency_key`) for deduplication of projections into Firestore; failed messages are routed to a `frontend-events-dlq` topic.
- Firebase Cloud Functions (`ingestEvent`) as the primary client command gateway (includes `version` and `idempotency_key` for governance).
- Event Projections using Firestore (named "deml" database) for low-latency materialized read models, with the worker as the authoritative projection layer.
- Event schema versioning ("1.0") and dedicated GitHub Actions workflow (`.github/workflows/firebase-backend-deploy.yml`) for Functions + Firestore rules.
- Dedicated Firestore security rules for user-owned data isolation.
- Simplified projection flow: worker is now the single source for stats/projections (removed direct writes from the function).

---

## The Integration Gateway

Our platform is not just a standalone application; it is designed to be the central nervous system for your MLOps workflows. We provide a robust API Gateway to allow external systems to stream data to our models and request predictions securely.

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

We provide native support and documentation for integrating with the industry's leading tools:

- **[Kubernetes](docs/integrations/kubernetes.md):** Connect via Custom Resource Definitions (CRDs) or sidecar proxies. _(Primary target)_
- **[TensorFlow](docs/integrations/tensorflow.md):** Stream data directly using `tf.data.Dataset`.
- **[PyTorch](docs/integrations/pytorch.md):** Integrate with custom DataLoaders.
- **[Apache Spark](docs/integrations/apache-spark.md):** Write streaming DataFrames directly to our ingestion endpoints.
- **[Databricks](docs/integrations/databricks.md):** Seamless notebook integration and cluster connectivity.

---

## Getting Started

Welcome to the platform! Getting your infrastructure connected and streaming data takes less than five minutes.

### 1. Account Setup

- **Registration**: Sign up for a secure account via the web dashboard.
- **Organizations**: Create an Organization for your team to enable Role-Based Access Control (RBAC) and shared dashboards.
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

## Hugging Face Integrations & Global Threat Intelligence

The DEML Platform natively integrates with Hugging Face to automate the sharing of PyTorch models and static assets. We employ a privacy-first, aggregated architecture to share threat intelligence globally without exposing user data.

- **Global Platform Models**: Background workers securely aggregate anonymized telemetry across the entire platform to train a single global `platform_threat_model.pt`. This model benefits from "herd immunity" without exposing any single tenant's data.
- **Model Hub**: The global PyTorch threat models and SLA models are automatically pushed to the Hugging Face Hub using the `huggingface_hub` API.
- **Spaces Deployment**: GitHub Actions are configured to automatically sync the Book, Whitepaper, and UI to a Hugging Face Space upon commits to `main`.

**Requirements:**

- Add `HF_TOKEN` and `HF_REPO_ID` to your backend environment variables (e.g., in Railway). See [RAILWAY.md](RAILWAY.md) and the `*.env.example` files for the complete, up-to-date list (including `MARKETING_URL`, `PUBLIC_*` for cross-site handoff between deml.app and the marketing site, Outbox/Redpanda/Dragonfly, etc.).
- Add `HF_TOKEN` and `HF_SPACE_REPO` as GitHub Repository Secrets to enable the Spaces sync action.

---

## Alerting & Notifications

The platform supports automated email alerts for system events and model training completion. To configure these notifications:

- Set `RESEND_API_KEY` to your Resend API Key in your backend environment variables.
- Set `ALERT_EMAIL_TARGET` to the destination email address for system alerts.
- (Optional) Set `ALERT_EMAIL_FROM` to customize the sender address (defaults to `notifications@deml.app`).

---

## Enterprise Security & Compliance

We take data security seriously. As a multi-tenant SaaS platform, we employ strict isolation protocols to protect your data.

- **Data Isolation:** All tenant data is cryptographically isolated using strict multi-tenancy rules and dedicated encryption keys.
- **Continuous Auditing:** Our infrastructure undergoes continuous vulnerability scanning to ensure your models are safe.
- **Application-Level Telemetry:** A native middleware acts similarly to Zeek, passively monitoring all incoming request headers, IPs, methods, and processing latencies. This telemetry is tracked and completely isolated to the specific tenant targeted by the incoming traffic using zero-latency cached domain mappings to avoid database blocking.
- **OSINT & Dark Web Scanning:** Daily background cron workers leverage the "Have I Been Pwned" (HIBP) API and query the Tor network via Ahmia to automatically hunt for compromised tenant emails and brand mentions on dark web forums. Additionally, Certificate Transparency logs are scanned for exposed subdomains. All findings are natively serialized as `ThreatIntelligence` and `Endpoints` records in the database to instantly populate the tenant's security dashboard.
- **Post-Quantum Cryptography (PQC):** The platform features a Post-Quantum Key Encapsulation Mechanism (KEM) using `liboqs`. External services can invoke the `/api/v1/telemetry/pq-key-exchange` endpoint to securely negotiate a PQ session key before transmitting transient, highly sensitive telemetry payloads over standard TLS. The server enforces Forward Secrecy by strictly caching the ephemeral secret key for exactly 5 minutes using a unique UUID and permanently destroying it immediately upon decapsulation. This actively prevents "Store Now, Decrypt Later" (SNDL) attacks. (Fails over gracefully to AES if `liboqs` is absent).
- **Tenant0 Bootstrapping:** The platform utilizes Django signals (`post_migrate`) to dynamically bootstrap itself as `Tenant0` on the first run, seamlessly homogenizing all background workers, ML models, and pipelines to utilize standard UUIDs, eliminating the risk of hardcoded string literal constraints.
- **Access Control Architecture (RBAC & ABAC):**
  - **Role-Based Access Control (RBAC):** Users hold one of three distinct roles: `Viewer` (read-only access to status and analytics), `Operator` (standard write access to status pages, endpoints, and services), or `Security Admin` (full administrative rights and configuration overrides).
  - **Attribute-Based Access Control (ABAC):** Visibility policies adapt dynamically. Logged-out public users can only access published status pages (`is_published=True`) and the default `platform-status` (Tenant0). Logged-in users can also access status pages they explicitly own (`user=request.user`). Programmatic API ingestion maps to isolated tenant spaces dynamically via secure API tokens rather than hardcoded domains. Write actions dynamically require multi-factor authentication (MFA) verification via client JWT attributes.
- **Compliance:** We are actively pursuing SOC 2 Type II, CMMC 2.0, NIST SP 800-171 Rev. 3, and GDPR compliance certifications. You can review our full security posture and architecture in our Whitepaper.

## Disclaimer & Liability

> [!WARNING]
> **Liability Disclaimer:** The Data Engineering for Machine Learning (DEML) Platform, including all associated models, dashboards, and integrations, is provided "as-is" and without warranty of any kind.
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

I want to acknowledge the incredible open-source tools, platforms, and AI assistants that power this platform's architecture:

- **Frontend**: [Astro](https://astro.build/), [Angular](https://angular.dev/), [Prettier](https://prettier.io/), [ESLint](https://eslint.org/), Native Browser APIs, [Firebase Hosting](https://firebase.google.com/products/hosting)
- **Backend & APIs**: [Django](https://www.djangoproject.com/) ([Django Ninja](https://django-ninja.dev/), [Django Channels](https://channels.readthedocs.io/)), [Daphne](https://github.com/django/daphne), [Gunicorn](https://gunicorn.org/), [NGINX](https://nginx.org/), [cryptography](https://cryptography.io/en/latest/), [liboqs (PQC)](https://openquantumsafe.org/)
- **Data & Broker**: [PostgreSQL](https://www.postgresql.org/), [Redpanda](https://redpanda.com/), [Dragonfly](https://dragonflydb.io/), [Polars](https://pola.rs/)
- **Machine Learning & AI**: [PyTorch](https://pytorch.org/), [Scikit-learn](https://scikit-learn.org/), [Skops](https://skops.readthedocs.io/), [Hugging Face](https://huggingface.co/), [Google Gemini](https://google.com/technologies/gemini/), [Antigravity AI Agent (Google)](https://google.com/)
- **Observability, Security & CMS**: [Sentry](https://sentry.io/), [OpenTelemetry](https://opentelemetry.io/), [ClickHouse](https://clickhouse.com/), [Semgrep](https://semgrep.dev/), [Renovate](https://docs.renovatebot.com/), [FOSSA](https://fossa.com/), [Checkov](https://www.checkov.io/), [Trivy](https://trivy.dev/), [Socket.dev](https://socket.dev/), [Gitleaks](https://gitleaks.io/), [detect-secrets](https://github.com/Yelp/detect-secrets), [Mend](https://www.mend.io/), [OSV-Scanner](https://osv.dev/), [Wappalyzer](https://www.wappalyzer.com/), [Sanity.io](https://www.sanity.io/), [AbuseIPDB](https://www.abuseipdb.com/), [ipify](https://www.ipify.org/), [IPinfo](https://ipinfo.io/), [Google Analytics](https://analytics.google.com/), [Microsoft Clarity](https://clarity.microsoft.com/), [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/), [Resend](https://resend.com/), [Dependency-Track](https://dependencytrack.org/), [Tor](https://www.torproject.org/), [Have I Been Pwned](https://haveibeenpwned.com/), [crt.sh](https://crt.sh/), [Ahmia](https://ahmia.fi/)
- **DevOps, Infrastructure & Tooling**: [GitHub Actions](https://github.com/features/actions), [Firebase CLI](https://firebase.google.com/docs/cli), [Docker](https://www.docker.com/), [Distroless](https://github.com/GoogleContainerTools/distroless), [Railway](https://railway.app/), [Google Cloud](https://cloud.google.com/), [Infisical](https://infisical.com/), [pre-commit](https://pre-commit.com/), [uv](https://docs.astral.sh/uv/), [Ruff](https://docs.astral.sh/ruff/), [Django Migration Linter](https://github.com/3YOURMIND/django-migration-linter)
- **Billing & Payments**: [Stripe](https://stripe.com/)
- **Organizations & Standards**: [NIST](https://www.nist.gov/), [The Python Software Foundation](https://www.python.org/), [The Angular Team](https://angular.dev/)

---

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/deml?referralCode=BpTk0g&utm_medium=integration&utm_source=template&utm_campaign=generic)

> Full Railway service + environment variable reference: [RAILWAY.md](RAILWAY.md). Always keep `backend/.env.example`, `frontend/.env.example`, and `marketing/.env.example` as the source of truth.

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning.svg?type=large&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning?ref=badge_large&issueType=license)

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20778532.svg)](https://doi.org/10.5281/zenodo.20778532)

[![Semgrep SAST Scan](https://img.shields.io/badge/Semgrep_SAST_Scan-4C4A73?logo=semgrep&logoColor=fff)](https://semgrep.dev)

![GitHub contributors](https://img.shields.io/github/contributors/dataengineeringformachinelearning/dataengineeringformachinelearning)

![GitHub Repo stars](https://img.shields.io/github/stars/dataengineeringformachinelearning/dataengineeringformachinelearning?style=social)

![GitHub forks](https://img.shields.io/github/forks/dataengineeringformachinelearning/dataengineeringformachinelearning?style=social)

![GitHub issues](https://img.shields.io/github/issues/dataengineeringformachinelearning/dataengineeringformachinelearning)

![GitHub license](https://img.shields.io/github/license/dataengineeringformachinelearning/dataengineeringformachinelearning)
