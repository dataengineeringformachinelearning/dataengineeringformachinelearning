# Models Inventory

This document tracks the machine learning models used across the platform, outlining their purpose, the scope of their data (Tenant vs. Platform), their architecture, and how they are trained using Knowledge Distillation from existing open-source "Teacher" models.

## 1. Threat Model (`ThreatModel`)

- **Purpose**: Evaluates tenant-specific telemetry to determine the probability that the tenant is currently experiencing a cyber attack or abnormal activity.
- **Data Scope**: **Tenant-Specific**. It only analyzes endpoints, integrations, and failure rates belonging to the specific tenant.
- **Architecture**: PyTorch Neural Network (Linear -> ReLU -> Linear -> Sigmoid). Outputs a probability from 0.0 to 1.0.
- **Teacher Model**: `meta-llama/Meta-Llama-3-8B-Instruct` (via Hugging Face Inference API).
- **Knowledge Distillation Strategy**: We prompt the Teacher LLM with the tenant's exact telemetry stats (location weights, suspicious ratios, failure rates) and ask it to reason about the cyber attack probability. We use this reasoned score to train our fast PyTorch model.
- **Deployment**:
  - Saved locally as `platform_threat_model.pt` (used as baseline).
  - Pushed securely to your Hugging Face Repository (`HF_REPO_ID`) as `threat_models/platform_threat_model.skops`.

## 2. SLA Estimator (`SLAEstimator`)

- **Purpose**: Predicts the target Service Level Agreement (SLA) penalty or score based on an endpoint's error rate and latency.
- **Data Scope**: **Tenant-Specific**.
- **Architecture**: PyTorch Neural Network (Linear -> ReLU -> Linear). Outputs an SLA score from 0.0 to 1.0.
- **Teacher Model**: `meta-llama/Meta-Llama-3-8B-Instruct` (via Hugging Face Inference API).
- **Knowledge Distillation Strategy**: We prompt the Teacher LLM with an endpoint's specific HTTP status code and response time, asking for an ideal SLA penalty. This teaches the PyTorch model the complex relationship between latency/errors and business SLAs.
- **Deployment**: Pushed securely to your Hugging Face Repository (`HF_REPO_ID`). The path dynamically uses a hashed version of the tenant's slug to maintain privacy (e.g., `sla_models/{hashed_tenant_slug}_sla_model.skops`).

## 3. Countermeasure Effectiveness Score (`CESModel`)

- **Purpose**: Evaluates how effectively the platform's global security rules (rate limits, IPs blocks, WAF) are neutralizing attacks platform-wide.
- **Data Scope**: **Platform-Wide ONLY**. It aggregates telemetry across all endpoints, disregarding tenant isolation, to get a global view of stability and threat mitigation.
- **Architecture**: PyTorch Neural Network (Linear -> ReLU -> Linear -> Sigmoid). Outputs a score from 0.0 to 100.0.
- **Teacher Model**: `meta-llama/Meta-Llama-3-8B-Instruct` (via Hugging Face Inference API).
- **Knowledge Distillation Strategy**: We prompt the Teacher LLM with the platform's global failure rate, global suspicious ratio, and active incidents, asking it to calculate an overall effectiveness score for our countermeasures. Our PyTorch model learns this holistic evaluation.
- **Deployment**:
  - Saved locally as `ces_model.pt`.
  - Pushed securely to your Hugging Face Repository (`HF_REPO_ID`) as `ces_models/platform_ces_model.skops`.

---

_Note: All Knowledge Distillation API calls happen during the offline training workers (e.g. `ml_worker`), not during live inference. Live inference uses the fast, lightweight PyTorch models._
