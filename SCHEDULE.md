# Platform Automation Schedule

This document outlines the concrete, implemented automations that are actively running in the repository via GitHub Actions workflows and Django management commands.

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
