# Software Bill of Materials (SBOM)

This document outlines the dependencies and libraries used in this project.

## Frontend (Node.js / Angular)

**Path:** `/frontend/package.json`
**Node Engine:** `>=24.15.0`
**Package Manager:** `npm@11.6.0`

### Dependencies

- `@angular/animations`: ^22.0.0
- `@angular/cdk`: ^22.0.2
- `@angular/common`: ^22.0.0
- `@angular/compiler`: ^22.0.0
- `@angular/core`: ^22.0.0
- `@angular/forms`: ^22.0.0
- `@angular/platform-browser`: ^22.0.0
- `@angular/platform-server`: ^22.0.0
- `@angular/router`: ^22.0.0
- `@angular/ssr`: ^22.0.0
- `@orama/orama`: ^3.1.18
- `@sanity/client`: ^7.22.1
- `@sentry/angular`: ^10.57.0
- `apexcharts`: ^5.15.2
- `canvas-confetti`: ^1.9.4
- `express`: ^5.1.0
- `firebase`: ^12.14.0
- `jspdf`: ^4.2.1
- `leaflet`: ^1.9.4
- `marked`: ^17.0.6
- `ng-apexcharts`: ^2.4.0
- `ngx-markdown`: ^21.2.0
- `prismjs`: ^1.30.0
- `rxjs`: ~7.8.0
- `tslib`: ^2.3.0
- `zone.js`: ^0.16.2

### Dev Dependencies

- `@analogjs/vitest-angular`: ^2.6.0
- `@angular/build`: ^22.0.0
- `@angular/cli`: ^22.0.0
- `@angular/compiler-cli`: ^22.0.0
- `@angular/material`: ^22.0.2
- `@angular/platform-browser-dynamic`: ^22.0.0
- `@dotenvx/dotenvx`: ^1.71.0
- `@eslint/js`: ^10.0.1
- `angular-eslint`: 21.3.1
- `eslint`: ^10.0.3
- `eslint-config-prettier`: ^10.1.8
- `eslint-plugin-prettier`: ^5.5.5
- `globals`: ^17.4.0
- `jsdom`: ^28.0.0
- `prettier`: ^3.8.2
- `typescript`: ~6.0.3
- `typescript-eslint`: 8.56.1
- `vitest`: ^4.0.8

---

## Backend (Python / Django)

**Path:** `/backend/requirements.txt`

### Dependencies

- `asgiref`==3.11.1
- `dj-database-url`==3.1.2
- `opentelemetry-distro`
- `opentelemetry-instrumentation-django`
- `opentelemetry-exporter-otlp`
- `clickhouse-connect`
- `Django`==5.2.15
- `django-migration-linter`==6.0.0
- `django-cors-headers`==4.6.0
- `gunicorn`==25.1.0
- `numpy`==1.26.4
- `polars`==1.41.2
- `psycopg2-binary`==2.9.11
- `python-dotenv`==1.2.2
- `scikit-learn`==1.9.0
- `scipy`==1.17.1
- `skops`==0.14.0
- `torch`==2.12.0
- `whitenoise`==6.12.0
- `django-ninja`==1.3.0
- `aiokafka`==0.12.0
- `langchain`==1.3.9
- `langchain-google-genai`==4.2.5
- `protobuf`==5.29.6
- `langgraph`==1.2.5
- `pytest`==9.0.3
- `pytest-django`==4.8.0
- `firebase-admin`==6.6.0
- `sentry-sdk`==2.62.0
- `google-cloud-kms`==3.13.0
- `google-cloud-logging`==3.16.0
- `pytest-asyncio`>=0.24.0
- `user-agents`
- `ipwhois`
- `requests`
- `resend`==2.4.0
- `aiohttp`==3.9.5
- `adbc-driver-postgresql`
- `connectorx`
- `liboqs-python`==0.15.0
- `huggingface-hub`>=0.23.0
