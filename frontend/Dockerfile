# Build stage
FROM node:24-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy package files for better caching
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm install --legacy-peer-deps && npm cache clean --force

# Copy source code
COPY . .

# Non-secret deploy URLs may be supplied at build time for set-env.js hostname fallbacks.
# Firebase and other secrets are injected at runtime via process.env (see server.ts).
ARG BACKEND_URL
ARG MARKETING_URL
ARG FRONTEND_URL

ENV BACKEND_URL=$BACKEND_URL \
    MARKETING_URL=$MARKETING_URL \
    FRONTEND_URL=$FRONTEND_URL

# Validate mobile responsiveness and mobile-first styles
RUN npm run check:mobile-first

# Build the application (set-env.js uses placeholders when secrets are absent)
RUN npm run build -- --configuration production

# Production stage (Secure Distroless Node.js)
FROM gcr.io/distroless/nodejs22-debian12

# Runtime env only — no secrets baked into image layers
ARG BACKEND_URL
ARG MARKETING_URL
ARG FRONTEND_URL

WORKDIR /app

# Copy built application from builder stage
COPY --chown=nonroot:nonroot --from=builder /app/dist/frontend /app/dist/frontend

# Public service URLs + Firebase config are read from process.env at request time
ENV PORT=4000 \
    BACKEND_URL=$BACKEND_URL \
    MARKETING_URL=$MARKETING_URL \
    FRONTEND_URL=$FRONTEND_URL

EXPOSE 4000

USER nonroot

# Run the Angular SSR server (serves /assets/firebase-config.js from runtime env)
CMD ["dist/frontend/server/server.mjs"]
