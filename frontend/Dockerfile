# ────────────────────────────────────────────────
# Stage 1: Build Angular (Node-based, throwaway)
# ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Cache layers: dependencies first
COPY package*.json ./
RUN npm ci

# Source code → build
COPY . .
RUN npm run build -- --configuration production

# ────────────────────────────────────────────────
# Stage 2: Production – secure, small, Railway-ready
# ────────────────────────────────────────────────
FROM nginxinc/nginx-unprivileged:alpine

# Temporarily root to clean defaults
USER root
RUN rm -rf /usr/share/nginx/html/*

# Back to non-root (nginx user = 101)
USER 101

# Copy built Angular files (adjust subdir if your dist has /browser)
COPY --from=builder --chown=101:101 /app/dist/dataengineeringformachinelearning /usr/share/nginx/html

# Copy custom config (listens on $PORT or 8080)
# Must be root for /etc/nginx/conf.d
USER root
COPY nginx.conf /etc/nginx/conf.d/default.conf
USER 101

# Railway expects EXPOSE on the dynamic port, but 8080 is fine as hint
EXPOSE 8080

# Default CMD from base image is correct (nginx -g daemon off;)