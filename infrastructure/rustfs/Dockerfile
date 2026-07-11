# Pin a known RustFS release for reproducible builds.
# Upgrade deliberately after reading https://github.com/rustfs/rustfs/releases
# and re-testing presigned GET/PUT + bucket lifecycle against export jobs.
FROM rustfs/rustfs:1.0.0-beta.8

# Root only long enough to chown Railway volume mounts, then entrypoint drops to UID 10001.
# nosemgrep: dockerfile.security.last-user-is-root.last-user-is-root
USER root
# Build context is the monorepo root (RAILWAY_DOCKERFILE_PATH).
COPY infrastructure/rustfs/entrypoint.sh /deml-rustfs-entrypoint.sh
RUN chmod 755 /deml-rustfs-entrypoint.sh

# Start as root so Railway volumes can be chowned, then drop to UID 10001 when possible.
ENTRYPOINT ["/deml-rustfs-entrypoint.sh"]
CMD ["/data"]

LABEL org.opencontainers.image.title="deml-rustfs"
LABEL org.opencontainers.image.description="DEML report object store (RustFS S3-compatible)"
LABEL org.opencontainers.image.source="https://github.com/rustfs/rustfs"
