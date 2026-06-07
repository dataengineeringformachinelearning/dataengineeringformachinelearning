# Data Engineering for Machine Learning

Interactive steps, working notes, and AI annotation on the Data Engineering for Machine Learning book.

## Chapter 1: Setting up your environment

For this book, we will build a full-stack data engineering application using Angular for the frontend and Python (Django) for the backend.

### Chapter 1.1: Frontend Setup

If you are using a Mac, we highly recommend utilizing the Apple ecosystem's fantastic package management tools. Open your terminal and install Homebrew:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

For Apple Silicon Macs, ensure you install Rosetta 2 to allow compatibility with x86_64 binaries:

```bash
softwareupdate --install-rosetta
```

With Homebrew installed, you can easily install Node.js and the Angular CLI to get your frontend started:

```bash
brew install node
npm install -g @angular/cli
```

```bash
ng new frontend
cd frontend
npm start
```

Visit `http://localhost:4200` to verify your frontend is running.

To prepare for production, you can containerize the Angular application using a multi-stage Dockerfile that builds the app and serves it via NGINX. Create a `Dockerfile` and an `nginx.conf` in your frontend directory, then build and run it:

```bash
docker build -t frontend-app .
docker run -p 8080:8080 frontend-app
```

### Chapter 1.2: Backend Setup

For the backend, we will use Python and Django. On a Mac, the cleanest way to install Python and global Python tools like `pipx` is through Homebrew:

```bash
brew install python pipx
pipx ensurepath
```

Once installed, use `pipx` to securely install Django globally without conflicting with your system Python, then set up your environment:

```bash
pipx install django
mkdir backend && cd backend
python -m venv venv
source venv/bin/activate
pip install django
django-admin startproject config .
python manage.py runserver
```

Visit `http://127.0.0.1:8000` to verify your Django server is running.

Like the frontend, you should containerize your Django application using Docker. You will need to install production dependencies like `gunicorn`, `whitenoise`, and `psycopg2-binary`. Define a `Dockerfile` that collects static files and runs the server using Gunicorn.

## Chapter 2: Integrating Tools and Pre-requisites

As your project grows, maintaining code quality is crucial.

For the frontend, configure tools like Prettier and ESLint:

```bash
npm install --save-dev prettier
ng add @angular-eslint/schematics
```

For rapid prototyping of independent TypeScript services or middleware outside of Angular, you can use `tsx`:

```bash
npm install --save-dev tsx
npx tsx --watch your-script.ts
```

This acts as a lightweight way to spin up secondary services alongside your main Django application.

## Chapter 3: Interfaces and data integration

A common architecture for applications is to serve a frontend application and a separate backend API to serve data. In this chapter, we will review how to set up a backend API and how to integrate it with the frontend application.

### Chapter 3.1: Introduction

#### Chapter 3.1.1: Integrating fullstack endpoints

Integrations through RESTful APIs are a common way to build out fullstack applications. Let's create a simple healthcheck endpoint in our Django backend.

First, define the view and hook it into your URL routing:

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

To allow your Angular frontend to communicate with this Django backend, you need to configure CORS (Cross-Origin Resource Sharing).

```bash
pip install django-cors-headers
# Add 'corsheaders' to INSTALLED_APPS and its middleware to MIDDLEWARE
```

In your `settings.py`, you can use environment variables to define allowed origins so it works smoothly locally and in production:

```python
# backend/config/settings.py
import os
from dotenv import load_dotenv

load_dotenv()
cors_origins = os.getenv('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = [o.strip() for o in cors_origins.split(',')] if cors_origins else []
```

Now that the endpoint is responding, we need to enable Angular to call it. In modern Angular using standalone components, enable HTTP client functionality in your `app.config.ts`:

```typescript
// frontend/src/app/app.config.ts
import { provideHttpClient, withFetch } from "@angular/common/http";
export const appConfig = { providers: [provideHttpClient(withFetch())] };
```

You can then inject this into a component and use Angular Signals to cleanly manage the reactive state:

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

