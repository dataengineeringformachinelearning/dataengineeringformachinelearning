# Stage 1: Downloader
FROM debian:bookworm-slim AS downloader

# Install dependencies for downloading and extracting
RUN apt-get update && \
    apt-get install -y --no-install-recommends wget tar ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Set Dragonfly version
ENV DRAGONFLY_VERSION=v1.39.0

# Download the Dragonfly binary for linux-amd64
# Extract the binary and rename it to 'dragonfly'
RUN wget -qO /tmp/dragonfly.tar.gz "https://github.com/dragonflydb/dragonfly/releases/download/${DRAGONFLY_VERSION}/dragonfly-x86_64.tar.gz" && \
    tar -xzf /tmp/dragonfly.tar.gz -C /usr/local/bin && \
    mv /usr/local/bin/dragonfly-x86_64 /usr/local/bin/dragonfly && \
    chmod +x /usr/local/bin/dragonfly

# Stage 2: Final Distroless Image
# Distroless cc contains libgcc1, libstdc++6, etc., needed for C++ binaries
FROM gcr.io/distroless/cc-debian12:nonroot

# Copy the binary from the downloader stage
COPY --from=downloader /usr/local/bin/dragonfly /usr/local/bin/dragonfly

# Expose default Dragonfly/Redis port
EXPOSE 6379

USER nonroot

# Set the entrypoint to the Dragonfly binary
ENTRYPOINT ["/usr/local/bin/dragonfly"]

# Run with standard arguments, binding to all interfaces
CMD ["--bind=0.0.0.0", "--port=6379"]
