# Builder stage
FROM python:3.11-slim-bookworm AS builder

# Install git for fetching the module
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# Clone the actual python cpe-guesser from source
RUN git clone https://github.com/vulnerability-lookup/cpe-guesser.git .

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install requirements
RUN pip install --no-cache-dir -r REQUIREMENTS

# Change the default port to 1323 to match the rest of the application's configuration
RUN sed -i 's/port: 8000/port: 1323/' config/settings.yaml

# Production stage
FROM python:3.11-slim-bookworm

# Install redis-server (cpe-guesser uses Valkey/Redis to store its dictionary)
RUN apt-get update && apt-get install -y --no-install-recommends redis-server && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the venv and source
COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /src /app

# Set up environment
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH="/opt/venv/lib/python3.11/site-packages" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Expose API port
EXPOSE 1323

# Create a custom entrypoint script that starts Redis in the background, imports the dataset, and starts the web server.
RUN echo '#!/bin/bash\n\
set -e\n\
echo "Starting local Redis server for cpe-guesser..."\n\
redis-server --daemonize yes\n\
echo "Waiting for Redis to be ready..."\n\
sleep 2\n\
echo "Importing CPE dictionary to Redis (this may take a few minutes)..."\n\
python3 -u /app/bin/import.py\n\
echo "Starting CPE Guesser server on port 1323..."\n\
exec python3 -u /app/bin/server.py\n\
' > /app/start.sh && chmod +x /app/start.sh

# Create nonroot user and give it permissions to write to /app (required for Redis and import script)
RUN groupadd -r nonroot && useradd -r -g nonroot nonroot && chown -R nonroot:nonroot /app

# Run as nonroot for security compliance
USER nonroot

# Start the application
ENTRYPOINT ["/app/start.sh"]
