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

### Chapter 1.3: Running the Full-Stack Application Locally

To run the complete system locally, you can spin up the entire application stack using a helper script, run it via Docker Compose, or run the backing services via Docker while executing the application services natively.

#### Option A: macOS One-Click Developer Startup Script (Recommended)

If you are running on macOS, you can use the interactive startup script at the root of the repository. It will spin up the Docker-based backing services (`postgres` and `redpanda`) and automatically launch a new Terminal window containing tabs for all other services (`runserver`, `telemetry_worker`, `ml_worker`, frontend `npm start`, and `studio dev`).

Run the script from the repository root:

```bash
./start_dev.sh
```

#### Option B: Running the Entire Stack via Docker Compose

Ensure Docker is installed and running, then execute the following command in the repository root:

```bash
docker-compose up --build
```

This starts all five services in the foreground:

- **PostgreSQL** database (port `5432`)
- **Redpanda** message broker (ports `19092`, `18082`, `19644`)
- **Django API Server** (port `8000`)
- **Telemetry Worker** (processes incoming Redpanda events)
- **ML Worker** (handles asynchronous model training pipelines)

#### Option C: Running Services Individually (Natively)

If you prefer to run the application components locally for faster debugging or development reload:

1. **Start backing services (PostgreSQL & Redpanda) via Docker**:

   ```bash
   docker-compose up -d postgres redpanda
   ```

2. **Configure environment variables**:
   Create a `.env` file in the `backend/` directory by copying the example template:

   ```bash
   cp backend/.env.example backend/.env
   ```

   _Note:_ In your local `.env`, change `DATABASE_URL` to `postgres://admin:password@localhost:5432/machinelearning` to point Django to the Docker-managed PostgreSQL database.

   Likewise, configure the frontend's environment variables inside the `frontend/` directory:

   ```bash
   cp frontend/.env.example frontend/.env
   ```

3. **Initialize the Django Backend**:
   Activate your virtual environment, install the dependencies, run database migrations, and create an admin user:

   ```bash
   cd backend
   source .venv/bin/activate
   uv pip install -r requirements.txt
   python manage.py migrate
   python manage.py createsuperuser
   ```

4. **Start the backend development servers (requires separate terminal tabs/windows)**:
   - **Django API Server**:
     ```bash
     python manage.py runserver
     ```
   - **Telemetry Worker**:
     ```bash
     python manage.py telemetry_worker
     ```
   - **ML Worker**:
     ```bash
     python manage.py ml_worker
     ```

5. **Start the Angular Frontend**:

   ```bash
   cd frontend
   npm install --legacy-peer-deps
   npx dotenvx run -- npm start
   ```

   The frontend application will be served at `http://localhost:4200/`.

6. **Start Sanity Studio (Headless CMS)**:
   ```bash
   cd studio
   npm install
   npm run dev
   ```
   Sanity Studio will be served at `http://localhost:3333/`.

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

To structure this properly, I scaffold a new Django app called `ml`:

```bash
python manage.py startapp ml
```

Instead of running an intensive training loop synchronously on the web server (which would block the event loop), I outline a basic multi-layer perceptron using PyTorch's `nn.Module`. Here is my draft of how to structure this view, which will load historical health metrics to predict SLA adherence:

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
    # Fetch historical data and convert to tensors
    endpoints = Endpoints.objects.all()
    # ... prepare X and Y tensors from endpoint data ...

    # Initialize the model and a simple MSE loss function
    model = SLAModel()
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

#### Chapter 7.1.1: Implementing Firebase Authentication

Because training machine learning models is computationally expensive, I want to show the reader how to secure these endpoints. Instead of relying purely on local session cookies, we offload user credential verification to **Firebase Authentication** on the client, and verify Firebase ID tokens on the backend via custom Django middleware.

On the frontend, I manage user sessions and state via the Firebase SDK, tracking authentication states in an Angular service. I use Angular Signals to expose this state reactively to the application:

```typescript
// frontend/src/app/services/auth.service.ts
import { Injectable, signal } from "@angular/core";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";

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
        // Sync with Django backend
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

I can then inject this service into my UI components to show/hide or enable/disable sensitive actions:

```html
<button (click)="trainModel()" [disabled]="!authService.isAuthenticated()">
  Train SLA Model
