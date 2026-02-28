# Build stage
FROM node:22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy package files for better caching
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm install && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build --prod

# Production stage
FROM nginx:1.27-alpine

# Install security updates and remove unnecessary packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create nginx cache directories and set permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /var/run

# Copy built application from builder stage
COPY --from=builder --chown=nginx:nginx /app/dist/dataengineeringformachinelearning/browser /usr/share/nginx/html

# Verify Angular build files exist
RUN ls -la /usr/share/nginx/html/ && test -f /usr/share/nginx/html/index.html

# Remove default nginx configuration and copy our config
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 8080

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]