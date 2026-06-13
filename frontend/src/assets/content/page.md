## Chapter 1: Setting up your environment

In this opening chapter, I want to guide the reader through setting up a clean, modern development environment. For the book's companion application, I've decided to build a full-stack system using Angular for the frontend and Python (Django) for the backend.

### Chapter 1.1: Frontend Setup

If you're on a Mac like me, I highly recommend utilizing the Apple ecosystem's package management tools. Here's how I set up the initial environment. First, open the terminal and install Homebrew:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

For Apple Silicon Macs, I make sure to install Rosetta 2 to ensure compatibility with any legacy x86_64 binaries:

```bash
softwareupdate --install-rosetta
```

With Homebrew in place, I install Node.js and the Angular CLI to get the frontend bootstrap process started:

```bash
brew install node
npm install -g @angular/cli
```

Once the tools are ready, I scaffold a new Angular project and start the development server:

```bash
ng new frontend
cd frontend
npm start
```

I visit `http://localhost:4200` to verify that the local dev server is running properly.

To enforce the styling and quality standards I want for this codebase, I configure ESLint and Prettier. Here is how I run the checks and formatting:

```bash
# Run ESLint to check for code issues
npm run lint

# Format the codebase with Prettier
npx prettier --write .
```

To prepare this frontend for production, I plan to teach the reader how to containerize the Angular application using a multi-stage Dockerfile that builds the app and serves it via NGINX. I created a `Dockerfile` and an `nginx.conf` in the frontend directory, which can be built and run like this:

```bash
docker build -t frontend-app .
docker run -p 8080:8080 frontend-app
```

### Chapter 1.2: Backend Setup