</button>
```

#### Chapter 7.1.2: Backend Token Verification Middleware

On the backend, we intercept API calls using a custom Django middleware (`FirebaseAuthenticationMiddleware`). The middleware extracts the Bearer token from the `Authorization` header, verifies it using `firebase_admin.auth.verify_id_token()`, and binds or registers a corresponding local Django user:

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
            uid = decoded_token.get("uid")
            email = decoded_token.get("email")

            user, created = User.objects.get_or_create(username=uid)
            if created:
                user.email = email or ""
                user.set_unusable_password()
                user.save()

            request.user = user
            request.firebase_token = decoded_token
        except Exception:
            pass
        return None
```

#### Chapter 7.1.3: Multi-Factor Authentication (MFA) with SMS

To comply with SOC2 security standards, we provide Multi-Factor Authentication (MFA). Utilizing the Firebase Auth Phone Multi-Factor Provider, we verify a user's phone number via SMS using an invisible reCAPTCHA:

```typescript
// frontend/src/app/services/auth.service.ts
import { PhoneAuthProvider, PhoneMultiFactorGenerator, multiFactor } from "firebase/auth";

async sendMfaEnrollmentCode(phoneNumber: string, recaptchaVerifier: any): Promise<string> {
  if (!this.auth?.currentUser) throw new Error("No user is currently logged in.");
  const session = await multiFactor(this.auth.currentUser).getSession();
  const phoneInfoOptions = { phoneNumber, session };
  const phoneAuthProvider = new PhoneAuthProvider(this.auth);
  return await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);
}

async confirmMfaEnrollment(verificationId: string, verificationCode: string): Promise<void> {
  if (!this.auth?.currentUser) throw new Error("No user is currently logged in.");
  const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
  const assertion = PhoneMultiFactorGenerator.assertion(cred);
  await multiFactor(this.auth.currentUser).enroll(assertion, "SMS Phone MFA");
}
```

#### Chapter 7.1.4: Troubleshooting Link Account Exceptions

When attempting to connect or link a third-party identity provider (like Google or Apple) to an existing email/password account, you may encounter the `auth/credential-already-in-use` Firebase exception. This happens because the target OAuth credential is already bound to a separate, existing user profile in the Firebase project (e.g. if the user previously clicked "Sign In with Google" directly, creating an implicit user account).

To resolve this issue, you must disassociate the third-party credential from the secondary profile:

1. Log out of the primary account.
2. Sign in using the target third-party provider (e.g., Google Sign-In) to access the secondary account.
3. Access the **Danger Zone** settings and delete this secondary account permanently to release the credential.
4. Log out and sign back in to the primary email/password account.
5. Perform the linking action again to successfully connect the provider.

#### Chapter 7.1.5: Shielding API Endpoints with Firebase App Check

To achieve the highest level of security and prevent API abuse, data scraping, and billing spikes, the platform integrates **Firebase App Check** with the **reCAPTCHA Enterprise** provider. This ensures that only requests originating from our verified web application are permitted to access Firestore, Cloud Storage, and custom backend services.

##### Client-Side Integration (Angular)

We initialize App Check during the application configuration phase. Using `provideAppCheck()` from the `@angular/fire` SDK, we set up the `ReCaptchaEnterpriseProvider` with our public reCAPTCHA Enterprise site key. Under the hood, this dynamically requests attestation tokens from Google's reCAPTCHA service to verify the integrity of the client session:

```typescript
// frontend/src/app/app.config.ts
import {
  provideAppCheck,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "@angular/fire/app-check";

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppCheck(() => {
      // Use the ReCaptchaEnterpriseProvider for advanced risk analysis and bot mitigation
      const provider = new ReCaptchaEnterpriseProvider(
        "<YOUR_RECAPTCHA_ENTERPRISE_SITE_KEY>",
      );
      return initializeAppCheck(getApp(), {
        provider,
        isTokenAutoRefreshEnabled: true,
      });
    }),
  ],
};
```

##### Backend App Check Token Verification (Python)

To secure custom backend endpoints, all incoming client requests include the `X-Firebase-App-Check` header. Our server-side authentication middleware parses and verifies this token using the Firebase Admin SDK. Requests carrying invalid, expired, or missing App Check tokens are immediately rejected with a `401 Unauthorized` or `403 Forbidden` status before any application logic or database queries execute:

