# Backend

This is the Django backend application for the Data Engineering for Machine Learning project.

## Prerequisites

For the most efficient local development experience, it is highly recommended to use [`uv`](https://github.com/astral-sh/uv), an extremely fast Python package and environment manager written in Rust.

Install `uv`:

```bash
brew install uv
```

## How to run locally

1. Navigate to the `backend` directory:

```bash
cd backend
```

2. Create a virtual environment using `uv` (nearly instant):

```bash
uv venv
```

3. Activate the Python virtual environment:

```bash
source .venv/bin/activate
```

4. Install the required dependencies using `uv` (significantly faster than standard pip):

```bash
uv pip install -r requirements.txt
```

5. Ensure your database migrations are applied:

```bash
python manage.py migrate
```

6. Start the underlying infrastructure (Redpanda/Kafka):

Because the telemetry pipeline relies on Redpanda, you must ensure it is running in the background. Open a terminal at the **root** of your project (not the backend folder) and start the containers:

```bash
docker-compose up -d redpanda postgres
```

7. Start the Django development server and background workers:

You will need **two separate terminal windows** (or tabs) for this step. Ensure the virtual environment is activated (`source .venv/bin/activate`) in both.

**Terminal 1 (API Server):**

```bash
python manage.py runserver
```

**Terminal 2 (Telemetry Worker):**
Open a new terminal window, navigate to the `backend` directory, activate the virtual environment, and start the worker. This worker is required to consume telemetry events from Redpanda and save them to the database so your dashboard stats load properly.

```bash
cd backend
source .venv/bin/activate
python manage.py telemetry_worker
```

**Terminal 3 (ML Worker):**
Open a new terminal window, navigate to the `backend` directory, activate the virtual environment, and start the ML worker. This worker consumes trigger messages from Redpanda and runs PyTorch training runs in a decoupled process to calculate SLA and threat anomaly forecasts.

```bash
cd backend
source .venv/bin/activate
python manage.py ml_worker
```

Once the server is running, your backend API will be accessible at `http://localhost:8000/`. You can test the healthcheck endpoint at `http://localhost:8000/api/health`.

### Troubleshooting Environment Issues

If you encounter any dependency conflicts or issues, recreating the environment with `uv` takes only seconds:

#### Deactivate the current environment if it's active

```bash
deactivate
```

#### Delete the virtual environment folder

```bash
rm -rf .venv
```

#### Recreate the virtual environment and install dependencies

```bash
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
```

### Upgrading Packages

To safely update your backend packages to their latest compatible versions quickly:

1. Make sure your virtual environment is activated.
2. Upgrade using `uv`:

```bash
uv pip install -r requirements.txt --upgrade
```

### Creating a User

To create a user (e.g., to log into the application and manage Status Pages), you can use Django's built-in `createsuperuser` command:

```bash
python manage.py createsuperuser
```

Follow the prompts to enter your username, email, and password. You can then use these credentials to log in to the frontend.

## Threat Intelligence & IP Reputation

The backend features a threat intelligence synchronization tool that collects analytics session metrics and analyzes IP reputation against third-party databases.

### Execution

To run the threat intelligence sync command:

```bash
python manage.py fetch_threat_intel
```

### Configuration

You can configure real-time reputation lookups and automated threat submissions by setting the following environment variables in your `backend/.env` file:

- `ABUSEIPDB_API_KEY`: API Key for checking IP abuse confidence scores from AbuseIPDB.
- `OTX_API_KEY`: API Key for checking threat intelligence indicators from AlienVault OTX.
- `CISA_TAXII_ENDPOINT`: Ingestion URL for routing STIX format reports directly to CISA AIS (TAXII protocol).
- `ISAC_API_KEY`: API authentication key for IT-ISAC/MS-ISAC threat sharing servers.

_Note: If these environment variables are not present, the sync utility and the threat sharing pipelines run in **Simulation/Sandbox Mode**, evaluating metrics locally and logging transaction flows without actual outbound transmission._
