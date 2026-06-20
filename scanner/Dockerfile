FROM python:3.11-slim

WORKDIR /app

# Install dependencies for downloading the binary
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*

# Download osv-scanner binary (using a stable version or latest)
RUN curl -L https://github.com/google/osv-scanner/releases/download/v1.7.4/osv-scanner_1.7.4_linux_amd64 -o /usr/local/bin/osv-scanner && \
    chmod +x /usr/local/bin/osv-scanner

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port for the internal service
EXPOSE 8000

# Create a non-root user and switch to it
RUN useradd -m scanneruser
USER scanneruser

# The startup script should ideally download the OSV database if it doesn't exist in the persistent volume
# But since this is a microservice, we can just run the fastapi app and the app itself can download it if missing.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
