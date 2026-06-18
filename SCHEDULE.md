# Platform Automation Schedule

This document outlines the concrete, implemented automations that are actively running in the repository via GitHub Actions workflows, Django management commands, and continuously running background workers.

## Continuous Background Workers

**Focus:** Real-time stream processing, active health pinging, hourly aggregations, and asynchronous ML training.
**Execution:** These run continuously as standalone services (e.g., via Docker Compose or Railway).

- **Telemetry Worker (`python manage.py telemetry_worker`)**
  - **Stream Processing:** Continuously consumes and processes Redpanda Kafka streams (`app-events`, `user-issues`) in near real-time.
  - **Active Pinger:** Automatically pings and records the health status/latency of all monitored services every **30 seconds**.
  - **Analytics Aggregation:** Runs the `aggregate_analytics` command every **1 hour** to synthesize raw telemetry, threat intelligence, and widget signals into streamlined Postgres time-series buckets.

- **ML Worker (`python manage.py ml_worker`)**
  - **Event-Driven Training:** Continuously listens for `ml-training-events` on Redpanda to trigger on-demand model training for specific tenants.
  - **Daily Fallback/Cleanup:** Automatically triggers full `train_all_models` (which includes `db_cleanup.py`) every **24 hours** to ensure no tenant is left behind.

## Daily Cycle: Models & Threat Intelligence

**Focus:** Continuous Learning and Threat Protection.
**Workflow:** `.github/workflows/daily-automation.yml` (Runs daily at midnight UTC)

- **Automations:**
  - Execute `fetch_threat_intel.py`: Contacts Google, Microsoft Clarity, Cloudflare, AbuseIPDB, and AlienVault OTX APIs to fetch fresh threat data and IP blacklists.
  - Execute `train_all_models.py`: Retrains the predictive scaling and anomaly detection ML models for all active tenants.
  - _Note: `train_all_models.py` natively triggers `db_cleanup.py` internally, which prunes stale telemetry and log records older than 30 days._

## Weekly Cycle: Dependency Management

**Focus:** Proactive Dependency Updates.
**Workflow:** `.github/workflows/renovate.yml` (Runs weekly on Sundays)

- **Automations:**
  - **Renovate Bot**: Automatically scans and creates Pull Requests to update outdated packages across the stack.

## 30-Day Cycle: Security & Maintenance

**Focus:** Vulnerability Scanning and Secret Rotation.
**Workflow:** `.github/workflows/30-60-90-automation.yml` (Runs on the 1st of every month)

- **Automations:**
  - Execute `rotate_keys.py`: Rotates active API keys and integrations to prevent long-lived credential leaks.
  - **Semgrep Audit**: Runs a static analysis vulnerability scan across the codebase.
  - **Dependency Audit**: Runs `npm audit` for the frontend and `uv lock` checks for the backend to flag insecure dependencies.

## 90-Day Cycle: System & Performance Audits

**Focus:** Codebase Minification and Integrity.
**Workflow:** `.github/workflows/30-60-90-automation.yml` (Runs quarterly)

- **Automations:**
  - **Frontend Build Audit**: Triggers a clean `npm run build` using the esbuild AOT compiler to enforce strict bundle size budgets and verify lazy loading compilation.
  - **Backend Static Analysis**: Runs `ruff check .` to catch newly introduced linting/formatting deviations or dead code.
