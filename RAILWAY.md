# Railway Deployment Guide

This document outlines the deployment configuration for the project on [Railway](https://railway.app/). The application is split into five main services, consisting of four application components deployed from the GitHub repository and one message broker service.

## How to Deploy in One Project

To deploy all these components under a single Railway project:

1. **Create a New Project**: Go to your Railway dashboard and click **New Project** -> **Empty Project**.
2. **Add Services**: For each component below, click **New Service** -> **GitHub Repo**, and select this repository.
3. **Configure Services**:
   - Go to the **Settings** tab for each newly created service.
   - Set the **Root Directory** as specified for each service below (e.g., `/frontend`, `/backend`, `/queue`).
   - For the Telemetry Worker, ensure the **Start Command** is overridden as specified.
4. **Environment Variables**: Add a Postgres database (via **New Service** -> **Database** -> **Add PostgreSQL**) and configure all necessary environment variables in the **Variables** tab for each service according to the configurations listed below.

## Services Overview

### 1. Web Frontend

This service serves the user interface.

- **Source**: GitHub repository (`main` branch)
- **Root Directory**: `/frontend`
- **Builder**: Dockerfile
- **Public URL**: `https://dataengineeringformachinelearning.com`
- **Target Port**: `8080`
- **Private Internal DNS**: `dataengineeringformachinelearnin.railway.internal`
- **Compute Limits**: 8 vCPU / 8 GB Memory
- **Deployment Trigger**: Auto-deploys when changes are pushed to GitHub.

### 2. Web Backend (API)

This service runs the main Django web server.

- **Source**: GitHub repository (`main` branch)
- **Root Directory**: `/backend`
- **Builder**: Dockerfile
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
- **Builder**: Dockerfile
- **Start Command**: `python manage.py telemetry_worker`
- **Target Port**: None (Background worker process)
- **Private Internal DNS**: `deml-telemetry.railway.internal`
- **Public URL**: None (Strictly an internal background process)
- **Compute Limits**: 8 vCPU / 8 GB Memory
- **Deployment Trigger**: Auto-deploys when changes are pushed to GitHub.

### 5. ML Training Worker (Consumer)

This service runs the background ML training process using the backend codebase to consume training triggers from Redpanda, load PyTorch, run model training, and write results to Postgres.

- **Source**: GitHub repository (`main` branch)
- **Root Directory**: `/backend`
- **Builder**: Dockerfile
- **Start Command**: `python manage.py ml_worker`
- **Target Port**: None (Background worker process)
- **Private Internal DNS**: `deml-ml.railway.internal`
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
- **Watch Paths**: You can set gitignore-style rules (e.g., `/frontend/**` or `/backend/**`) in the Railway settings to ensure that a service only rebuilds when its specific directory changes.

## Reliability and Scaling

- **Restart Policy**: All services are configured to restart "On Failure" with a maximum of 10 retries, ensuring automatic recovery from temporary crashes.
- **Region**: US East (Virginia, USA)
- **Replicas**: 1 replica per service.

## Environment Variables

For the environments to function properly, ensure the following are configured in the Railway dashboard for each respective service:

### 1. Web Frontend (UI)

No specific backend environment variables are usually required at runtime if the API URL is built into the image, but if configured dynamically:

- **API_URL** or similar depending on the frontend build setup: `https://backend.dataengineeringformachinelearning.com`
- **FIREBASE_API_KEY**: Your Firebase web app API key.
- **FIREBASE_AUTH_DOMAIN**: Your Firebase web app auth domain (e.g. `demldotcom.firebaseapp.com`).
- **FIREBASE_STORAGE_BUCKET**: Your Firebase storage bucket (e.g. `demldotcom.appspot.com`).
- **FIREBASE_MESSAGING_SENDER_ID**: Your Firebase messaging sender ID.
- **FIREBASE_APP_ID**: Your Firebase web app ID.

### 2. Web Backend (API)

- **ALLOWED_HOSTS**: `backend.dataengineeringformachinelearning.com`
- **CORS_ALLOW_CREDENTIALS**: `True`
- **CORS_ALLOWED_ORIGINS**: `https://dataengineeringformachinelearning.com,https://backend.dataengineeringformachinelearning.com`
- **CSRF_TRUSTED_ORIGINS**: `https://dataengineeringformachinelearning.com,https://backend.dataengineeringformachinelearning.com`
- **DATABASE_URL**: `${{Postgres.DATABASE_URL}}` (Railway automatically provides this if you link the Postgres service)
- **DEBUG**: `False`
- **SECRET_KEY**: `<your-production-secret-key>`
- **REDPANDA_BROKERS**: `deml-queue.railway.internal:9092` (See warning below)
- **GOOGLE_API_KEY**: `<your-google-api-key>` (If using LLM features)
- **FRONTEND_URL**: `https://dataengineeringformachinelearning.com` (Your production frontend URL)
- **GOOGLE_OAUTH_CLIENT_ID**: `<your-google-oauth-client-id>` (For Google Analytics integration)
- **GOOGLE_OAUTH_CLIENT_SECRET**: `<your-google-oauth-client-secret>` (For Google Analytics integration)
- **GOOGLE_OAUTH_REDIRECT_URI**: `https://backend.dataengineeringformachinelearning.com/api/v1/system-status/integrations/google/callback` (OAuth callback URL)
- **FIREBASE_SERVICE_ACCOUNT_JSON**: The raw JSON string of your Firebase service account credentials.
- **ABUSEIPDB_API_KEY**: `<your-abuseipdb-api-key>` (For Threat Intelligence geo-blocking data)
- **OTX_API_KEY**: `<your-alienvault-otx-api-key>` (For Threat Intelligence vulnerability data)
- **RESEND_API_KEY**: `<your-resend-api-key>` (Optional, for incident email notifications)
- **SENTRY_DSN**: `<your-sentry-dsn>` (Optional, for error monitoring)

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