This pattern of exposing a backend JSON endpoint, configuring CORS via environment variables, and consuming it reactively on the frontend will be repeated throughout the rest of this book.

## Chapter 4: Database design

### Chapter 4.1: Introduction

#### Chapter 4.1.1: Setting up data schemas

A database is essential for storing the historical data needed to train machine learning models. We'll use PostgreSQL. To visualize and manage your databases easily, you can use a tool like DBeaver:

```bash
brew install --cask dbeaver-community
```

Let's turn the simple healthcheck from the previous chapter into a persisted data point for tracking application uptime. Creating this in Django is straightforward. First, create a new app:

```bash
python manage.py startapp monitor
# Add 'monitor' to INSTALLED_APPS in settings.py
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

Run your migrations to create the table:

```bash
python manage.py makemigrations monitor
python manage.py migrate
```

Finally, update your healthcheck view to save a record each time the endpoint is hit:

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

## Chapter 5: Visualizing data

### Chapter 5.1: Introduction

#### Chapter 5.1.1: Developing interface visualizations

Now that you have active data being stored in your database, the next step is to visualize it. Creating a visualization of application uptime or response times can provide valuable insights into the health of the application.

First, create a new Django endpoint to serve this data:

```python
# monitor/views.py
from django.http import JsonResponse
from .models import Endpoints

def get_all_endpoints(request):
    endpoints = list(Endpoints.objects.values())
    return JsonResponse(endpoints, safe=False)
```

Then, you can use powerful charting libraries like `ag-charts` to render this in Angular:

```bash
npm install ag-charts-angular ag-charts-community
```

In your dashboard component, you can fetch the data from your new API and bind it to a chart configuration. Here is a skeletal example of how you might set this up:

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

If you want to take this in a more analytical direction, you can explore `ag-grid` to display interactive data tables that support sorting and filtering out of the box.

## Chapter 6: Modeling and training

### Chapter 6.1: Introduction

#### Chapter 6.1.1: Setting up modeling and prediction

Now that we are tracking endpoint health data, we can use it to build a model that anticipates system degradation. We'll introduce PyTorch to build a simple neural network and Polars for fast data processing.

```bash
pip install torch polars skops scikit-learn
```

To integrate this properly, create a new Django app called `model` and add it to your `INSTALLED_APPS`:

```bash
python manage.py startapp model
```

Instead of running an intensive training loop synchronously on your main server, you can define a basic multi-layer perceptron using PyTorch's `nn.Module`. Here's a structural example of how you might hook this into a Django view, fetching historical health data to predict your SLA (Service Level Agreement):

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

By connecting these views to URL routing, the Angular frontend can trigger model training via API requests and fetch the latest prediction to visualize our expected system SLA.

## Chapter 7: Securing the compute

### Chapter 7.1: Introduction

#### Chapter 7.1.1: Implementing authentication

To prevent unauthorized users from triggering expensive backend operations (like model training), we should secure our UI and APIs.

On the frontend, you can manage user sessions by tracking a simple boolean state in an Angular service. Using Angular Signals makes this incredibly clean:

```typescript
// frontend/src/app/services/auth.service.ts
import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class AuthService {
  public isAuthenticated = signal<boolean>(false);
}
```

You can inject this service into your components to hide or disable sensitive actions:

```html
<button (click)="trainModel()" [disabled]="!authService.isAuthenticated()">
  Train SLA Model
