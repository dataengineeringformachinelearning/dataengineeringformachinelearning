# Builder stage
FROM python:3.11-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ python3-dev cmake ninja-build libssl-dev git \
    && rm -rf /var/lib/apt/lists/*

# Build and install liboqs (C library) required by liboqs-python
RUN git clone --branch 0.15.0 --depth 1 https://github.com/open-quantum-safe/liboqs.git /tmp/liboqs && \
    cd /tmp/liboqs && \
    mkdir build && cd build && \
    cmake -GNinja -DOQS_USE_OPENSSL=ON -DBUILD_SHARED_LIBS=ON -DCMAKE_INSTALL_PREFIX=/opt/oqs .. && \
    ninja && ninja install

# Set environment variables for the compiler and runtime to find liboqs
ENV LD_LIBRARY_PATH="/opt/oqs/lib" \
    C_INCLUDE_PATH="/opt/oqs/include" \
    CPLUS_INCLUDE_PATH="/opt/oqs/include" \
    LIBRARY_PATH="/opt/oqs/lib"

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code for collectstatic
# Railway sets root directory to backend/; docker-compose uses context: ./backend
COPY . .
# Inline env for collectstatic only — never persist DATABASE_URL into the runtime image.
RUN DATABASE_URL=sqlite:////tmp/collectstatic.db \
    SECRET_KEY=collectstatic-build-only \
    DEBUG=false \
    python manage.py collectstatic --noinput --clear

# Re-link python symlinks to /usr/bin/python3 (distroless python path)
RUN ln -sf /usr/bin/python3 /opt/venv/bin/python && \
    ln -sf /usr/bin/python3 /opt/venv/bin/python3

# Runtime stage
FROM gcr.io/distroless/python3-debian12

# Copy the built liboqs shared libraries from the builder stage
COPY --from=builder /opt/oqs /opt/oqs

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH="/opt/venv/lib/python3.11/site-packages" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    LD_LIBRARY_PATH="/opt/oqs/lib"

WORKDIR /app

# Copy virtual env and code from builder
COPY --chown=65532:65532 --from=builder /opt/venv /opt/venv
COPY --chown=65532:65532 --from=builder /app /app

EXPOSE 8000

USER nonroot

ENTRYPOINT ["/opt/venv/bin/python", "start.py"]
