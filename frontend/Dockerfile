# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

# Production stage
FROM nginx:alpine

# Optional: security updates + minimal extras (like your other app)
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create/set up writable dirs (good habit, though not strictly needed for static serve)
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /var/run

# Copy built files – chown to nginx user
COPY --from=builder --chown=nginx:nginx /app/dist/dataengineeringformachinelearning /usr/share/nginx/html

# Verify files exist (helpful for debugging)
RUN ls -la /usr/share/nginx/html && test -f /usr/share/nginx/html/index.html

# Remove default config and copy yours
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose 8080 (matches your conf and Railway preference)
EXPOSE 8080

# Use dumb-init for clean shutdown (like your other app)
ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]