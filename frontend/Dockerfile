# Build stage
FROM node:22-alpine AS builder

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

# Set build arguments for Firebase (supplied by Railway during build time)
ARG FIREBASE_API_KEY
ARG FIREBASE_AUTH_DOMAIN
ARG FIREBASE_PROJECT_ID
ARG FIREBASE_STORAGE_BUCKET
ARG FIREBASE_MESSAGING_SENDER_ID
ARG FIREBASE_APP_ID
ARG BACKEND_URL
ARG MARKETING_URL
ARG SANITY_PROJECT_ID
ARG SANITY_DATASET

ENV FIREBASE_API_KEY=$FIREBASE_API_KEY
ENV FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN
ENV FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
ENV FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET
ENV FIREBASE_MESSAGING_SENDER_ID=$FIREBASE_MESSAGING_SENDER_ID
ENV FIREBASE_APP_ID=$FIREBASE_APP_ID
ENV BACKEND_URL=$BACKEND_URL
ENV MARKETING_URL=$MARKETING_URL
ENV SANITY_PROJECT_ID=$SANITY_PROJECT_ID
ENV SANITY_DATASET=$SANITY_DATASET

# Validate mobile responsiveness and mobile-first styles
RUN npm run check:mobile-first

# Build the application
RUN npm run build --prod

# Generate firebase config at build time so we don't need a shell in the distroless image
RUN mkdir -p /app/dist/frontend/browser/assets && cat <<EOF > /app/dist/frontend/browser/assets/firebase-config.js
window.FIREBASE_CONFIG = {
  apiKey: "${FIREBASE_API_KEY:-PLACEHOLDER_API_KEY}",
  authDomain: "${FIREBASE_AUTH_DOMAIN:-demldotcom.firebaseapp.com}",
  projectId: "${FIREBASE_PROJECT_ID:-demldotcom}",
  storageBucket: "${FIREBASE_STORAGE_BUCKET:-demldotcom.firebasestorage.app}",
  messagingSenderId: "${FIREBASE_MESSAGING_SENDER_ID:-870072971206}",
  appId: "${FIREBASE_APP_ID:-1:870072971206:web:5231fde2822d750abfccc7}"
};
EOF

# Production stage (Secure Distroless Node.js)
FROM gcr.io/distroless/nodejs22-debian12

WORKDIR /app

# Copy built application from builder stage
COPY --chown=nonroot:nonroot --from=builder /app/dist/frontend /app/dist/frontend

# Expose port (Angular SSR default is 4000)
EXPOSE 4000
ENV PORT=4000

USER nonroot

# Run the Angular SSR server
CMD ["dist/frontend/server/server.mjs"]
