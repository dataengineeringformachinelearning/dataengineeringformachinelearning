# Multi-stage build to migrate Dependency-Track Frontend into an unprivileged NGINX environment
FROM dependencytrack/frontend:4.10.0 AS builder

# Final stage: Unprivileged NGINX (runs as non-root user)
FROM nginxinc/nginx-unprivileged:alpine

# Copy the compiled HTML/JS/CSS assets from the official image
COPY --from=builder /usr/share/nginx/html /usr/share/nginx/html

# Expose standard port
EXPOSE 8080

USER 101
CMD ["nginx", "-g", "daemon off;"]
