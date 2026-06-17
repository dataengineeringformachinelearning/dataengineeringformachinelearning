# Railway Deployment Guide

This document outlines the deployment configuration for the project on [Railway](https://railway.app/). The application is split into eight main services.

## How to Deploy in One Project

To deploy all these components under a single Railway project:

1. **Create a New Project**: Go to your Railway dashboard and click **New Project** -> **Empty Project**.
2. **Add Services**: For each component below, click **New Service** -> **GitHub Repo**, and select this repository.
3. **Configure Services**:
   - Go to the **Settings** tab for each newly created service.
   - Set the **Root Directory** as specified for each service below.
   - Override the **Start Command** if specified.
4. **Environment Variables**: Add a Postgres database (via **New Service** -> **Database** -> **Add PostgreSQL**) and configure all necessary environment variables in the **Variables** tab for each service according to the configurations listed below.

## Infisical Integration

To satisfy strict secret management guidelines (SOC 2, CMMC 2.0 CC6.1/CC6.2), all secret keys, passwords, and API credentials are kept out of raw service settings and stored inside [Infisical](https://infisical.com/).

1. Set up an Infisical organization and create a project for `dataengineeringformachinelearning`.
2. Connect your Railway services to Infisical via the official Railway Infisical Integration.
3. For local development, run tasks using the Infisical CLI:
   ```bash
   infisical run -- python manage.py runserver
   ```

## Services Overview

### 1. Web Frontend

This service serves the user interface.

- **Source**: GitHub repository (`main` branch)
- **Root Directory**: `/frontend`
- **Builder**: Dockerfile (utilizes secure `nginxinc/nginx-unprivileged:alpine-slim` base image)
- **Public URL**: `https://dataengineeringformachinelearning.com`
- **Target Port**: `8080`
- **Private Internal DNS**: `dataengineeringformachinelearnin.railway.internal`
- **Compute Limits**: 8 vCPU / 8 GB Memory
- **Deployment Trigger**: Auto-deploys when changes are pushed to GitHub.
- **Environment Variables**:
  - **FIREBASE_API_KEY**: Your Firebase web app API key.
  - **FIREBASE_PROJECT_ID**: Your Firebase web app project ID.
  - **FIREBASE_APP_ID**: Your Firebase web app ID.
  - **FIREBASE_AUTH_DOMAIN**: Your Firebase web app auth domain.
  - **FIREBASE_STORAGE_BUCKET**: Your Firebase storage bucket.
  - **FIREBASE_MESSAGING_SENDER_ID**: Your Firebase messaging sender ID.
  - **SANITY_PROJECT_ID**: Your Sanity.io project ID.
  - **SANITY_DATASET**: Your Sanity.io dataset name (e.g., `production`).
  - **BACKEND_URL**: `https://backend.dataengineeringformachinelearning.com`

### 2. Web Backend (API)

This service runs the main Django web server.

- **Source**: GitHub repository (`main` branch)
- **Root Directory**: `/backend`
- **Builder**: Dockerfile (utilizes secure, minimal `gcr.io/distroless/python3-debian12` distroless runtime)
- **Public URL**: `https://backend.dataengineeringformachinelearning.com`
- **Target Port**: `8080`
- **Private Internal DNS**: `deml-frontend.railway.internal`
- **Compute Limits**: 8 vCPU / 8 GB Memory
- **Deployment Trigger**: Auto-deploys when changes are pushed to GitHub.
- **Environment Variables**:
  - **SECRET_KEY**: `<your-production-secret-key>`
  - **DEBUG**: `False`
  - **ALLOWED_HOSTS**: `backend.dataengineeringformachinelearning.com`
  - **FRONTEND_URL**: `https://dataengineeringformachinelearning.com`
  - **DATABASE_URL**: `${{Postgres.DATABASE_URL}}`
  - **CLICKHOUSE_HOST**: The internal TCP host of your ClickHouse service (e.g., `deml-clickhouse.railway.internal`).
  - **CLICKHOUSE_PORT**: `8123` (HTTP port for the python client)
  - **CLICKHOUSE_USER**: Must match what you set in the ClickHouse service.
  - **CLICKHOUSE_PASSWORD**: Must match what you set in the ClickHouse service.
  - **CORS_ALLOW_CREDENTIALS**: `True`
  - **CORS_ALLOWED_ORIGINS**: `https://dataengineeringformachinelearning.com,https://backend.dataengineeringformachinelearning.com`
  - **CSRF_TRUSTED_ORIGINS**: `https://dataengineeringformachinelearning.com,https://backend.dataengineeringformachinelearning.com`
  - **REDPANDA_BROKERS**: `deml-queue.railway.internal:9092`
  - **FIREBASE_SERVICE_ACCOUNT_JSON**: Raw JSON string of your Firebase service account credentials.
  - **GOOGLE_API_KEY**: `<your-google-api-key>`
  - **GOOGLE_OAUTH_CLIENT_ID**: `<your-google-oauth-client-id>`
  - **GOOGLE_OAUTH_CLIENT_SECRET**: `<your-google-oauth-client-secret>`
  - **GOOGLE_OAUTH_REDIRECT_URI**: `https://backend.dataengineeringformachinelearning.com/api/v1/system-status/integrations/google/callback`
  - **ABUSEIPDB_API_KEY**: `<your-abuseipdb-api-key>`
  - **IPINFO_API_KEY**: `<your-ipinfo-api-key>`
  - **CISA_TAXII_ENDPOINT**: `<your-cisa-taxii-endpoint>`
  - **ISAC_API_KEY**: `<your-isac-api-key>`
  - **OTX_API_KEY**: `<your-alienvault-otx-api-key>`
  - **RESEND_API_KEY**: `<your-resend-api-key>`
  - **SENTRY_DSN**: `<your-sentry-dsn>`
  - **GCP_KMS_PROJECT_ID**: GCP Project ID containing Key Ring
  - **GCP_KMS_LOCATION**: Location of the Key Ring
  - **GCP_KMS_KEY_RING**: Name of the KMS Key Ring
  - **GCP_KMS_KEY_NAME**: Name of the Key Encrypting Key (KEK)
  - **GCP_LOGGING_ENABLED**: `True`
  - **GOOGLE_APPLICATION_CREDENTIALS**: Path to GCP service account JSON
  - **GCP_SERVICE_ACCOUNT_JSON**: Raw JSON string of your GCP service account credentials

### 3. Redpanda Broker (Message Queue)

This is the actual Redpanda message broker database that stores the streaming data.

- **Source**: GitHub repository (`main` branch)
- **Root Directory**: `/queue`
- **Builder**: Dockerfile
- **Target Port**: `9092` (Kafka API)
- **Private Internal DNS**: `deml-queue.railway.internal:9092`
- **Public URL**: None (Strictly internal for security)
- **Compute Limits**: 8 vCPU / 8 GB Memory
- **Persistent Storage**: Requires a persistent volume mounted to `/var/lib/redpanda/data`.
- **Deployment Trigger**: Auto-deploys when changes are pushed to GitHub.
- **Environment Variables**:
  - **REDPANDA_BROKERS**: Not strictly needed, but ensure port `9092` is exposed internally.

### 4. Telemetry Worker (Consumer)

Background worker process to consume telemetry/streaming data from Redpanda and write it to Postgres.

- **Source**: GitHub repository (`main` branch)
- **Root Directory**: `/backend`
- **Builder**: Dockerfile (utilizes secure `gcr.io/distroless/python3-debian12` base image)
- **Start Command**: `/opt/venv/bin/python manage.py telemetry_worker`
- **Target Port**: None (Background worker process)
- **Private Internal DNS**: `deml-telemetry.railway.internal`
- **Public URL**: None (Strictly an internal background process)
- **Compute Limits**: 8 vCPU / 8 GB Memory
- **Deployment Trigger**: Auto-deploys when changes are pushed to GitHub.
- **Environment Variables**:
  - **DATABASE_URL**: `${{Postgres.DATABASE_URL}}`
  - **DEBUG**: `False`
  - **SECRET_KEY**: `<your-production-secret-key>`
  - **REDPANDA_BROKERS**: `deml-queue.railway.internal:9092`

> [!WARNING]
> The `REDPANDA_BROKERS` environment variable MUST point to the actual Redpanda Broker's internal TCP address (e.g., `deml-queue.railway.internal:9092`).

### 5. ML Training Worker (Consumer)

Background ML training process to consume training triggers from Redpanda, load PyTorch, run model training, and write results to Postgres.

- **Source**: GitHub repository (`main` branch)
- **Root Directory**: `/backend`
- **Builder**: Dockerfile (utilizes secure `gcr.io/distroless/python3-debian12` base image)
- **Start Command**: `/opt/venv/bin/python manage.py ml_worker`
- **Target Port**: None (Background worker process)
- **Private Internal DNS**: `deml-ml.railway.internal`
- **Public URL**: None (Strictly an internal background process)
- **Compute Limits**: 8 vCPU / 8 GB Memory
- **Deployment Trigger**: Auto-deploys when changes are pushed to GitHub.
- **Environment Variables**:
  - **DATABASE_URL**: `${{Postgres.DATABASE_URL}}`
  - **DEBUG**: `False`
  - **SECRET_KEY**: `<your-production-secret-key>`
  - **REDPANDA_BROKERS**: `deml-queue.railway.internal:9092`

### 6. Security and Compliance Worker (Scheduler)

Periodic security worker to fetch threat intelligence data and manage 90-day compliance checks.

- **Source**: GitHub repository (`main` branch)
- **Root Directory**: `/backend`
- **Builder**: Dockerfile (utilizes secure `gcr.io/distroless/python3-debian12` base image)
- **Start Command**: `/opt/venv/bin/python manage.py security_worker`
- **Target Port**: None (Background worker process)
- **Private Internal DNS**: `deml-security.railway.internal`
- **Public URL**: None (Strictly an internal background process)
- **Compute Limits**: 8 vCPU / 8 GB Memory
- **Deployment Trigger**: Auto-deploys when changes are pushed to GitHub.
- **Environment Variables**:
  - **DATABASE_URL**: `${{Postgres.DATABASE_URL}}`
  - **DEBUG**: `False`
  - **SECRET_KEY**: `<your-production-secret-key>`
  - **GOOGLE_OAUTH_CLIENT_ID**: `<your-google-oauth-client-id>`
  - **GOOGLE_OAUTH_CLIENT_SECRET**: `<your-google-oauth-client-secret>`
  - **ABUSEIPDB_API_KEY**: `<your-abuseipdb-api-key>`
  - **IPINFO_API_KEY**: `<your-ipinfo-api-key>`
  - **OTX_API_KEY**: `<your-alienvault-otx-api-key>`
  - **GCP_KMS_PROJECT_ID**: GCP Project ID containing Key Ring
  - **GCP_KMS_LOCATION**: Location of the Key Ring
  - **GCP_KMS_KEY_RING**: Name of the KMS Key Ring
  - **GCP_KMS_KEY_NAME**: Name of the Key Encrypting Key (KEK)

### 7. ClickHouse Database (Telemetry Storage)

ClickHouse is used to securely store all high-volume OpenTelemetry data from the widget and backend services.

- **Source**: GitHub repository (`main` branch)
- **Root Directory**: `/clickhouse`
- **Builder**: Dockerfile (utilizes `clickhouse/clickhouse-server:24.3`)
- **Target Port**: `8123` (HTTP) and `9000` (Native)
- **Private Internal DNS**: `deml-clickhouse.railway.internal`
- **Public URL**: None (Strictly an internal database)
- **Compute Limits**: 8 vCPU / 8 GB Memory
- **Persistent Storage**: You MUST attach a Railway Persistent Volume to `/var/lib/clickhouse`.
- **Deployment Trigger**: Auto-deploys when changes are pushed to GitHub.
- **Environment Variables**:
  - **CLICKHOUSE_USER**: Leave this variable **completely unset/deleted** on the ClickHouse service if you want to use the `default` user. If you define it as `default` explicitly, ClickHouse's entrypoint will skip setting the password, causing connection errors in other services.
  - **CLICKHOUSE_PASSWORD**: Set a secure password (e.g. for the default user).
  - **CLICKHOUSE_DB**: `otel`

> [!IMPORTANT]
> **ClickHouse Password Gotcha**: Do not define `CLICKHOUSE_USER` as `default` in the ClickHouse service environment variables. If you wish to use the `default` user, simply omit the `CLICKHOUSE_USER` variable entirely from the ClickHouse service. The entrypoint script will automatically apply your `CLICKHOUSE_PASSWORD` to the default user. Make sure `CLICKHOUSE_USER` is still set to `default` in your otel-collector and backend services so they connect correctly.

### 8. OpenTelemetry Collector (Router)

The OpenTelemetry Collector receives all spans and metrics from the frontend widget and backend, processing them securely before batch-inserting into ClickHouse.

- **Source**: GitHub repository (`main` branch)
- **Root Directory**: `/telemetry`
- **Builder**: Dockerfile (utilizes secure `otel/opentelemetry-collector-contrib` distroless base)
- **Target Port**: `4318` (OTLP HTTP)
- **Private Internal DNS**: `deml-telemetry.railway.internal`
- **Public URL**: `https://telemetry.dataengineeringformachinelearning.com`
- **Compute Limits**: 8 vCPU / 8 GB Memory
- **Deployment Trigger**: Auto-deploys when changes are pushed to GitHub.
- **Environment Variables**:
  - **CLICKHOUSE_HOST**: The internal TCP host of your ClickHouse service (e.g. `deml-clickhouse.railway.internal`).
  - **CLICKHOUSE_USER**: Must match what you set in the ClickHouse service.
  - **CLICKHOUSE_PASSWORD**: Must match what you set in the ClickHouse service.
  - **ALLOWED_CORS_ORIGINS**: Set this to the exact domain where your widget will be hosted (e.g., `https://dataengineeringformachinelearning.com`).

## Internal Networking

Services within this environment can communicate securely over Railway's private internal network without traversing the public internet.

- **Backend API**: Accessible internally at `deml-backend.railway.internal:8080`
- **Frontend**: Accessible internally at `deml-frontend.railway.internal:8080`
- **Postgres Database**: Connected via the internal network. Ensure the `DATABASE_URL` environment variable uses the internal connection string.
- **Redpanda Broker**: Connected via the internal TCP network (e.g., `deml-queue.railway.internal:9092`).

## CI/CD Pipeline

- All services are linked to the `main` branch of the `dataengineeringformachinelearning` repository.
- Pushes to the `main` branch will automatically trigger new builds and deployments for the affected services.
- Automated security testing via **Socket.dev** and **Checkov** pre-commit hooks runs on every push.
- **Watch Paths**: You can set gitignore-style rules (e.g., `/frontend/**` or `/backend/**`) in the Railway settings to ensure that a service only rebuilds when its specific directory changes.

## Reliability and Scaling

- **Restart Policy**: All services are configured to restart "On Failure" with a maximum of 10 retries, ensuring automatic recovery from temporary crashes.
- **Region**: US East (Virginia, USA)
- **Replicas**: 1 replica per service.
