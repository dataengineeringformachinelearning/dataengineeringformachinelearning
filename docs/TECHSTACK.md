# DEML Platform Technology Stack

**Data Engineering for AI Engineering and Cybersecurity (DEML)** is built on modern, battle-tested infrastructure. This document provides the technical details for platform contributors and operators.

## Compute & Deployment

| Layer             | Technology                          | Notes                                  |
| ----------------- | ----------------------------------- | -------------------------------------- |
| Container Runtime | Docker                              | Unprivileged multi-stage builds        |
| Orchestration     | Railway / Cloud Run / AWS Lightsail | Multi-target deployment topology       |
| Backend           | Django (Python)                     | Control plane with async/asgi          |
| Data Plane        | Rust                                | Role-selected services (`deml-daemon`) |

## Data Layer

| Component           | Technology | Purpose                                     |
| ------------------- | ---------- | ------------------------------------------- |
| Transactional Store | PostgreSQL | System of record (users, pages, incidents)  |
| Event Streaming     | Redpanda   | Internal event bus with Kafka compatibility |
| Real-time Models    | Firestore  | Materialized read models for dashboards     |
| Analytics Store     | ClickHouse | OLAP telemetry, CES aggregates              |
| Cache/Rate Limiting | Dragonfly  | Redis-protocol compatible caching           |

## Frontend & Design

| Surface        | Technology | Notes                                        |
| -------------- | ---------- | -------------------------------------------- |
| Application UI | Angular    | Standalone components, signals architecture  |
| Marketing Site | Astro      | Static-rendered landing pages                |
| Design System  | Viking-UI  | Zero-dependency, WCAG 2.1 AA by construction |

## Security & Compliance

| Feature        | Implementation                     |
| -------------- | ---------------------------------- |
| Authentication | Firebase Auth with MFA             |
| Authorization  | RBAC + ABAC via Django middleware  |
| Encryption     | AES-256-GCM + KMS envelope         |
| Auditing       | GitOps, Semgrep, Trivy, pre-commit |
| Compliance     | SOC 2, CMMC, NIST 800-171 roadmap  |

## Observability

| Signal         | Technology    | Notes                    |
| -------------- | ------------- | ------------------------ |
| Metrics        | OpenTelemetry | OTLP to ClickHouse       |
| Tracing        | OpenTelemetry | Distributed tracing      |
| Error Tracking | Sentry        | Production error surface |

## Integrations

Customer-facing integration guides available in [`docs/integrations/`](docs/integrations/):

- Kubernetes, TensorFlow, PyTorch
- Apache Spark, Databricks, AWS Redshift

## Full Technology Bibliography

For the complete technology list including all open-source foundations, see [BOOK.md § Acknowledgements](BOOK.md#acknowledgements--technologies).