For the backend stack, I've chosen Python and Django. On macOS, the fastest and cleanest way I've found to manage Python versions, virtual environments, and project dependencies is [Astral uv](https://github.com/astral-sh/uv). I install it via Homebrew:

```bash
brew install uv
```

Once `uv` is installed, I use it along with `uvx` to initialize my environment, install Django, and scaffold the backend:

```bash
mkdir backend && cd backend

# Create a virtual environment using uv
uv venv

# Activate the virtual environment
source .venv/bin/activate

# Install Django using uv's lightning-fast pip interface
uv pip install django

# Scaffold the Django project
django-admin startproject config .
python manage.py runserver
```

I verify everything is working by visiting `http://127.0.0.1:8000`.

Just like the frontend, I want to containerize the Django application using Docker. In the book, I will show how to install production dependencies like `gunicorn`, `whitenoise`, and `psycopg2-binary`, and define a `Dockerfile` that collects static files and runs the server using Gunicorn.

To enforce professional formatting and style standards (specifically conforming to the Google Python Style Guide with 2-space indentation), I run [Ruff](https://docs.astral.sh/ruff/) via `uvx`:

```bash
# Run Ruff lint checks and auto-fix issues
uvx ruff check --fix .

# Auto-format Python files
uvx ruff format .
```

---

## Chapter 2: Integrating Tools and Pre-requisites

As the codebase grows, keeping quality standards high is a priority. I want to highlight how to configure tools like Prettier and ESLint for the frontend to prevent style drift:

```bash
npm install --save-dev prettier
ng add @angular-eslint/schematics
```

For rapid prototyping of independent TypeScript services or middleware outside of Angular, I like to use `tsx`. It's a great lightweight tool when I need to quickly test logic:

```bash
npm install --save-dev tsx
npx tsx --watch your-script.ts
```

This acts as a lightweight way to spin up secondary services alongside the main Django application.

### Chapter 2.1: Automated Code Quality (Pre-commit)

To save time and automatically enforce formatting, style guidelines, and code quality before every git commit, I configured [pre-commit](https://pre-commit.com/) hooks. I execute them via `uvx`:

```bash
# Run all pre-commit hooks manually on the whole codebase
uvx pre-commit run --all-files
```

These hooks automatically check and format Python files (via [Ruff](https://docs.astral.sh/ruff/)), frontend files (via [Prettier](https://prettier.io/)), YAML configurations, trailing whitespace, and end-of-file formatting.

---

## Chapter 3: Interfaces and data integration

A cornerstone of modern systems design is decoupling the client and server. In this chapter, I want to show how to build a clean backend API and integrate it with our frontend application.

### Chapter 3.1: Introduction

#### Chapter 3.1.1: Integrating fullstack endpoints

Integrations through RESTful APIs are the industry standard for fullstack applications. Here is my prototype for a simple healthcheck endpoint in Django.

First, I define the view and hook it into the URL routing:

```python
# backend/config/views.py
from django.http import JsonResponse

def health(request):
    return JsonResponse({"status": "ok"})
```

```python
# backend/config/urls.py
# Add this to your urlpatterns:
# path('api/health', views.health, name='health'),
```

To allow the Angular frontend to communicate with the Django backend, I need to configure CORS (Cross-Origin Resource Sharing):

```bash
pip install django-cors-headers
# Add 'corsheaders' to INSTALLED_APPS and its middleware to MIDDLEWARE
```

In `settings.py`, I use environment variables to define allowed origins so the system works smoothly both in my local environment and in production:

```python
# backend/config/settings.py
import os
from dotenv import load_dotenv

load_dotenv()
cors_origins = os.getenv('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = [o.strip() for o in cors_origins.split(',')] if cors_origins else []
```

Now that the endpoint is responding, I need to enable Angular to call it. In modern Angular using standalone components, I configure the HTTP client in `app.config.ts`:

```typescript
// frontend/src/app/app.config.ts
import { provideHttpClient, withFetch } from "@angular/common/http";
export const appConfig = { providers: [provideHttpClient(withFetch())] };
```

I then inject this into a component and use Angular Signals to cleanly manage the reactive state:

```typescript
// frontend/src/app/app.component.ts
import { Component, inject, signal, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";

@Component({
  selector: "app-root",
  standalone: true,
  template: `<footer>Backend Status: {{ backendStatus() }}</footer>`,
})
export class AppComponent implements OnInit {
  backendStatus = signal<"checking" | "ok" | "error">("checking");
  private http = inject(HttpClient);

  ngOnInit() {
    this.http.get<{ status: string }>("/api/health").subscribe({
      next: (res) =>
        this.backendStatus.set(res.status === "ok" ? "ok" : "error"),
      error: () => this.backendStatus.set("error"),
    });
  }
}
```

This pattern of exposing a backend JSON endpoint, configuring CORS via environment variables, and consuming it reactively on the frontend is a fundamental pattern I will repeat throughout the book.

---

## Chapter 4: Database design

### Chapter 4.1: Introduction

#### Chapter 4.1.1: Setting up data schemas

A robust database is essential for storing the historical telemetry needed to train our machine learning models. I've chosen PostgreSQL. To visualize and manage the database schemas easily, I recommend using DBeaver:

```bash
brew install --cask dbeaver-community
```

Let's evolve the simple healthcheck from Chapter 3 into a persisted data point for tracking application uptime. I'll create a Django app for this:

```bash
python manage.py startapp monitor
# Add 'monitor' to INSTALLED_APPS in settings.py
```

Next, I define a model to represent the healthcheck records:

```python
# monitor/models.py
import uuid
from django.db import models

class Endpoints(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    url = models.URLField()
    last_tested = models.DateTimeField(auto_now=True)
    status_code = models.IntegerField()
    response_time = models.DurationField()
    is_active = models.BooleanField(default=True)
```

Then I run migrations to update the database schema:

```bash
python manage.py makemigrations monitor
python manage.py migrate
```

Finally, I update the healthcheck view to log a record to the database each time the endpoint is hit:

```python
# config/views.py
import time
from datetime import timedelta
from django.http import JsonResponse
from monitor.models import Endpoints

def health(request):
    start_time = time.time()

    # ... perform healthcheck logic ...

    duration = timedelta(seconds=time.time() - start_time)
    Endpoints.objects.create(
        url=request.build_absolute_uri(),
        status_code=200,
        response_time=duration,
        is_active=True
    )

    return JsonResponse({'status': 'ok'})
```

---

## Chapter 5: Visualizing data

### Chapter 5.1: Introduction

#### Chapter 5.1.1: Developing interface visualizations

Once we have active telemetry streaming into PostgreSQL, the next logical step is visualization. Rendering a dashboard of application uptime and response times provides immediate visual insight into system health.

First, I create a Django endpoint to expose this data:

```python
# monitor/views.py
from django.http import JsonResponse
from .models import Endpoints

def get_all_endpoints(request):
    endpoints = list(Endpoints.objects.values())
    return JsonResponse(endpoints, safe=False)
```

On the frontend, I choose to use `ag-charts` to build responsive, interactive charts in Angular:

```bash
npm install ag-charts-angular ag-charts-community
```

In the dashboard component, I fetch the telemetry data and bind it to the chart configuration. Here is my prototype:

```typescript
// frontend/src/app/pages/dashboard/dashboard.ts
import { Component, OnInit, inject } from "@angular/core";
import { AgCharts } from "ag-charts-angular";
import { HttpClient } from "@angular/common/http";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [AgCharts],
  template: `<ag-charts [options]="chartOptions"></ag-charts>`,
})
export class Dashboard implements OnInit {
  private http = inject(HttpClient);
  public chartOptions = {
    title: { text: "Application Stability" },
    data: [],
    series: [{ type: "line", xKey: "time", yKey: "statusCode" }],
  };

  ngOnInit() {
    this.http.get<any[]>("/api/monitor/endpoints").subscribe((data) => {
      this.chartOptions = {
        ...this.chartOptions,
        data: data.map((ep) => ({
          time: new Date(ep.last_tested).toLocaleTimeString(),
          statusCode: ep.status_code,
        })),
      };
    });
  }
}
```

To take this further, I also plan to show how to use `ag-grid` to display tabular data, allowing users to sort, filter, and export the logs easily.

---

## Chapter 6: Modeling and training

### Chapter 6.1: Introduction

#### Chapter 6.1.1: Setting up modeling and prediction

Now that we are tracking endpoint health data, we can start building models to predict system degradation. I've brought in PyTorch to design a neural network and Polars for fast data manipulation:

```bash
pip install torch polars skops scikit-learn
```

To structure this properly, I scaffold a new Django app called `model`:

```bash
python manage.py startapp model
```

Instead of running an intensive training loop synchronously on the web server (which would block the event loop), I outline a basic multi-layer perceptron using PyTorch's `nn.Module`. Here is my draft of how to structure this view, which will load historical health metrics to predict SLA adherence:

```python
# backend/model/views.py
import torch
import torch.nn as nn
from django.http import JsonResponse
from monitor.models import Endpoints

class SLAPredictor(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(3, 16)
        self.fc2 = nn.Linear(16, 1)

    def forward(self, x):
        return self.fc2(torch.relu(self.fc1(x)))

def train_model(request):
    # Fetch historical data and convert to tensors
    endpoints = Endpoints.objects.all()
    # ... prepare X and Y tensors from endpoint data ...

    # Initialize the model and a simple MSE loss function
    model = SLAPredictor()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

    # Example single training step
    optimizer.zero_grad()
    # loss = criterion(model(X), Y)
    # loss.backward()
    # optimizer.step()

    return JsonResponse({'status': 'training_initiated'})
```

By exposing this model training via an API endpoint, the Angular client can trigger training and query predictions to display real-time SLA metrics.

---

## Chapter 7: Securing the compute

### Chapter 7.1: Introduction

#### Chapter 7.1.1: Implementing authentication

Because training machine learning models is computationally expensive, I want to show the reader how to secure these endpoints.

On the frontend, I manage user sessions by tracking authentication states in an Angular service. I use Angular Signals to make this highly reactive and readable:

```typescript
// frontend/src/app/services/auth.service.ts
import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class AuthService {
  public isAuthenticated = signal<boolean>(false);
}
```

I can then inject this service into my UI components to show/hide or enable/disable sensitive actions:

```html
<button (click)="trainModel()" [disabled]="!authService.isAuthenticated()">
  Train SLA Model
</button>
```

On the backend, I leverage Django's robust built-in authentication system to handle user sessions. By authenticating a JSON payload and returning session cookies, the Angular application can securely log users in and out:

```python
# backend/config/views.py
import json
from django.contrib.auth import authenticate, login
from django.http import JsonResponse

def api_login(request):
    data = json.loads(request.body)
    user = authenticate(request, username=data.get('username'), password=data.get('password'))
    if user is not None:
        login(request, user)
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'error'}, status=401)
```

To set up the initial admin user, I run the Django interactive superuser creation tool:

```bash
python manage.py createsuperuser
```

---

## Chapter 8: Enhancing observability

### Chapter 8.1: Introduction

#### Chapter 8.1.1: Enabling data ingestion through pipelines

To scale telemetry ingestion, I decided to introduce Redpanda—a fast, lightweight, JVM-free Kafka alternative. This allows us to decouple real-time telemetry ingestion from our main web server workflows.

First, I need to capture exceptions and performance metrics from the client side. I designed a global error handler in Angular to catch exceptions and post them to our ingest endpoint, falling back to `localStorage` if the user is offline:

```typescript
// Example frontend error payload submission
const errorPayload = {
  timestamp: new Date().toISOString(),
  message: error.message,
  context: { url: window.location.href },
};
this.http.post("/api/v1/telemetry/endpoints", errorPayload).subscribe();
```

On the backend, I want an asynchronous, non-blocking ingestion endpoint. Using `django-ninja` alongside `aiokafka` lets us write an async view that immediately dispatches the event payload to a Redpanda topic:

```python
# backend/telemetry/views.py
import json
from aiokafka import AIOKafkaProducer
from ninja import Router

router = Router()
producer = AIOKafkaProducer(bootstrap_servers="localhost:9092")

@router.post("/telemetry/endpoints")
async def post_telemetry(request, payload: dict):
    await producer.start()
    await producer.send("app-events", json.dumps(payload).encode("utf-8"))
    await producer.stop()
    return {"status": "accepted"}
```

A standalone background telemetry worker subscribes to the `app-events` topic, pulls messages in batches, and processes them using Polars before writing to PostgreSQL. This ensures high throughput without slowing down the user experience.

#### Chapter 8.1.2: Integrating Sentry for Full-Stack Error Tracking

To capture real-time errors in production, I integrated Sentry across both the frontend and backend:

- **Frontend**: I initialize the Sentry Angular SDK (`@sentry/angular`) in `main.ts` and hook it into the router configuration in `app.config.ts`. Exceptions are explicitly forwarded to Sentry in my `GlobalErrorHandler` via `Sentry.captureException(error)`.
- **Backend**: I configure the Sentry Python SDK (`sentry-sdk`) in `settings.py`, enabling `send_default_pii=True` so we capture full request contexts during exceptions.
- **Environments**: In production, DSN keys are loaded from the environment (`SENTRY_DSN`) to keep credentials secure.

#### Chapter 8.1.3: Continuous Security Auditing with Snyk

I want to emphasize security by design. To do this, I integrated Snyk to automate vulnerability checks throughout the development lifecycle:

- **Static Analysis (SAST)**: I run Snyk Code scans to find logic and security issues in my custom source code.
- **Dependency Scanning**: Snyk monitors third-party packages in both Angular (`package.json`) and Django (`requirements.txt`) to keep dependencies patched.
- **Container Audits**: Snyk scans the Dockerfiles across my services (`frontend`, `backend`, and `queue`) to detect vulnerabilities in base images.

#### Chapter 8.1.4: Open-Source License Compliance with FOSSA

To protect against licensing issues, I integrated FOSSA to run automated scans:

- **License Scans**: It analyzes the frontend and backend dependency trees to verify compliance with my project's open-source constraints.
- **Reporting**: Automated workflows generate compliance logs and status badges for the project.

---

## Chapter 9: Applying a use-case

### Chapter 9.1: Introduction

#### Chapter 9.1.1: Enabling the data pipeline for incident management

With historical telemetry streaming through Redpanda, I want to show a practical use-case: a public status and incident management dashboard.

Here is the flow I've implemented:

1. **Telemetry Processing**: The async worker pulls healthcheck metrics from Redpanda and uses Polars to batch process them efficiently.
2. **SLA Calculation**: The worker computes service uptime and calculates real-time SLA compliance percentages.
3. **Incident Operations & CMS**: Authenticated operators can log in to declare active incidents and associate them with status pages. These are pushed to the frontend, updating the UI in real-time via Angular Signals. Additionally, we integrate [Sanity.io](https://www.sanity.io) as a headless CMS (`studio/` directory) to manage real-time system-wide announcements and alerts, allowing administrators to publish banner messages dynamically.
4. **Historical Visualizations**: Telemetry is aggregated into daily buckets to render a 90-day interactive graph showing service health history.

---

## Chapter 10: Encrypting the data

### Chapter 10.1: Introduction

#### Chapter 10.1.1: Enabling end-to-end encryption

To secure sensitive target URLs and telemetry payloads, I implement application-level encryption for fields stored within PostgreSQL. Using Django's custom model fields, I encrypt data fields at rest using AES-256 (via the `cryptography` library) before they are written to the database. Decryption happens transparently upon model retrieval, meaning private endpoints or sensitive data are never exposed in plaintext to database administrators or logs, while preserving standard TLS/HTTPS for data in transit.

---

## Chapter 11: Tuning the model

### Chapter 11.1: Introduction

#### Chapter 11.1.1: Hyperparameter Tuning

To optimize the SLA prediction accuracy of my PyTorch neural network, I implement a hyperparameter tuning pipeline. Using scikit-learn's grid search combined with cross-validation, the training script evaluates various hidden layer configurations, learning rates, and optimizer choices (like Adam vs. SGD). Once the optimal combination is found, the pipeline saves the best-performing model utilizing the `skops` library. This ensures that tenant SLA forecasts adapt dynamically to changing traffic patterns with minimal prediction error.

---

## Chapter 12: Collecting unstructured data

### Chapter 12.1: Introduction

#### Chapter 12.1.1: Implementing LLMs for data enrichment and user queries

Telemetry tells us _what_ is failing, but unstructured user complaints tell us _how_ users are affected. To process this qualitative feedback, I built an AI enrichment pipeline utilizing LangChain, LangGraph, and Google Gemini:

1. **Complaint Ingestion**: Users submit natural-language complaints alongside browser context details.
2. **AI Agent Processing**: The backend routes these to a LangChain ReAct agent configured in `llm_agent.py`. The agent utilizes Gemini (`ChatGoogleGenerativeAI`) to parse the complaint, compare it against recent telemetry context, and determine potential root causes.
3. **Broker Dispatch**: The agent calls a custom tool (`send_issue_to_redpanda`) that publishes the enriched, structured JSON analysis to a `user-issues` topic on Redpanda.
4. **Async Consumption**: The background worker consumes messages from `user-issues`, updates the database record with the AI's diagnostic analysis, and logs the incident details, completing the asynchronous data collection loop.

---

## Chapter 13: Enhancing data with threat intelligence

### Chapter 13.1: Introduction

#### Chapter 13.1.1: Connecting to threat intelligence sources

To detect malicious traffic patterns and understand regional threat profiles, I establish API integrations with Google Analytics (GA4) and Microsoft Clarity. By securely authenticating with their respective APIs, the backend gathers rich geolocation access details, browser telemetry, and request metadata. This information is ingested into a dedicated data pipeline and fed directly into a PyTorch threat prediction neural network model (`ThreatPredictor`). The model processes access features—such as regional traffic spikes and suspicious request weights—to forecast geographical anomaly probability and compute an access threat score. This allows the system to actively flag anomalous traffic contributions directly on the tenant status pages, protecting the platform from adversarial telemetry and service exploitation.

---

## Chapter 14: Scaling reporting and announcements with Sanity

### Chapter 14.1: Introduction

#### Chapter 14.1.1: Structuring content delivery and CDN integration

To scale status communications without putting stress on our production databases or application servers, I leverage Sanity.io as a headless CMS with an edge-cached Content Delivery Network (API CDN).

In this chapter, I outline the process of decoupling administrative content management from the telemetry data pipeline:

1. **Structured Content Schema**: Inside `studio/`, we define structured document types like `announcement` with key attributes: `title`, `body`, `publishedAt`, and `severity` (info, warning, critical).
2. **Edge-Cached Delivery**: When querying announcements on the frontend, we instantiate the Sanity client with `useCdn: true`. This directs requests to Sanity's globally distributed API CDN, resulting in sub-millisecond response times for end-users.
3. **Reactive Binding**: The Angular service (`sanity.service.ts`) fetches content using GROQ queries and pipes the results directly into Angular Signals. The frontend layout listens to these signal changes to instantly render alert banners without blocking telemetry charts or triggering database operations on Django.

This architecture teaches the reader how to keep public status communications highly available, even during severe infrastructure outages that might otherwise take down the core telemetry system.

---

## My Notes on Deployment & Release

Throughout this book's draft, we build a platform fully optimized and ready for production release. I've configured the final deployment on Railway across three integrated services:

1. **Web Frontend**: A highly interactive, accessibly-compliant (a11y) Angular application featuring responsive status cards, telemetry charts, and a standalone public status dashboard.
2. **Web Backend**: A robust Django Ninja API coordinating authentication, CORS handling, data persistence, and threat detection.
3. **Telemetry Worker**: An asynchronous background consumer processing Redpanda message streams and executing PyTorch ML model pipelines for SLA forecasting.

### Acknowledgements & Technologies

I want to acknowledge the incredible open-source tools, platforms, and AI assistants that power my book's architecture:

- **Frontend**: [Angular](https://angular.dev), [Prettier](https://prettier.io), [ESLint](https://eslint.org)
- **Backend & APIs**: [Django](https://www.djangoproject.com) ([Django Ninja](https://django-ninja.rest-framework.com)), [Gunicorn](https://gunicorn.org), [NGINX](https://nginx.org)
- **Data & Broker**: [PostgreSQL](https://www.postgresql.org), [Redpanda](https://redpanda.com), [Polars](https://pola.rs)
- **Machine Learning & AI**: [PyTorch](https://pytorch.org), [Scikit-learn](https://scikit-learn.org), [Skops](https://skops.readthedocs.io), [LangChain](https://www.langchain.com), [LangGraph](https://langchain-ai.github.io/langgraph/), [Google Gemini](https://ai.google.dev), [Antigravity AI Agent (Google DeepMind)](https://deepmind.google)
- **Observability, Security & CMS**: [Sentry](https://sentry.io), [Snyk](https://snyk.io), [FOSSA](https://fossa.com), [Sanity.io](https://www.sanity.io), [AbuseIPDB](https://www.abuseipdb.com), [ipify](https://www.ipify.org)
- **DevOps, Infrastructure & Tooling**: [Docker](https://www.docker.com), [Railway](https://railway.app), [pre-commit](https://pre-commit.com), [Ruff](https://docs.astral.sh/ruff)

For detailed configuration settings, environmental variables, scaling limits, and CI/CD triggers, please refer to my [RAILWAY.md](./RAILWAY.md) file.

---

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/deml?referralCode=BpTk0g&utm_medium=integration&utm_source=template&utm_campaign=generic)

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning.svg?type=large&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning?ref=badge_large&issueType=license)

[![Snyk Code Analysis](https://img.shields.io/badge/Snyk_Code_Analysis-4C4A73?logo=snyk&logoColor=fff)](https://app.snyk.io/project/1eba8b51-8dbc-43ca-8b86-538ec5dba983)
[![Snyk Frontend Dependency](https://img.shields.io/badge/Snyk_Frontend_Dependency-4C4A73?logo=snyk&logoColor=fff)](https://app.snyk.io/project/08528f62-334a-4457-bf84-39908c54bb4f)
[![Snyk Backend Dependency](https://img.shields.io/badge/Snyk_Backend_Dependency-4C4A73?logo=snyk&logoColor=fff)](https://app.snyk.io/project/370873a1-b3ad-4936-a8f7-cc23f27218ab)
[![Snyk Frontend Docker](https://img.shields.io/badge/Snyk_Frontend_Docker-4C4A73?logo=snyk&logoColor=fff)](https://app.snyk.io/project/66612b26-a5a7-49a1-b8ff-9ae03d851d53)
[![Snyk Backend Docker](https://img.shields.io/badge/Snyk_Backend_Docker-4C4A73?logo=snyk&logoColor=fff)](https://app.snyk.io/project/877784eb-1281-46ac-899b-2fe163e8d00f)
[![Snyk Queue Docker](https://img.shields.io/badge/Snyk_Queue_Docker-4C4A73?logo=snyk&logoColor=fff)](https://app.snyk.io/project/a477f291-bd2e-4c0d-a376-9c8cc6d0cd19)

![GitHub contributors](https://img.shields.io/github/contributors/dataengineeringformachinelearning/dataengineeringformachinelearning)
![GitHub Repo stars](https://img.shields.io/github/stars/dataengineeringformachinelearning/dataengineeringformachinelearning?style=social)
![GitHub forks](https://img.shields.io/github/forks/dataengineeringformachinelearning/dataengineeringformachinelearning?style=social)
![GitHub issues](https://img.shields.io/github/issues/dataengineeringformachinelearning/dataengineeringformachinelearning)
![GitHub license](https://img.shields.io/github/license/dataengineeringformachinelearning/dataengineeringformachinelearning)
