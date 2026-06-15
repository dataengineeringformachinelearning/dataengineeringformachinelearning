# Railway Deployment Guide

This document outlines the deployment configuration for the project on [Railway](https://railway.app/). The application is split into six main services, consisting of five application components deployed from the GitHub repository and one message broker service.

## How to Deploy in One Project

To deploy all these components under a single Railway project:

1. **Create a New Project**: Go to your Railway dashboard and click **New Project** -> **Empty Project**.
2. **Add Services**: For each component below, click **New Service** -> **GitHub Repo**, and select this repository.
3. **Configure Services**:
   - Go to the **Settings** tab for each newly created service.
   - Set the **Root Directory** as specified for each service below (e.g., `/frontend`, `/backend`, `/queue`).
   - For the Telemetry Worker, ensure the **Start Command** is overridden as specified.
4. **Environment Variables**: Add a Postgres database (via **New Service** -> **Database** -> **Add PostgreSQL**) and configure all necessary environment variables in the **Variables** tab for each service according to the configurations listed below.

## Infisical Integration

To satisfy strict secret management guidelines (SOC 2, CMMC 2.0 CC6.1/CC6.2), all secret keys, passwords, and API credentials are kept out of raw service settings and stored inside [Infisical](https://infisical.com/).

1. Set up an Infisical organization and create a project for `dataengineeringformachinelearning`.
2. Connect your Railway services to Infisical via the official Railway Infisical Integration or using the Infisical Agent.
3. For local development, run backend and frontend tasks using the Infisical CLI to dynamically inject credentials:
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

### 2. Web Backend (API)

This service runs the main Django web server.

- **Source**: GitHub repository (`main` branch)
- **Root Directory**: `/backend`
- **Builder**: Dockerfile (utilizes secure, minimal `gcr.io/distroless/python3-debian12` distroless runtime; migrations and server startup are orchestrated using `backend/start.py` as distroless does not include a shell)
- **Public URL**: `https://backend.dataengineeringformachinelearning.com`
- **Target Port**: `8080`
- **Private Internal DNS**: `deml-frontend.railway.internal`
- **Compute Limits**: 8 vCPU / 8 GB Memory
- **Dependencies**: Connects to the Postgres database through the Railway internal network.
- **Deployment Trigger**: Auto-deploys when changes are pushed to GitHub.

### 3. Redpanda Broker (Message Queue)

This is the actual Redpanda message broker database that stores the streaming data.

- **Source**: GitHub repository (`main` branch)
- **Root Directory**: `/queue`
- **Builder**: Dockerfile
- **Target Port**: `9092` (Kafka API)
- **Private Internal DNS**: `deml-queue.railway.internal:9092`
- **Public URL**: None (Strictly internal for security)
- **Compute Limits**: 8 vCPU / 8 GB Memory
- **Persistent Storage**: Requires a persistent volume mounted to `/var/lib/redpanda/data` to retain messages.
- **Deployment Trigger**: Auto-deploys when changes are pushed to GitHub.

### 4. Telemetry Worker (Consumer)

This service runs the background worker process using the backend codebase to consume telemetry/streaming data from Redpanda and write it to Postgres.

- **Source**: GitHub repository (`main` branch)
- **Root Directory**: `/backend`
- **Builder**: Dockerfile (utilizes secure `gcr.io/distroless/python3-debian12` base image)
- **Start Command**: `/opt/venv/bin/python manage.py telemetry_worker`
- **Target Port**: None (Background worker process)
- **Private Internal DNS**: `deml-telemetry.railway.internal`
- **Public URL**: None (Strictly an internal background process)
- **Compute Limits**: 8 vCPU / 8 GB Memory
- **Deployment Trigger**: Auto-deploys when changes are pushed to GitHub.

### 5. ML Training Worker (Consumer)

This service runs the background ML training process using the backend codebase to consume training triggers from Redpanda, load PyTorch, run model training, and write results to Postgres.

- **Source**: GitHub repository (`main` branch)
- **Root Directory**: `/backend`
- **Builder**: Dockerfile (utilizes secure `gcr.io/distroless/python3-debian12` base image)
- **Start Command**: `/opt/venv/bin/python manage.py ml_worker`
- **Target Port**: None (Background worker process)
- **Private Internal DNS**: `deml-ml.railway.internal`
- **Public URL**: None (Strictly an internal background process)
- **Compute Limits**: 8 vCPU / 8 GB Memory
- **Deployment Trigger**: Auto-deploys when changes are pushed to GitHub.

### 6. Security and Compliance Worker (Scheduler)

This service runs the periodic security worker to fetch threat intelligence data and manage 90-day compliance checks (like key rotation and database logging cleanups).

- **Source**: GitHub repository (`main` branch)
- **Root Directory**: `/backend`
- **Builder**: Dockerfile (utilizes secure `gcr.io/distroless/python3-debian12` base image)
- **Start Command**: `/opt/venv/bin/python manage.py security_worker`
- **Target Port**: None (Background worker process)
- **Private Internal DNS**: `deml-security.railway.internal`
- **Public URL**: None (Strictly an internal background process)
- **Compute Limits**: 8 vCPU / 8 GB Memory
- **Deployment Trigger**: Auto-deploys when changes are pushed to GitHub.

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

## Environment Variables

For the environments to function properly, ensure the following are configured in the Railway dashboard or injected via Infisical for each respective service:

### 1. Web Frontend (UI)

No specific backend environment variables are usually required at runtime if the API URL is built into the image, but if configured dynamically:

- **FIREBASE_API_KEY**: Your Firebase web app API key.
- **FIREBASE_PROJECT_ID**: Your Firebase web app project ID (e.g. `demldotcom`).
- **FIREBASE_APP_ID**: Your Firebase web app ID.
- **FIREBASE_AUTH_DOMAIN**: Your Firebase web app auth domain (e.g. `demldotcom.firebaseapp.com`).
- **FIREBASE_STORAGE_BUCKET**: Your Firebase storage bucket (e.g. `demldotcom.firebasestorage.app`).
- **FIREBASE_MESSAGING_SENDER_ID**: Your Firebase messaging sender ID.
- **SANITY_PROJECT_ID**: Your Sanity.io project ID.
- **SANITY_DATASET**: Your Sanity.io dataset name (e.g., `production`).
- **BACKEND_URL**: `https://backend.dataengineeringformachinelearning.com` (Your backend service API URL)

### 2. Web Backend (API)

- **SECRET_KEY**: `<your-production-secret-key>`
- **DEBUG**: `False`
- **ALLOWED_HOSTS**: `backend.dataengineeringformachinelearning.com`
- **FRONTEND_URL**: `https://dataengineeringformachinelearning.com` (Your production frontend URL)
- **DATABASE_URL**: `${{Postgres.DATABASE_URL}}` (Railway automatically provides this if you link the Postgres service)
- **CORS_ALLOW_CREDENTIALS**: `True`
- **CORS_ALLOWED_ORIGINS**: `https://dataengineeringformachinelearning.com,https://backend.dataengineeringformachinelearning.com`
- **CSRF_TRUSTED_ORIGINS**: `https://dataengineeringformachinelearning.com,https://backend.dataengineeringformachinelearning.com`
- **REDPANDA_BROKERS**: `deml-queue.railway.internal:9092` (See warning below)
- **FIREBASE_SERVICE_ACCOUNT_JSON**: The raw JSON string of your Firebase service account credentials.
- **GOOGLE_API_KEY**: `<your-google-api-key>` (If using LLM features)
- **GOOGLE_OAUTH_CLIENT_ID**: `<your-google-oauth-client-id>` (For Google OAuth & Single Sign-On / MFA integration)
- **GOOGLE_OAUTH_CLIENT_SECRET**: `<your-google-oauth-client-secret>`
- **GOOGLE_OAUTH_REDIRECT_URI**: `https://backend.dataengineeringformachinelearning.com/api/v1/system-status/integrations/google/callback` (OAuth callback URL)
- **ABUSEIPDB_API_KEY**: `<your-abuseipdb-api-key>` (For Threat Intelligence geo-blocking data)
- **IPINFO_API_KEY**: `<your-ipinfo-api-key>` (For enhanced ISP and location data)
- **CISA_TAXII_ENDPOINT**: `<your-cisa-taxii-endpoint>` (Optional, for STIX formatted threat reports submission)
- **ISAC_API_KEY**: `<your-isac-api-key>` (Optional, for threat sharing authentication)
- **OTX_API_KEY**: `<your-alienvault-otx-api-key>` (For Threat Intelligence vulnerability data)
- **RESEND_API_KEY**: `<your-resend-api-key>` (Optional, for incident email notifications)
- **SENTRY_DSN**: `<your-sentry-dsn>` (Optional, for error monitoring)

#### Google Cloud KMS (Envelope Encryption)

- **GCP_KMS_PROJECT_ID**: GCP Project ID containing Key Ring
- **GCP_KMS_LOCATION**: Location of the Key Ring (e.g. `global` or `us-east1`)
- **GCP_KMS_KEY_RING**: Name of the KMS Key Ring
- **GCP_KMS_KEY_NAME**: Name of the Key Encrypting Key (KEK)

#### Centralized Logging (SIEM)

- **GCP_LOGGING_ENABLED**: Set to `True` to stream audit/auth logs to GCP Cloud Logging.
- **GOOGLE_APPLICATION_CREDENTIALS**: Path to GCP service account JSON credentials to permit KMS & Logging access.

### 3. Redpanda Broker (Message Queue)

Depending on the Railway template used, Redpanda might not need manual environment variables, but if running the raw Docker image, it usually requires:

- **REDPANDA_BROKERS**: Not strictly needed on the broker itself, but it advertises its internal address. Ensure the port `9092` is exposed internally.

### 4. Telemetry Worker (Consumer)

The worker uses the same Django backend codebase and requires identical environment variables to connect to the database and broker (no HTTP variables are needed since it runs in the background):

- **DATABASE_URL**: `${{Postgres.DATABASE_URL}}`
- **DEBUG**: `False`
- **SECRET_KEY**: `<your-production-secret-key>`
- **REDPANDA_BROKERS**: `deml-queue.railway.internal:9092` (See warning below)

> [!WARNING]
> The `REDPANDA_BROKERS` environment variable MUST point to the actual Redpanda Broker's internal TCP address (e.g., `deml-queue.railway.internal:9092`). Do NOT set it to the Telemetry Worker's public URL or internal DNS, as the worker is not a database and cannot accept Kafka TCP connections.

### 5. ML Training Worker (Consumer)

The ML worker uses the same Django backend codebase and requires identical environment variables to connect to the database and broker:

- **DATABASE_URL**: `${{Postgres.DATABASE_URL}}`
- **DEBUG**: `False`
- **SECRET_KEY**: `<your-production-secret-key>`
- **REDPANDA_BROKERS**: `deml-queue.railway.internal:9092`

### 6. Security and Compliance Worker (Scheduler)

The security worker uses the same Django backend codebase and requires identical environment variables to connect to the database and external threat databases:

- **DATABASE_URL**: `${{Postgres.DATABASE_URL}}`
- **DEBUG**: `False`
- **SECRET_KEY**: `<your-production-secret-key>`
- **GOOGLE_OAUTH_CLIENT_ID**: `<your-google-oauth-client-id>` (For threat intel GA4 sync)
- **GOOGLE_OAUTH_CLIENT_SECRET**: `<your-google-oauth-client-secret>`
- **ABUSEIPDB_API_KEY**: `<your-abuseipdb-api-key>` (For geo-blocking metadata check)
- **IPINFO_API_KEY**: `<your-ipinfo-api-key>` (For enhanced ISP and location data)
- **OTX_API_KEY**: `<your-alienvault-otx-api-key>`
- **GCP_KMS_PROJECT_ID**: GCP Project ID containing Key Ring
- **GCP_KMS_LOCATION**: Location of the Key Ring
- **GCP_KMS_KEY_RING**: Name of the KMS Key Ring
- **GCP_KMS_KEY_NAME**: Name of the Key Encrypting Key (KEK)
