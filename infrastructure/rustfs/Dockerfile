# Pin a known RustFS release for reproducible builds.
# Upgrade deliberately after reading https://github.com/rustfs/rustfs/releases
# and re-testing presigned GET/PUT + bucket lifecycle against export jobs.
FROM rustfs/rustfs:1.0.0-beta.8

# Official image runs as non-root rustfs (UID/GID 10001).
# Data path: mount a durable volume at /data (SNSD / single-node).
# S3 API: 9000  |  Console: 9001  |  Health: GET /health

LABEL org.opencontainers.image.title="deml-rustfs"
LABEL org.opencontainers.image.description="DEML report object store (RustFS S3-compatible)"
LABEL org.opencontainers.image.source="https://github.com/rustfs/rustfs"