```python
# backend/middleware/app_check.py
from firebase_admin import app_check
from flask import request, jsonify

def verify_app_check_token():
    app_check_token = request.headers.get('X-Firebase-App-Check')
    if not app_check_token:
        return jsonify({"error": "Missing App Check token"}), 401

    try:
        # Verify the authenticity and expiration of the App Check token
        decoded_token = app_check.verify_token(app_check_token)
        # Proceed with request handling
        request.app_check_claims = decoded_token
    except Exception as e:
        return jsonify({"error": "Invalid App Check token", "details": str(e)}), 403
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

#### Chapter 8.1.3: Continuous Security Auditing with Semgrep

I want to emphasize security by design. To do this, I integrated Semgrep to automate vulnerability checks throughout the development lifecycle:

- **Static Analysis (SAST)**: I run Semgrep scans to find logic and security issues in my custom source code.
- **Dependency & Container Auditing**: Semgrep inspects manifest files and Dockerfiles across my services (`frontend`, `backend`, and `queue`) to detect configuration and vulnerability issues.

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

## Chapter 10: Encrypting the data & Key Management

### Chapter 10.1: Introduction

#### Chapter 10.1.1: Enabling end-to-end encryption & GCP KMS Integration

To secure sensitive target URLs, microservice status metrics, and telemetry payloads, I implement full end-to-end (E2E) encryption. In transit, all data flowing between user browsers, the Django web server, and telemetry workers is encrypted using TLS 1.3. Furthermore, integrated third-party credentials (such as Google Analytics 4 OAuth tokens and Microsoft Clarity API keys) are secured at-rest in our PostgreSQL/SQLite database. Using Django's model lifecycle hooks and the `cryptography` library, I transparently encrypt these credentials at-rest using AES-256 via dynamic Data Encryption Keys (DEKs). Instead of local key storage, these DEKs are envelope-encrypted using a remote Key Encrypting Key (KEK) on Google Cloud Key Management Service (KMS) with automated 90-day rotation, falling back safely to local KEK derivation for local offline development. Decryption happens transparently upon model retrieval, ensuring that administrative secrets and tenant tokens are never exposed in plaintext to database administrators, logs, or unauthenticated public users. Additionally, public access to individual status pages, services, incidents, and threat telemetry is strictly isolated. Unless the status page owner explicitly approves and publishes their page, the API rejects all public requests, guaranteeing absolute privacy.

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

To detect malicious traffic patterns and understand regional threat profiles, I establish API integrations with Google Analytics (GA4) and Microsoft Clarity. By securely authenticating with their respective APIs, the backend gathers rich geolocation access details, browser telemetry, and request metadata. This information is ingested into a dedicated data pipeline and fed directly into a PyTorch threat prediction neural network model (`ThreatModel`). The model processes access features—such as regional traffic spikes and suspicious request weights—to forecast geographical anomaly probability and compute an access threat score. This allows the system to actively flag anomalous traffic contributions directly on the tenant status pages, protecting the platform from adversarial telemetry and service exploitation.

This integration with Google Analytics and Microsoft Clarity serves as a critical third-party analytics telemetry step. In the roadmap, this setup serves as a precursor to designing and deploying a custom first-party client-side script and dynamic threat widget that tenants can embed directly on their own websites to collect raw security-focused telemetry natively. In addition to first-party GA4/Clarity integrations, I enrich raw session telemetry by visitor IP reputation databases. I incorporate checks against:

- **AbuseIPDB**: To query crowd-sourced abuse reports and retrieve abuse confidence percentages.
- **AlienVault OTX (Open Threat Exchange)**: To query threat pulse records and active botnet/malicious indicators.

We also support automated STIX 2.1 threat sharing to federal databases and industry ISACs via:

- **CISA TAXII Ingestion Server**: Controlled via `CISA_TAXII_ENDPOINT`.
- **ISAC Sharing Hubs**: Controlled via `ISAC_API_KEY`.

For local development and book reader environments, the system operates in a dual mode. If real credentials are provided via environment variables (`ABUSEIPDB_API_KEY`, `OTX_API_KEY`, `CISA_TAXII_ENDPOINT`, and `ISAC_API_KEY`), the synchronization and reporting pipelines make live API calls. If these keys are absent, the ingestion and submission utilities fall back to a safe **Simulation / Sandbox Mode** for local testing.

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

## Chapter 15: Integrating Newsletter Subscriptions with PostgreSQL & Resend

### Chapter 15.1: Introduction

#### Chapter 15.1.1: Storing Subscriptions in PostgreSQL and Sending via Resend

To retain absolute flexibility over our customer datasets and prevent lock-in to authentication/auth providers (keeping Firebase strictly for credentials verification), we store subscription data in PostgreSQL on Railway and utilize Resend for dispatching emails.

1. **Database Schema**: We define a `NewsletterSubscription` model in `monitor/models.py` to store subscribers:
   ```python
   class NewsletterSubscription(models.Model):
       id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
       email = models.EmailField(unique=True)
       subscribed_at = models.DateTimeField(auto_now_add=True)
       consent_accepted = models.BooleanField(default=False)
   ```
2. **Subscription API**: The endpoint `POST /api/v1/telemetry/subscribe` validates client input (email format and mandatory terms and privacy consent) and saves the subscription to PostgreSQL.
3. **Resend Welcome Email**: Once saved, the endpoint triggers a welcome email via Resend:
   ```python
   # Send email via Resend
   send_resend_email(
       to_email=payload.email,
       subject="Welcome to Our Innovations Newsletter!",
       html_content="<h1>Thank you for subscribing!</h1><p>You have successfully signed up.</p>"
   )
   ```
4. **Environment Configuration**: Set your Resend API key in your `.env` file:
   ```env
   RESEND_API_KEY=re_your_api_key
   ```

---

## Chapter 16: Developer Workflow and Version Management

### Chapter 16.1: Introduction

#### Chapter 16.1.1: Release Automation and Version Propagation

To manage software lifecycles professionally, we automate branching, PR creation, and semantic release tagging using a Python CLI tool.

We utilize `scripts/git_flow.py` to coordinate these activities:

1. **Feature Development**: Create a clean, standardized branch prefix:
   ```bash
   python scripts/git_flow.py feature "user auth changes"
   ```
2. **Pull Requests**: Standardize commits and automatically push and generate GitHub PR URLs:
   ```bash
   python scripts/git_flow.py pr
   ```
3. **Semantic Release**: Bump local version files (across root, frontend, and backend components), regenerate environmental configurations, commit, and create signed Git tags:
   ```bash
   python scripts/git_flow.py release patch
   ```
4. **Historical Tagging**: Re-apply milestones to early codebase commits:
   ```bash
   python scripts/git_flow.py tag-history
   ```

#### Chapter 16.1.2: Troubleshooting SSH and Git Remote Mismatches

If your local Git environment gets disconnected from GitHub Desktop or fails to push changes:

1. **Check/Generate SSH Keys**:
   If SSH credentials are missing or failing to authenticate, generate a new secure SSH key:

   ```bash
   # Generate an Ed25519 SSH key
   ssh-keygen -t ed25519 -C "[EMAIL_ADDRESS]"

   # Start the agent and add the key
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519
   ```

   Add the public key (copied via `pbcopy < ~/.ssh/id_ed25519.pub`) to your [GitHub SSH Keys Settings](https://github.com/settings/keys).

2. **Add or Restore Git Remote**:
   If your remote settings are wiped out, re-link the upstream remote:

   ```bash
   git remote add origin git@github.com:dataengineeringformachinelearning/dataengineeringformachinelearning.git
   ```

3. **Synchronize Diverged Branch Histories**:
   If pushing fails due to conflicting/diverged commit histories on the same branch name:

   ```bash
   # Create a safety backup branch of your current local commits
   git checkout -b main-backup

   # Switch back to main and align it exactly with GitHub's remote status
   git checkout main
   git fetch origin
   git reset --hard origin/main

   # Cherry-pick your recent local changes back on top of the clean tree
   # (Replace -n with the number of your local commits to re-apply)
   git cherry-pick main-backup~4..main-backup

   # Push changes and reset tracking
   git push -u origin main
   ```

---

## Chapter 17: Accessibility Compliance Auditing

### Chapter 17.1: Introduction

#### Chapter 17.1.1: Automated Accessibility Checks with Axe-Core

To satisfy Section 508 and WCAG 2.1 AA requirements, we enforce accessibility checks directly in our local development cycle.

Using `scripts/run_axe.js`, we wrap `@axe-core/cli` to scan changed HTML templates:

```bash
node scripts/run_axe.js frontend/src/index.html
```

This script translates local files to absolute `file://` URLs, runs the Axe audit, and ignores non-applicable layout/meta rules (like missing main landmark or page titles when scanning partial templates). If violations are found, the script exits with code `1`, blocking commits via pre-commit hooks until fixed.

