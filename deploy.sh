#!/bin/bash

echo "🚀 Deploying Singgah POS System to Production..."

# 1. Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running."
  exit 1
fi

# 2. Build and Start Services
echo "📦 Building and Starting Containers..."
docker compose -f docker-compose.prod.yml up -d --build

# 3. Status Check
echo "✅ Deployment Complete! Checking status..."
docker compose -f docker-compose.prod.yml ps

echo "🌐 Web Dashboard available at: http://localhost"
