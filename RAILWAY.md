# Railway Deployment Guide

This document outlines the deployment configuration for the project on [Railway](https://railway.app/). The application is split into four main services, consisting of three application components deployed from the GitHub repository and one message broker service.

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
- **Private Internal DNS**: `dataengineeringformachinelearning.railway.internal`
- **Compute Limits**: 8 vCPU / 8 GB Memory
- **Dependencies**: Connects to the Postgres database through the Railway internal network.
- **Deployment Trigger**: Auto-deploys when changes are pushed to GitHub.

### 3. Telemetry Worker (Consumer)
This service runs the background worker process using the backend codebase to consume telemetry/streaming data from Redpanda and write it to Postgres.
- **Source**: GitHub repository (`main` branch)
- **Root Directory**: `/backend`
- **Builder**: Dockerfile
- **Start Command**: `python manage.py telemetry_worker`
- **Public URL**: `https://telemetry.dataengineeringformachinelearning.com`
- **Target Port**: `8080`
- **Compute Limits**: 8 vCPU / 8 GB Memory
- **Deployment Trigger**: Auto-deploys when changes are pushed to GitHub.

### 4. Redpanda Broker (Message Queue)
This is the actual Redpanda message broker database that stores the streaming data. It must be provisioned as a separate service or database within Railway.
- **Service Type**: Docker Image (`docker.redpanda.com/redpandadata/redpanda`) or Railway Template
- **Internal TCP DNS**: `redpanda.railway.internal:9092` (Example)
- **Public URL**: None (Should be internal only)

## Internal Networking

Services within this environment can communicate securely over Railway's private internal network without traversing the public internet.
- **Backend API**: Accessible internally at `dataengineeringformachinelearning.railway.internal`
- **Frontend**: Accessible internally at `dataengineeringformachinelearnin.railway.internal`
- **Postgres Database**: Connected via the internal network. Ensure the `DATABASE_URL` environment variable uses the internal connection string.
- **Redpanda Broker**: Connected via the internal TCP network (e.g., `redpanda.railway.internal:9092`).

## CI/CD Pipeline

- All services are linked to the `main` branch of the `dataengineeringformachinelearning` repository.
- Pushes to the `main` branch will automatically trigger new builds and deployments for the affected services.
- **Watch Paths**: You can set gitignore-style rules (e.g., `/frontend/**` or `/backend/**`) in the Railway settings to ensure that a service only rebuilds when its specific directory changes.

## Reliability and Scaling

- **Restart Policy**: All services are configured to restart "On Failure" with a maximum of 10 retries, ensuring automatic recovery from temporary crashes.
- **Region**: US East (Virginia, USA)
- **Replicas**: 1 replica per service.

## Environment Variables

For the environments to function properly, ensure the following are configured in the Railway dashboard:
- **Backend**: Requires Postgres credentials (`DATABASE_URL`), Redpanda/Kafka Broker URLs (`REDPANDA_BROKERS`), and allowed hosts/CORS settings (allowing `dataengineeringformachinelearning.com`).
- **Frontend**: Requires the API base URL pointing to `https://backend.dataengineeringformachinelearning.com`.
- **Worker**: Requires the same environment variables as the backend, specifically the Redpanda broker details (`REDPANDA_BROKERS`).

> [!WARNING]
> The `REDPANDA_BROKERS` environment variable MUST point to the actual Redpanda Broker's internal TCP address (e.g., `redpanda.railway.internal:9092`). Do NOT set it to the Telemetry Worker's public URL, as the worker is not a database and cannot accept Kafka TCP connections.
