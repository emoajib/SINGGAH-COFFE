# ========================================
# STAGE 1: Builder (Node.js build)
# ========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Vite API Base URL — defaults to empty, override via --build-arg
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Copy source code and build
COPY . .
RUN npm run build

# ========================================
# STAGE 2: Runner (Nginx)
# ========================================
FROM nginx:1.25-alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Use non-root user (nginx already runs as non-root in official image)
RUN chown -R nginx:nginx /usr/share/nginx/html
USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
