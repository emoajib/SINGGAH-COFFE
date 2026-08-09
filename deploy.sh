#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$PROJECT_DIR/deploy"

echo "📋 Deploy Singgah POS ke Server"
echo "================================"
echo ""
echo "Pastikan variabel environment berikut sudah di-set:"
echo "  export DEPLOY_HOST=sosiomen.com"
echo "  export DEPLOY_PATH=/home/username/singgah-pos"
echo "  export DEPLOY_USER=root"
echo "  export DEPLOY_PORT=22"
echo "  export SSH_KEY=~/.ssh/id_rsa"
echo ""

SERVER_HOST="${DEPLOY_HOST:?Error: DEPLOY_HOST belum di-set. Jalankan: export DEPLOY_HOST=your-server.com}"
SERVER_USER="${DEPLOY_USER:-root}"
SERVER_PORT="${DEPLOY_PORT:-22}"
SERVER_PATH="${DEPLOY_PATH:?Error: DEPLOY_PATH belum di-set. Jalankan: export DEPLOY_PATH=/home/username/singgah-pos}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"

mkdir -p "$DEPLOY_DIR/backend"

echo "📦 Step 1: Build Go backend (Linux binary)..."
cd "$PROJECT_DIR/backend"
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o "$DEPLOY_DIR/backend/singgah-backend" ./cmd/server
echo "   ✅ Binary ready"

echo ""
echo "📦 Step 2: Build React frontend..."
cd "$PROJECT_DIR/web-dashboard"
npm ci --prefer-offline 2>/dev/null
npm run build
echo "   ✅ Frontend ready"

echo ""
echo "📤 Step 3: Upload ke server..."

echo "   → Upload backend binary..."
scp -P "$SERVER_PORT" -i "$SSH_KEY" \
  "$DEPLOY_DIR/backend/singgah-backend" \
  "${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/backend/singgah-backend"

echo "   → Upload frontend files..."
scp -P "$SERVER_PORT" -i "$SSH_KEY" \
  -r "$PROJECT_DIR/web-dashboard/dist"/* \
  "${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/web/"

echo "   → Upload .htaccess..."
scp -P "$SERVER_PORT" -i "$SSH_KEY" \
  "$PROJECT_DIR/.htaccess" \
  "${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/web/.htaccess"

echo "   → Upload .env..."
scp -P "$SERVER_PORT" -i "$SSH_KEY" \
  "$PROJECT_DIR/backend/.env" \
  "${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/backend/.env" 2>/dev/null || true

echo "   → Upload start script..."
scp -P "$SERVER_PORT" -i "$SSH_KEY" \
  "$PROJECT_DIR/server-start.sh" \
  "${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/start.sh"

echo ""
echo "========================================="
echo "  ✅ Deploy selesai!"
echo ""
echo "  SSH ke server & jalankan:"
echo "    cd ${SERVER_PATH}"
echo "    chmod +x backend/singgah-backend start.sh"
echo "    ./start.sh &"
echo "========================================="