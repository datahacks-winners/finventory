# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build arguments for secrets
ARG VITE_UNSPLASH_ACCESS_KEY

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .

# Build with env vars
ENV VITE_UNSPLASH_ACCESS_KEY=$VITE_UNSPLASH_ACCESS_KEY
RUN npm run build

# Production stage - static file server
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA config - redirect all routes to index.html
RUN echo 'server { \
    listen 8080; \
    location / { \
        root /usr/share/nginx/html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1
