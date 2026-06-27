# Platform Features

The Data Engineering for Machine Learning (DEML) Platform provides a comprehensive ecosystem built for robust observability, data intelligence, and security.

## Core Features Outline

1. **High-Throughput Asynchronous Telemetry Ingestion + Event Projections (Reliable)**
   - Client events: Firebase Cloud Functions (`ingestEvent` with `version` + `idempotency_key`) → Redpanda or Firestore fallback.
   - Django paths use **Transactional Outbox** (`OutboxEvent` model) + `outbox_relay` command for reliable publishing.
   - `telemetry_worker` performs idempotent projections (with DLQ to `frontend-events-dlq`) and builds materialized read models in Firestore (`deml` DB).
   - Queries use direct Firestore real-time subscriptions. Redpanda + Polars for heavy batch work. Decouples from transactional DB while providing at-least-once + dedup semantics.

2. **Data Tenancy & Absolute Isolation**
   - All ingested telemetry data and dashboard widgets strictly map to the specific Tenant executing the ingestion. Privacy is guaranteed by default with strict tenant isolation enforced at the database and application levels. Data cannot bleed across tenant boundaries.

3. **Big Data Aggregate Threat Modeling ("Herd Immunity")**
   - The platform trains a global `platform_threat_model.pt` that aggregates anonymized, non-PII metrics across all tenants (e.g., global failure rates, average suspicious request ratios over the last 90 days). This ensures that every tenant benefits from the massive scale of big data and platform-wide insights.

4. **Tenant-Specific Inference & Evaluation**
   - Individual threat reports evaluate their specific, isolated telemetry (like location weights and failure rates) against the massive global aggregate model. This dual approach ensures models train on aggregate to catch anomalies by using big data, while evaluating specifically on the tenant's exact operational footprint.

5. **Predictive SLA Deep Learning**
   - Dedicated PyTorch models (`sla_models`) are trained per-tenant to continuously forecast uptime SLAs. These models ingest temporal vectors, endpoint latency, and variance, updating predictions without manual tuning.

6. **Next-Generation SIEM / SOAR Digest & Sharing**
   - Automated serialization of AI anomaly predictions into industry-standard STIX 2.1 JSON payloads. These indicators are shared natively via TAXII 2.1 to central hubs (like MS-ISAC), contributing to the global threat landscape.

7. **Hugging Face Global Ecosystem Integration**
   - Native integration with Hugging Face automates the publication of PyTorch models to the Hub and continuously syncs public status pages and whitepapers via Spaces deployments.

8. **Tenant0, System Design, and Critical Path of the Application**
   - Our platform dogfoods itself. The core infrastructure operates under `Tenant0` (The Platform Tenant). It runs its own telemetry ingestion, status pages, and threat models. It serves as a continuous, living "Apex Sandbox" to safely trial experimental features under real load and as a "Public Sentinel" showcasing exactly what the platform is capable of. Data enrichments and features must meet Tenant0 standards and follow the system design path of the platform so all tenant data benefits. The explicit pipeline process is: **collect, enhance, aggregate, showcase** to the user. The final processed results must be written to a dedicated table for snappy, optimized access via the UI. This ensures the "critical path of the application" remains highly responsive while delivering deep, enriched insights to the user.

9. **Application-Level Zeek-Equivalent Middleware**
   - A custom passive interception layer runs at the edge to inspect all incoming HTTP request headers, source IPs, methods, and process latency. It natively homogenizes traffic via zero-latency caches and streams telemetry aligned perfectly to the target Tenant UUID.

10. **OSINT & Dark Web Threat Intel Integration**
    - The platform actively runs reconnaissance against Tor (Ahmia) for brand mentions and Certificate Transparency logs for exposed assets. It automatically formalizes these findings natively into `ThreatIntelligence` and `Endpoints` database records for instantaneous dashboard visibility.

11. **Post-Quantum Cryptography (PQC) & Forward Secrecy**
    - Implements hybrid Key Encapsulation Mechanisms (KEMs) using `liboqs` allowing clients to negotiate quantum-resistant session keys over the `/api/v1/telemetry/pq-key-exchange` endpoint. Active Forward Secrecy is enforced via exact 5-minute cache expirations of ephemeral secret keys.

12. **Symmetrical Multi-Tenant Pipelines (`Tenant.objects.all()`)**
    - All background workers, ML model training loops, and OSINT scanners are explicitly engineered to iterate over `Tenant.objects.all()`. By treating the platform (`Tenant0`) exactly like any other customer, the architecture guarantees absolute feature parity and eradicates the technical debt of hardcoded, single-tenant exceptions.

13. **Enterprise Compliance & Security Standards**
    - The platform is architected to support rigorous security frameworks including SOC 2 Type II, CMMC 2.0, and NIST SP 800-171 Rev. 3 readiness out of the box.
