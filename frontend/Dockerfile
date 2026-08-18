# =============================================================================
# ASATECH Frontend Dockerfile
# Multi-stage build: Vite build → static files served by Nginx
# =============================================================================

# ─── Stage 1: build ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first so this layer is cached
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy sources
COPY index.html vite.config.ts tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/

# Vite reads env vars at build time. Passed in via docker-compose build args.
ARG VITE_API_BASE_URL
ARG VITE_PAYSTACK_PUBLIC_KEY
ARG VITE_APP_MODE=production
ARG VITE_APP_NAME=ASATECH

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PAYSTACK_PUBLIC_KEY=$VITE_PAYSTACK_PUBLIC_KEY
ENV VITE_APP_MODE=$VITE_APP_MODE
ENV VITE_APP_NAME=$VITE_APP_NAME

RUN npm run build

# ─── Stage 2: serve ────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Custom nginx config: SPA fallback + gzip + security headers
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers (frontend layer)
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Static asset caching (Vite hashes filenames)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location /images/ {
        expires 30d;
        add_header Cache-Control "public";
    }

    # Never cache index.html (so new deploys are picked up)
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # SPA fallback — all routes go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
