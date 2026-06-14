# Quick Start Guide

This guide compiles instructions from across the workspace to help you run the development environment manually using split terminals in your preferred IDE (e.g., VSCode).

---

## 1. Start Backing Services (Docker)

Make sure Docker Desktop is open and running, then execute the following command from the repository root:

```bash
docker-compose up -d postgres redpanda
```

---

## 2. Start Django Backend Services

Open **4 separate split terminals** in your editor, navigate to `backend/`, activate the virtual environment, and run each command:

### Setup (First-time only)

If you haven't set up the Python virtual environment or applied migrations yet:

```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
```

### Tab A: Django API Server

```bash
cd backend
source .venv/bin/activate
python manage.py runserver
```

### Tab B: Telemetry Worker

_Required to consume telemetry events from Redpanda and save them to the database so your dashboard stats load._

```bash
cd backend
source .venv/bin/activate
python manage.py telemetry_worker
```

### Tab C: ML Worker

_Required to run PyTorch training runs in a decoupled process to calculate SLA and threat anomaly forecasts._

```bash
cd backend
source .venv/bin/activate
python manage.py ml_worker
```

### Tab D: Security Worker

```bash
cd backend
source .venv/bin/activate
python manage.py security_worker
```

---

## 3. Start Frontend Client (Angular)

In a new terminal window or split:

### Setup (First-time only)

```bash
cd frontend
cp .env.example .env  # Add your actual Firebase configurations here
npm install --legacy-peer-deps
```

### Run Server

```bash
cd frontend
npx dotenvx run -- npm start
```

The client will be hosted at `http://localhost:4200/`.

---

## 4. Start Sanity Studio (CMS)

In a new terminal window or split:

### Setup (First-time only)

```bash
cd studio
npm install
```

### Run Server

```bash
cd studio
npm run dev
```

The studio interface will be hosted at `http://localhost:3333/`.

---

## 5. Troubleshooting & Maintenance

### Resetting Python Environment

```bash
cd backend
deactivate
rm -rf .venv
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
```

### Resetting Frontend/Studio NPM Dependencies

If you encounter dependency issues or slow installs, reset the NPM tree:

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps
```
