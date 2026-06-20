# Builder stage
FROM python:3.11-slim-bookworm AS builder

WORKDIR /app

# Install dependencies for downloading the binary
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*

# Download osv-scanner binary (using a stable version or latest)
RUN curl -L https://github.com/google/osv-scanner/releases/download/v1.7.4/osv-scanner_1.7.4_linux_amd64 -o /usr/local/bin/osv-scanner && \
    chmod +x /usr/local/bin/osv-scanner

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

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

# Copy virtual env, app, and binary from builder
COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /app /app
COPY --from=builder /usr/local/bin/osv-scanner /usr/local/bin/osv-scanner

# Expose port for the internal service
EXPOSE 8000

USER nonroot

ENTRYPOINT ["/opt/venv/bin/python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
