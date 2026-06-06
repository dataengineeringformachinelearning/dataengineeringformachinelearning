FROM python:3.14-slim

# Prevent Python from writing pyc files and buffer output
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install system dependencies (required for PostgreSQL/psycopg2)
RUN apt-get update && apt-get install -y \
    libpq-dev gcc g++ python3-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project code
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput --clear

# Expose port
EXPOSE 8000

# Run migrations then start Gunicorn
CMD ["sh", "-c", "python manage.py migrate && gunicorn --bind 0.0.0.0:${PORT:-8000} config.wsgi:application --workers 3 --timeout 120"]