</button>
```

On the backend, we can expose minimal endpoints that hook directly into Django's robust built-in authentication system. By authenticating a user via a JSON payload and returning session cookies, our Angular app can easily log users in and out.

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

To create your first user account so you can log in, simply generate a superuser from your backend directory:

```bash
python manage.py createsuperuser
```

## Chapter 8: Enhancing observability

### Chapter 8.1: Introduction

#### Chapter 8.1.1: Enabling data ingestion through pipelines

To scale our data ingestion, we can introduce a message broker like Redpanda, a lightweight, Java-free alternative to Kafka. This allows us to decouple our telemetry ingestion from our main application processes.

First, you'll need to capture errors or telemetry events from your frontend application. A good practice is to create a global error handler that catches exceptions and posts them to a dedicated endpoint, while saving them to `localStorage` if the user is offline.

```typescript
// Example frontend error payload submission
const errorPayload = {
  timestamp: new Date().toISOString(),
  message: error.message,
  context: { url: window.location.href },
};
this.http.post("/api/v1/telemetry/endpoints", errorPayload).subscribe();
```

On the backend, instead of processing this data synchronously, we can expose a fast, asynchronous endpoint that immediately pushes the incoming payload to a Redpanda topic. Using a framework like `django-ninja` paired with `aiokafka` keeps the HTTP operation entirely non-blocking.

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

Finally, a standalone background worker can subscribe to this `app-events` topic to process the messages in batches. By pulling records and parsing them directly into a Polars DataFrame, you can achieve high-performance processing before committing the data to your Postgres database. This pipeline ensures that heavy ingestion loads never impact your user-facing API performance.

## Chapter 9: Applying a use-case

### Chapter 9.1: Introduction

#### Chapter 9.1.1: Enabling the data pipeline for incident management

With historical telemetry successfully streaming through our Redpanda message broker, we can now apply it to a real-world use-case: a public status and incident management platform.

1. **Telemetry Parsing**: The async telemetry worker pulls raw health check events in batches, converting them to Polars DataFrames for efficient performance calculation.
2. **SLA Calculation**: Telemetry is processed to compute a cumulative Service Level Agreement (SLA) percentage for each service and status page based on real response times and status codes.
3. **Incident Operations**: When an outage occurs, authenticated users can log in, declare an active incident, and associate it with a specific status page. These incidents are dynamically rendered on the frontend using Angular Signals to notify end-users in real-time.
4. **Historical Uptime Visualizations**: Telemetry is aggregated into daily buckets to render a 90-day interactive uptime graph showing partial and major outages.

## Chapter 10: Encrypting the data

### Chapter 10.1: Introduction

#### Chapter 10.1.1: Enabling end to end encryption

## Chapter 11: Tuning the model

### Chapter 11.1: Introduction

#### Chapter 11.1.1: Hyperparameter Tuning

## Chapter 12: Collecting unstructured data

### Chapter 12.1: Introduction

#### Chapter 12.1.1: Implementing LLMs for data enrichment and user queries

Systems telemetry alone cannot capture qualitative user experiences. To process unstructured user complaints, we implement an AI-powered data enrichment pipeline utilizing LangChain, LangGraph, and Google Gemini:

1. **Unstructured Ingestion**: When a user encounters an issue, they submit a natural-language description along with their current browser context.
2. **AI Agent Processing**: The backend routes this to a LangChain ReAct agent configured in `llm_agent.py`. The agent utilizes Gemini (`ChatGoogleGenerativeAI`) to parse the complaint, compare it against recent telemetry context, and determine potential root causes.
3. **Broker Dispatch**: The agent calls a custom tool (`send_issue_to_redpanda`) that publishes the enriched, structured JSON analysis to the `user-issues` topic on Redpanda.
4. **Async Consumption**: The background telemetry worker consumes messages from `user-issues`, updates the database record with the AI's diagnostic analysis, and logs the incident details, completing the asynchronous data collection loop.

## Chapter 13: Enhancing data with threat intelligence

### Chapter 13.1: Introduction

#### Chapter 13.1.1: Connecting to threat intelligence sources

## Acknowledgements

This project is configured for deployment on Railway, spanning three distinct services:

1. **Web Frontend**: The Angular application running on a public URL (`https://dataengineeringformachinelearning.com`).
2. **Web Backend**: The Django API connected to Postgres (`https://backend.dataengineeringformachinelearning.com`).
3. **Telemetry Worker**: A background Redpanda consumer and worker process (`internal`).

For detailed configuration settings, environmental variables, scaling limits, and CI/CD triggers, please refer to the [RAILWAY.md](./RAILWAY.md) file.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/deml?referralCode=BpTk0g&utm_medium=integration&utm_source=template&utm_campaign=generic)

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning.svg?type=large&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning?ref=badge_large&issueType=license)
