## Chapter 1: The Fresh Install & Environment Setup

When you're building a full-stack system—in our case, Angular on the frontend and Python (Django) on the backend—you need a rock-solid foundation. Let's start with a clean development environment.

### Frontend Setup

If you're on a Mac like me, I highly recommend utilizing the Apple ecosystem's package management tools. Open your terminal and install Homebrew:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

For Apple Silicon Macs, make sure to install Rosetta 2 to ensure compatibility with legacy binaries:

```bash
softwareupdate --install-rosetta
```

With Homebrew ready, let's get Node.js and the Angular CLI installed to kick off the frontend bootstrap process:

```bash
brew install node
npm install -g @angular/cli
```

Now, let's scaffold a new Angular project and fire up the development server:

```bash
ng new frontend
cd frontend
npm start
```

Visit `http://localhost:4200` to verify that the dev server is running. To enforce the styling and quality standards I want for this codebase early on, I configure ESLint and Prettier:

```bash
# Run ESLint to check for code issues
npm run lint

# Format the codebase with Prettier
npx prettier --write .
```

To prepare this frontend for production, we will containerize it using a multi-stage Dockerfile serving via NGINX:

```bash
docker build -t frontend-app .
docker run -p 8080:8080 frontend-app
```

### Backend Setup

Over on the backend, we're using Python and Django. On macOS, the absolute fastest and cleanest way I've found to manage Python versions and dependencies is [Astral uv](https://github.com/astral-sh/uv). Install it via Homebrew:

```bash
brew install uv
```

Once `uv` is installed, I use it to initialize my environment, install Django, and scaffold the backend:

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

Visit `http://127.0.0.1:8000` to make sure it's alive. Just like the frontend, we want to enforce professional formatting (Google Python Style Guide). I use Ruff for this:

```bash
# Run Ruff lint checks and auto-fix issues
uvx ruff check --fix .

# Auto-format Python files
uvx ruff format .
```

### Running the Full-Stack Application Locally

To run the complete system locally, you have a few options.

**Option A: macOS One-Click Developer Startup Script (Recommended)**
I wrote an interactive script that spins up the Docker-based backing services (PostgreSQL and Redpanda) and automatically launches a new Terminal with tabs for the frontend, backend, workers, and CMS.

```bash
./start_dev.sh
```

**Option B: Running the Entire Stack via Docker Compose**
If you prefer running everything in Docker:

```bash
docker-compose up --build
```

**Option C: Running Services Individually**
Sometimes you need to run things natively for easier debugging:

1. Start backing services: `docker-compose up -d postgres redpanda`
2. Configure your `.env` files (copy `.env.example` to `.env` in both `frontend/` and `backend/`).
3. Migrate and start Django:
   ```bash
   cd backend
   source .venv/bin/activate
   uv pip install -r requirements.txt
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver
   ```
4. In separate tabs, start the workers: `python manage.py telemetry_worker` and `python manage.py ml_worker`.
5. Start the frontend:
   ```bash
   cd frontend
   npm install --legacy-peer-deps
   npx dotenvx run -- npm start
   ```

---

## Chapter 2: Keeping the Codebase Clean

As the codebase grows, keeping quality standards high is a priority. I configure Prettier and ESLint for the frontend to prevent style drift:

```bash
npm install --save-dev prettier
ng add @angular-eslint/schematics
```

For rapid prototyping of TypeScript outside of Angular, I like to use `tsx`:

```bash
npm install --save-dev tsx
npx tsx --watch your-script.ts
```

### Automated Code Quality (Pre-commit)

To save time, I configured pre-commit hooks to automatically check and format Python files, frontend files, and YAML configurations before every commit. I execute them via `uvx`:

```bash
uvx pre-commit run --all-files
```

---

## Chapter 3: Building Interfaces and Integrating Data

A cornerstone of modern system design is decoupling the client and server. Let's integrate them through a simple REST API healthcheck.

First, I define the view in Django:

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

To allow Angular to talk to Django, I configure CORS:

```bash
pip install django-cors-headers
```

```python
# backend/config/settings.py
import os
from dotenv import load_dotenv

load_dotenv()
cors_origins = os.getenv('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = [o.strip() for o in cors_origins.split(',')] if cors_origins else []
```

Now, I configure Angular to call it using Signals to cleanly manage the reactive state:

```typescript
// frontend/src/app/app.config.ts
import { provideHttpClient, withFetch } from "@angular/common/http";
export const appConfig = { providers: [provideHttpClient(withFetch())] };
```

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

This pattern—exposing JSON, handling CORS, and consuming it reactively—is the heartbeat of our application.

---

## Chapter 4: Designing the Database

A robust database is essential for storing the historical telemetry needed to train our machine learning models. We're using PostgreSQL, and I recommend DBeaver to visualize the schema easily:

```bash
brew install --cask dbeaver-community
```

Let's evolve our healthcheck into a persisted data point. First, create a Django app:

```bash
python manage.py startapp monitor
```

Then, define a model to represent the healthcheck records:

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

Run migrations:

```bash
python manage.py makemigrations monitor
python manage.py migrate
```

Finally, update the view to log a record each time the endpoint is hit:

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

## Chapter 5: Visualizing Data

Once we have active telemetry streaming into PostgreSQL, the next logical step is visualization.

I create an endpoint to expose the data:

```python
# monitor/views.py
from django.http import JsonResponse
from .models import Endpoints

def get_all_endpoints(request):
    endpoints = list(Endpoints.objects.values())
    return JsonResponse(endpoints, safe=False)
```

On the frontend, I use `ag-charts` to build responsive, interactive charts:

```bash
npm install ag-charts-angular ag-charts-community
```

In the dashboard component, I fetch the telemetry data and bind it to the chart configuration:

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

---

## Chapter 6: Intelligence (Modeling and Training)

Now that we are tracking endpoint health data, we can start building models to predict system degradation. We're bringing in PyTorch and Polars for fast data manipulation:

```bash
pip install torch polars skops scikit-learn
python manage.py startapp ml
```

Instead of running an intensive training loop synchronously on the web server, I outline a basic multi-layer perceptron. We expose this model training via an API endpoint so it can be triggered asynchronously:

```python
# backend/ml/ml_api.py
import torch
import torch.nn as nn
from django.http import JsonResponse
from monitor.models import Endpoints

class SLAModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(3, 16)
        self.fc2 = nn.Linear(16, 1)

    def forward(self, x):
        return self.fc2(torch.relu(self.fc1(x)))

def train_model(request):
    endpoints = Endpoints.objects.all()
    # ... prepare X and Y tensors from endpoint data ...
    model = SLAModel()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

    optimizer.zero_grad()
    # loss = criterion(model(X), Y)
    # loss.backward()
    # optimizer.step()

    return JsonResponse({'status': 'training_initiated'})
```

---

## Chapter 7: Securing the Compute

Training machine learning models is computationally expensive, so we must secure these endpoints. We offload user credentials to **Firebase Authentication** on the client, and verify tokens on the backend.

On the frontend, we track authentication states in an Angular service:

```typescript
// frontend/src/app/services/auth.service.ts
import { Injectable, signal } from "@angular/core";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";

@Injectable({ providedIn: "root" })
export class AuthService {
  public isAuthenticated = signal<boolean>(false);
  public currentUserId = signal<number | null>(null);
  public auth: any;

  constructor() {
    const app = initializeApp(environment.firebase);
    this.auth = getAuth(app);
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        this.http
          .get("/api/v1/auth/user", {
            headers: { Authorization: `Bearer ${token}` },
          })
          .subscribe((res: any) => {
            this.isAuthenticated.set(res.status === "success");
            this.currentUserId.set(res.user_id);
          });
      } else {
        this.isAuthenticated.set(false);
        this.currentUserId.set(null);
      }
    });
  }
}
```

On the backend, we intercept calls using a custom Django middleware that verifies the token via the Firebase Admin SDK:

```python
# backend/config/middleware.py
from django.contrib.auth.models import AnonymousUser, User
from django.utils.deprecation import MiddlewareMixin
from firebase_admin import auth

class FirebaseAuthenticationMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.user = AnonymousUser()
        auth_header = request.META.get("HTTP_AUTHORIZATION")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]
        try:
            decoded_token = auth.verify_id_token(token)
            user, created = User.objects.get_or_create(username=decoded_token.get("uid"))
            request.user = user
        except Exception:
            pass
        return None
```

We also implement Multi-Factor Authentication (MFA) via SMS and shield our endpoints with **Firebase App Check** and reCAPTCHA Enterprise to block malicious bot traffic.

---

## Chapter 8: Enhancing Observability

To scale telemetry ingestion without blocking our main web server, I introduce **Redpanda**—a fast, lightweight Kafka alternative.

First, the Angular frontend catches exceptions and posts them to our ingest endpoint. On the backend, we write an async view using `django-ninja` and `aiokafka` that dispatches the event immediately:

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

A background worker subscribes to this topic, pulling messages and processing them with Polars. I also integrated Sentry for full-stack error tracking, and Semgrep to automate vulnerability checks.

---

## Chapter 9: Applying a Use-Case (The Status Page)

With telemetry streaming through Redpanda, let's build a practical use-case: a public status dashboard.

1. **Telemetry Processing**: The worker pulls healthcheck metrics from Redpanda and batches them via Polars.
2. **SLA Calculation**: Computes real-time SLA compliance.
3. **Incident Operations**: Operators log into our headless CMS (Sanity.io) to declare incidents. The Angular frontend listens via Signals to update alert banners in real-time.
4. **Historical Visualizations**: Telemetry is aggregated to render a 90-day interactive health graph.

---

## Chapter 10: Encrypting the Data & Key Management

We implement end-to-end encryption. In transit, everything is TLS 1.3. At-rest, API keys and credentials in PostgreSQL are encrypted via AES-256 Data Encryption Keys (DEKs). Instead of storing keys locally, we use Google Cloud KMS to envelope-encrypt and automatically rotate our keys every 90 days.

---

## Chapter 11: Tuning the Model

To ensure our PyTorch neural network stays accurate, we implement a hyperparameter tuning pipeline using scikit-learn's grid search and cross-validation. This finds the best learning rates and hidden layers, and saves the models via `skops` so tenant SLA forecasts adapt dynamically.

---

## Chapter 12: Collecting Unstructured Data

Telemetry tells us _what_ failed; unstructured feedback tells us _how_ it affected users. I built an AI enrichment pipeline utilizing LangChain, LangGraph, and Google Gemini.

The system routes natural-language complaints to an AI agent. The agent uses Gemini to parse the complaint, compares it against recent telemetry context, and determines a root cause. Finally, it publishes a structured JSON analysis back to Redpanda.

---

## Chapter 13: Enhancing Data with Threat Intelligence

To detect malicious traffic, we integrate APIs from Google Analytics 4, Microsoft Clarity, AbuseIPDB, and AlienVault OTX.

This data feeds directly into a PyTorch `ThreatModel` that calculates an access threat score. We also perform Active Network Reconnaissance (like ICMP ping latency and active port probing) locally to enrich the context and flag anomalous behavior.

---

## Chapter 14: Scaling Reporting and Announcements with Sanity

We use Sanity.io as a headless CMS with an edge-cached API CDN. This decouples our status communications from our backend database. Even if our primary infrastructure crashes, the edge-cached API CDN ensures that public status updates and banners load instantly for users.

---

## Chapter 15: Integrating Newsletter Subscriptions

To retain control over our customer data, we store newsletter subscriptions in our PostgreSQL database and dispatch emails via Resend.

```python
# Send email via Resend
send_resend_email(
    to_email=payload.email,
    subject="Welcome to Our Innovations Newsletter!",
    html_content="<h1>Thank you for subscribing!</h1>"
)
```

---

## Chapter 16: Developer Workflow and Version Management

We automate our branching, PR creation, and semantic release tagging using custom Python CLI tools (`scripts/git_flow.py`).

```bash
# Create a feature branch
python scripts/git_flow.py feature "user auth changes"

# Generate a PR
python scripts/git_flow.py pr

# Semantic versioning bump
python scripts/git_flow.py release patch
```

---

## Chapter 17: Accessibility Compliance Auditing

Accessibility matters. We use `scripts/run_axe.js` to wrap `@axe-core/cli` and scan HTML templates as part of our git pre-commit hooks, ensuring we meet WCAG 2.1 AA requirements before anything gets merged.

```bash
node scripts/run_axe.js frontend/src/index.html
```

---

## Chapter 18: Client-Side Content Synchronization

To keep our LLM context files and frontend documentation in perfect sync, we run an automated pipeline (`scripts/sync_content.py`) that extracts chapters from this README and pipes them straight into our Angular assets.

---

## Chapter 19: Third-Party Telemetry and Cloudflare Integration

We expanded our telemetry by adding Cloudflare Web Analytics. We securely store Cloudflare API tokens (encrypted at-rest) and dynamically inject the Cloudflare beacon into tenant pages to gather comprehensive traffic insights.

---

## Chapter 20: Team Workflows and Vulnerability Management

To resolve security concerns efficiently, we built an integrated Kanban board workflow. We also refined the UI, creating a Boneyard-inspired skeleton loader and a luxurious "Porsche Jet Green Metallic" color palette to give the application a truly premium feel.

---

## Chapter 21: Production Deployment on Railway

Throughout this book, we've built a platform ready for production release. We deploy the Web Frontend, Django API, and Telemetry Worker seamlessly on [Railway](https://railway.app/). Detailed scaling and CI/CD triggers are logged in the `RAILWAY.md` file.

---

## Chapter 22: Enterprise Security (SOC 2 & CMMC 2.0)

To transition this platform toward enterprise maturity, we implement strict controls:

1. Google SSO (Firebase Auth) with WebAuthn cryptographic keys.
2. Immutable SIEM Logging via Google Cloud Logging.
3. Hardened, distroless Docker images.
4. Continuous dependency scanning and linting via Socket.dev, Checkov, Trivy, and Renovate.
5. Delegated secret orchestration via **Infisical**.

---

## Chapter 23: Automation and Maintenance Schedules

Our platform is designed to be self-sufficient, relying on a combination of autonomous background workers and GitHub Actions to minimize maintenance overhead:

### Autonomous Application Workers

Our Django backend runs long-lived async workers that autonomously manage system health, security, and ML tasks natively:

- **Hourly:** The `security_worker` continuously fetches and updates threat intelligence data.
- **Daily:** The `ml_worker` automatically retrains all Machine Learning threat models and SLA forecasts based on fresh telemetry.
- **Every 30 Days:** The `security_worker` enforces compliance by cleaning up stale database telemetry and autonomously rotating the active Data Encryption Keys (DEK).

### GitHub Actions Workflows

We leverage GitHub Actions and external bots strictly for code-level audits, static analysis, and dependency maintenance:

- **Weekly:** Renovate Bot creates automated Pull Requests to update outdated packages and dependencies.
- **Monthly (30-Day Cycle):** Scheduled workflows run Semgrep security scans and verify dependency lockfiles (`npm audit` and `uv lock`).
- **Quarterly (90-Day Cycle):** We run frontend bundle performance audits and strict backend static analysis checks using `ruff`.

---

## Acknowledgements & Technologies

I want to acknowledge the incredible open-source tools, platforms, and AI assistants that power my book's architecture:

- **Frontend**: Angular, Prettier, ESLint
- **Backend & APIs**: Django (Django Ninja), Gunicorn, NGINX, cryptography
- **Data & Broker**: PostgreSQL, Redpanda, Polars
- **Machine Learning & AI**: PyTorch, Scikit-learn, Skops, LangChain, LangGraph, Google Gemini, Antigravity AI Agent (Google DeepMind)
- **Observability, Security & CMS**: Sentry, Semgrep, Renovate, FOSSA, Checkov, Trivy, Socket.dev, Gitleaks, detect-secrets, Sanity.io, AbuseIPDB, ipify, IPinfo, Google Analytics, Microsoft Clarity, Cloudflare Web Analytics, Resend
- **DevOps, Infrastructure & Tooling**: Docker, Railway, Infisical, pre-commit, Ruff, Django Migration Linter

---

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/deml?referralCode=BpTk0g&utm_medium=integration&utm_source=template&utm_campaign=generic)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning.svg?type=large&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning?ref=badge_large&issueType=license)
[![Semgrep SAST Scan](https://img.shields.io/badge/Semgrep_SAST_Scan-4C4A73?logo=semgrep&logoColor=fff)](https://semgrep.dev)

![GitHub contributors](https://img.shields.io/github/contributors/dataengineeringformachinelearning/dataengineeringformachinelearning)
![GitHub Repo stars](https://img.shields.io/github/stars/dataengineeringformachinelearning/dataengineeringformachinelearning?style=social)
![GitHub forks](https://img.shields.io/github/forks/dataengineeringformachinelearning/dataengineeringformachinelearning?style=social)
![GitHub issues](https://img.shields.io/github/issues/dataengineeringformachinelearning/dataengineeringformachinelearning)
![GitHub license](https://img.shields.io/github/license/dataengineeringformachinelearning/dataengineeringformachinelearning)
