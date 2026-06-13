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

**Terminal 3 (SLA Worker):**
Open a new terminal window, navigate to the `backend` directory, activate the virtual environment, and start the SLA worker. This worker consumes trigger messages from Redpanda and runs PyTorch training runs in a decoupled process to calculate SLA forecasts.

```bash
cd backend
source .venv/bin/activate
python manage.py sla_worker
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
