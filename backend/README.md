# Backend

This is the Django backend application for the Data Engineering for Machine Learning project.

## How to run locally

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Activate the Python virtual environment:
   ```bash
   source venv/bin/activate
   ```

3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Ensure your database migrations are applied:
   ```bash
   python manage.py migrate
   ```

5. Start the Django development server:
   ```bash
   python manage.py runserver
   ```

Once the server is running, your backend API will be accessible at `http://localhost:8000/`. You can test the healthcheck endpoint at `http://localhost:8000/api/health`.