---

## Chapter 18: Client-Side Content Synchronization

### Chapter 18.1: Introduction

#### Chapter 18.1.1: Syncing README Documentation to Frontend Assets

To avoid writing documentation twice and keep our LLM context files in sync, we run an automated synchronization pipeline.

The script `scripts/sync_content.py` runs as a pre-commit hook or manually:

```bash
python scripts/sync_content.py
```

This pipeline extracts all book chapters (lines starting with `## Chapter`) from `README.md` and copies them to:

- `frontend/public/llms-full.txt` (a full context file for downstream AI tools)
- `frontend/src/assets/content/page.md` (rendered directly on the UI's homepage/notes tab)

It also ensures that version strings in `version.txt` are synced into both the frontend and backend build environments.

---

## Chapter 19: Third-Party Telemetry and Cloudflare Integration

### Chapter 19.1: Introduction

#### Chapter 19.1.1: Expanding Supported Telemetry Providers with Cloudflare Analytics

To provide tenants with comprehensive third-party telemetry, we integrated Cloudflare Web Analytics alongside our existing Google Analytics 4 and Microsoft Clarity providers.

1. **Database Schema & Encryption**: Added fields to support the Cloudflare API tokens, which are automatically encrypted at-rest using our existing AES-256 Fernet implementation.
2. **Backend API Endpoints**: Formulated views to securely save, update, and manage Cloudflare token credentials.
3. **Dynamic Script Injection**: Built a service that parses active settings and injects the corresponding Cloudflare Web Analytics JS beacon to track platform visits dynamically.

---

## Chapter 20: Team Workflows and Vulnerability Management

### Chapter 20.1: Introduction

#### Chapter 20.1.1: Integrated Vulnerability Tracking

To facilitate structured triaging and resolution of security concerns, the platform features a self-contained, integrated vulnerability tracking and management component.

1. **Kanban Board Workflows**: We created interactive Kanban board workflows to track vulnerability states, prioritize security concerns based on custom severity scores (Impact and Likelihood), and manage remediation efforts natively within the application.
2. **Pre-Commit Accessibility Scanning**: Configured `axe-core` accessibility checks within git pre-commit hooks to automatically validate changed HTML files for WCAG 2.1 AA compliance (e.g., heading hierarchy and ARIA roles).
3. **UI Enhancements**:
   - Developed a **Boneyard-inspired skeleton loader** providing sleek, pixel-perfect layout shimmers during asynchronous data fetching.
   - Refactored frontend and backend styling to present a luxurious, high-contrast **Porsche Jet Green Metallic-inspired color palette**, aligning status widgets, accordions, and typography for a premium, unified aesthetic.

---

## Chapter 21: Production Deployment and Release on Railway

### Chapter 21.1: Production Deployment Configuration

Throughout this book's draft, we build a platform fully optimized and ready for production release. I've configured the final deployment on Railway across three integrated services:

1. **Web Frontend**: A highly interactive, accessibly-compliant (a11y) Angular application featuring responsive status cards, telemetry charts, and a standalone public status dashboard.
2. **Web Backend**: A robust Django Ninja API coordinating authentication, CORS handling, and threat detection.
3. **Telemetry Worker**: An asynchronous background consumer processing Redpanda message streams and executing PyTorch ML model pipelines for SLA forecasting.

For detailed configuration settings, environmental variables, scaling limits, and CI/CD triggers, please refer to my [RAILWAY.md](./RAILWAY.md) file.

---

## Chapter 22: Enterprise Security, Compliance (CMMC 2.0 with SOC 2) & Secrets Management

### Chapter 22.1: Introduction

#### Chapter 22.1.1: Standardizing Enterprise Security for SOC 2 Type II and CMMC 2.0 Compliance

To transition our telemetry platform toward enterprise maturity, we implement standard SOC 2 Type II and CMMC 2.0 (Level 2) controls across our codebases, containers, and pipelines:

1. **Identity & Role-Based Access Control (RBAC)**: We replace insecure MFA mechanisms with Google SSO (Firebase Auth) supporting WebAuthn cryptographic keys. We enforce strict role configurations (`Viewer`, `Operator`, `Security Admin`) on both the backend decorators and the Angular user interface.
2. **Immutable SIEM Logging**: We integrate Python's `google-cloud-logging` client, streaming all administrative and security actions logged locally in PostgreSQL directly to centralized Google Cloud Logging buckets.
3. **Container Hardening (Chainguard)**: We migrate both frontend Nginx and backend Python runtime Docker images to distroless, shell-less `cgr.dev/chainguard` base images to minimize host attack surfaces.
4. **Vulnerability Firewalls & IaC checks**: We configure automated pre-commit hooks executing **Socket.dev** (scanning dependencies for supply-chain compromises) and **Checkov** (scanning Terraform infrastructure files for security misconfigurations).
5. **Secrets Management (Infisical)**: We delegate credentials orchestration to **Infisical**, utilizing the Infisical CLI for local development and native Railway automated secrets syncing in production.

### Chapter 21.2: Acknowledgements & Technologies

I want to acknowledge the incredible open-source tools, platforms, and AI assistants that power my book's architecture:

- **Frontend**: [Angular](https://angular.dev), [Prettier](https://prettier.io), [ESLint](https://eslint.org)
- **Backend & APIs**: [Django](https://www.djangoproject.com) ([Django Ninja](https://django-ninja.rest-framework.com)), [Gunicorn](https://gunicorn.org), [NGINX](https://nginx.org), [cryptography](https://cryptography.io)
- **Data & Broker**: [PostgreSQL](https://www.postgresql.org), [Redpanda](https://redpanda.com), [Polars](https://pola.rs)
- **Machine Learning & AI**: [PyTorch](https://pytorch.org), [Scikit-learn](https://scikit-learn.org), [Skops](https://skops.readthedocs.io), [LangChain](https://www.langchain.com), [LangGraph](https://langchain-ai.github.io/langgraph/), [Google Gemini](https://ai.google.dev), [Antigravity AI Agent (Google DeepMind)](https://deepmind.google)
- **Observability, Security & CMS**: [Sentry](https://sentry.io), [Semgrep](https://semgrep.dev), [FOSSA](https://fossa.com), [Sanity.io](https://www.sanity.io), [AbuseIPDB](https://www.abuseipdb.com), [ipify](https://www.ipify.org), [Google Analytics](https://analytics.google.com), [Microsoft Clarity](https://clarity.microsoft.com), [Cloudflare Web Analytics](https://cloudflare.com), [Resend](https://resend.com)
- **DevOps, Infrastructure & Tooling**: [Docker](https://www.docker.com), [Railway](https://railway.app), [pre-commit](https://pre-commit.com), [Ruff](https://docs.astral.sh/ruff)
- **Graphics & Icons**: "Data Quality" icon by vectorspoint from Noun Project (https://thenounproject.com/icon/data-quality-6448061/)

---

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/deml?referralCode=BpTk0g&utm_medium=integration&utm_source=template&utm_campaign=generic)

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning.svg?type=large&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning?ref=badge_large&issueType=license)

[![Semgrep SAST Scan](https://img.shields.io/badge/Semgrep_SAST_Scan-4C4A73?logo=semgrep&logoColor=fff)](https://semgrep.dev)

![GitHub contributors](https://img.shields.io/github/contributors/dataengineeringformachinelearning/dataengineeringformachinelearning)
![GitHub Repo stars](https://img.shields.io/github/stars/dataengineeringformachinelearning/dataengineeringformachinelearning?style=social)
![GitHub forks](https://img.shields.io/github/forks/dataengineeringformachinelearning/dataengineeringformachinelearning?style=social)
![GitHub issues](https://img.shields.io/github/issues/dataengineeringformachinelearning/dataengineeringformachinelearning)
![GitHub license](https://img.shields.io/github/license/dataengineeringformachinelearning/dataengineeringformachinelearning)
