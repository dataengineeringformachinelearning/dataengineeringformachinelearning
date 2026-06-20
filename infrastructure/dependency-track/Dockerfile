# Multi-stage build to migrate Dependency-Track API into a Google Distroless environment
FROM dependencytrack/apiserver:4.10.1 AS builder

# Final stage: Google Distroless for maximum security (no shell, no package manager)
FROM gcr.io/distroless/java17-debian11:nonroot

# Copy the entire dependency-track installation from the builder
COPY --from=builder /opt/owasp/dependency-track /opt/owasp/dependency-track
COPY --from=builder /data /data

WORKDIR /opt/owasp/dependency-track

# Environment variables
ENV HOME=/opt/owasp/dependency-track

# Run the API server
USER nonroot
ENTRYPOINT ["java", "-jar", "dependency-track-apiserver.jar"]
