# Builder stage
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code for collectstatic
COPY . .
RUN python manage.py collectstatic --noinput --clear

# Re-link python symlinks to /usr/bin/python3 (distroless python path)
RUN ln -sf /usr/bin/python3 /opt/venv/bin/python && \
    ln -sf /usr/bin/python3 /opt/venv/bin/python3

# Runtime stage
FROM gcr.io/distroless/python3-debian12

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH="/opt/venv/lib/python3.11/site-packages" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Copy virtual env and code from builder
COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /app /app

EXPOSE 8000

USER nonroot

ENTRYPOINT ["/opt/venv/bin/python", "start.py"]
