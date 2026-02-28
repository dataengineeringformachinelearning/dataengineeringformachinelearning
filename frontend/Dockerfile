# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for caching
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build -- --configuration production

# Production stage – use unprivileged for better security
FROM nginxinc/nginx-unprivileged:alpine

# Temporarily switch to root to clean defaults
USER root
RUN rm -rf /usr/share/nginx/html/*

# Back to non-root user
USER 101

# Copy built files (adjust if your Angular output has /browser subdir)
COPY --from=builder --chown=101:101 /app/dist/dataengineeringformachinelearning /usr/share/nginx/html

# Copy your full nginx.conf (same as working app, or customized)
# Must be root-owned since conf.d is read-only for non-root in some cases
USER root
COPY nginx.conf /etc/nginx/conf.d/default.conf
USER 101

# Expose the port NGINX listens on (unprivileged → 8080)
EXPOSE 8080

# No need for dumb-init here (entrypoint handles signals well), but you can add if desired:
# ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]