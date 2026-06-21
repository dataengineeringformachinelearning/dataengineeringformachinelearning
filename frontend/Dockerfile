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

ENV FIREBASE_API_KEY=$FIREBASE_API_KEY
ENV FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN
ENV FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
ENV FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET
ENV FIREBASE_MESSAGING_SENDER_ID=$FIREBASE_MESSAGING_SENDER_ID
ENV FIREBASE_APP_ID=$FIREBASE_APP_ID

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

# Production stage (Google Distroless-like chainguard nginx)
FROM cgr.dev/chainguard/nginx:latest

# Copy built application from builder stage
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# Copy our custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 8080

USER nginx

CMD ["nginx", "-g", "daemon off;"]
