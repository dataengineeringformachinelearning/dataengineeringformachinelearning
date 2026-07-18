# CSR static build for optional Railway fallback. Primary host is Vercel (project: deml).
FROM node:24-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps && npm cache clean --force

COPY . .

ARG BACKEND_URL
ARG MARKETING_URL
ARG FRONTEND_URL
ARG FORJD_API_URL
ARG SUPABASE_URL

ENV BACKEND_URL=$BACKEND_URL \
    MARKETING_URL=$MARKETING_URL \
    FRONTEND_URL=$FRONTEND_URL \
    FORJD_API_URL=$FORJD_API_URL \
    SUPABASE_URL=$SUPABASE_URL

RUN npm run check:mobile-first
RUN npm run build -- --configuration production

# --- Static nginx ---
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# nginx image includes an unprivileged nginx user
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
