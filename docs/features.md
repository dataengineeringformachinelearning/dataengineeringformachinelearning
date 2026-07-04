# Platform Features

The Data Engineering for Machine Learning (DEML) Platform provides a comprehensive ecosystem built for robust observability, data intelligence, and security.

## Concept of Operations (CONOPS)

Operational doctrine—how the platform runs in production, who performs which workflows, and how services degrade and recover—is maintained in:

- [BOOK.md § CONOPS](../BOOK.md#concept-of-operations-conops) — canonical narrative
- [WHITEPAPER.md §2](../WHITEPAPER.md#2-concept-of-operations-conops) — executive summary
- [conops.md](conops.md) — operator quick reference (checklists, service matrix, contingencies)

## Core Features Outline

1. **High-Throughput Asynchronous Telemetry Ingestion + Event Projections (Reliable)**
   - Client events: Firebase Cloud Functions (`ingestEvent` with `version` + `idempotency_key`) → Redpanda or Firestore fallback.
   - Django paths use **Transactional Outbox** (`OutboxEvent` model) + `outbox_relay` command for reliable publishing.
   - `telemetry_worker` performs idempotent projections (with DLQ to `frontend-events-dlq`) and builds materialized read models in Firestore (`deml` DB).
   - Queries use direct Firestore real-time subscriptions. Redpanda + Polars for heavy batch work. Decouples from transactional DB while providing at-least-once + dedup semantics.

2. **Account & Site Isolation (User + Sites)**
   - One Firebase login → one Django `User` → `UserProfile.account_id`. Each account may own many `StatusPage` sites.
   - No organization hierarchies or multiple logins per workspace. Telemetry, integrations, and widgets are scoped to `user` / `account_id`; data cannot bleed across accounts.

3. **Big Data Aggregate Threat Modeling ("Herd Immunity")**
   - The platform trains a global `platform_threat_model.pt` that aggregates anonymized, non-PII metrics across all accounts (e.g., global failure rates, average suspicious request ratios over the last 90 days).

4. **Account-Scoped Inference & Evaluation**
   - Individual threat reports evaluate isolated telemetry (location weights, failure rates) against the global aggregate model—training on big data, inferencing on the account's footprint only.

5. **Predictive SLA Deep Learning**
   - Dedicated PyTorch models (`sla_models`) forecast uptime SLAs per account. They ingest temporal vectors, endpoint latency, and variance, updating predictions without manual tuning.

6. **Spiking Temporal Forecasting (Fourth Model)**
   - New SpikingTemporalForecaster (Norse SNN or MLP fallback) for temporal/event-driven data. Processes sequences from telemetry streams (Redpanda events) to forecast spikes/anomalies. Trained with same teacher distillation. Exposed in status/analytics as "spiking_temporal_forecast". See models_inventory.md.

6. **Next-Generation SIEM / SOAR Digest & Sharing**
   - Automated serialization of AI anomaly predictions into industry-standard STIX 2.1 JSON payloads. These indicators are shared natively via TAXII 2.1 to central hubs (like MS-ISAC).

7. **Hugging Face Global Ecosystem Integration**
   - Native integration with Hugging Face automates the publication of PyTorch models to the Hub and continuously syncs public status pages and whitepapers via Spaces deployments.

8. **`platform-status`, System Design, and Critical Path**
   - The platform dogfoods itself via the public `platform-status` page (`user=null`, `is_platform=True`)—an "Apex Sandbox" and "Public Sentinel" under real load. Background workers iterate over active accounts plus this platform scope so pipelines stay symmetrical. Pipeline: **collect, enhance, aggregate, showcase**. Results land in optimized tables for snappy UI access.

9. **Application-Level Zeek-Equivalent Middleware**
   - Passive interception of HTTP headers, source IPs, methods, and latency. Zero-latency cached mappings associate traffic with the target `account_id` without blocking the request thread.

10. **OSINT & Dark Web Threat Intel Integration**
    - Reconnaissance against Tor (Ahmia) and Certificate Transparency logs. Findings serialize into `ThreatIntelligence` and `Endpoints` for dashboard visibility.

11. **Post-Quantum Cryptography (PQC) & Forward Secrecy**
    - Hybrid KEMs via `liboqs` on `/api/v1/telemetry/pq-key-exchange`. Ephemeral secret keys expire after five minutes.

12. **Symmetrical Account Pipelines**
    - Background workers, ML training loops, and OSINT scanners iterate over provisioned users/accounts (and the `platform` sentinel). No hardcoded single-customer exceptions.

13. **Enterprise Compliance & Security Standards**
    - Architected for SOC 2 Type II, CMMC 2.0, and NIST SP 800-171 Rev. 3 readiness.

14. **RBAC & ABAC Access Control**
    - **RBAC:** `UserProfile.role` is `Viewer`, `Operator`, or `Security Admin` (one role per login). Status page create/update/delete requires `Operator` or `Security Admin` (`@role_required`). Settings UI disables mutations for `Viewer`.
    - **ABAC:** Anonymous users read published pages and `platform-status` only. Owners read unpublished pages when logged in. `check_status_page_access` guards services, incidents, and stats APIs. Writes require ownership + MFA (`amr` contains `mfa`). `platform-status` is immutable for customers.
    - **Public stats:** `/status/:slug` and `/explore` expose uptime and service health only when `is_published=True` or `slug=platform-status`.
    - See [WHITEPAPER.md §8](../WHITEPAPER.md#8-role-based--attribute-based-access-control-rbac--abac) for the full access matrix.
