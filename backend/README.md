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

6. Start the Django development server:

```bash
python manage.py runserver
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
