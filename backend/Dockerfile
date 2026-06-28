# Builder stage
FROM python:3.12-slim-bookworm AS builder

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

# Create virtual environment with copies (so the venv is portable without symlinks to the builder's python)
RUN python -m venv --copies /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code for collectstatic
# The three cross-site URLs are Railway runtime variables. We skip the strict
# validation here so collectstatic can succeed in the builder stage.
COPY . .
ENV SKIP_SITE_URL_VALIDATION=true
RUN python manage.py collectstatic --noinput --clear

# Stage Python 3.12 shared library (required for the --copies venv at runtime).
# python:3.12-slim-bookworm has it; the distroless cc base does not.
RUN mkdir -p /opt/python-lib && \
    cp /usr/local/lib/libpython3.12.so.1.0 /opt/python-lib/ && \
    cp -P /usr/local/lib/libpython3.12.so.1 /opt/python-lib/ 2>/dev/null || true

# Runtime stage
# Use cc-debian12 (minimal C runtime on Debian 12) because Distroless does not ship
# a python3.12-debian12 variant. We bring our own Python 3.12 from the builder.
FROM gcr.io/distroless/cc-debian12:nonroot

# Copy the built liboqs shared libraries
COPY --chown=65532:65532 --from=builder /opt/oqs /opt/oqs

# Bring the Python shared library that the venv's python is linked against.
COPY --from=builder /opt/python-lib/ /usr/local/lib/

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH="/opt/venv/lib/python3.12/site-packages" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    LD_LIBRARY_PATH="/usr/local/lib:/opt/oqs/lib"

WORKDIR /app

# Copy virtual env and code from builder
COPY --chown=65532:65532 --from=builder /opt/venv /opt/venv
COPY --chown=65532:65532 --from=builder /app /app

EXPOSE 8000

USER nonroot

ENTRYPOINT ["/opt/venv/bin/python", "start.py"]
