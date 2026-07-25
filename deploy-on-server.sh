#!/bin/bash
set -e

PROJ_DIR="$HOME/singgah-pos"
REPO_URL="https://github.com/emoajib/sistem-moka-pos-singgah-coffee.git"

echo "=== Singgah POS Auto Deploy ==="
echo ""

if [ -d "$PROJ_DIR/.git" ]; then
  echo "📂 Repo sudah ada, pull terbaru..."
  cd "$PROJ_DIR"
  git pull origin main
else
  echo "📥 Clone repo dari GitHub..."
  mkdir -p "$PROJ_DIR"
  cd "$PROJ_DIR"
  git clone "$REPO_URL" .
fi

echo ""
echo "📦 Step 1: Build Go backend (Linux binary)..."
cd "$PROJ_DIR/backend"
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o ../backend/main ./cmd/server
echo "   ✅ Backend binary ready"

echo ""
echo "📦 Step 2: Build React frontend..."
mkdir -p "$PROJ_DIR/web" "$PROJ_DIR/logs"
cd "$PROJ_DIR/web-dashboard"
NODE_OPTIONS="--max-old-space-size=512" npm run build
echo "   ✅ Frontend build ready"

echo ""
echo "📤 Step 3: Copy files to web/..."
cp -r dist/* "$PROJ_DIR/web/"
cp .htaccess "$PROJ_DIR/web/.htaccess"
cp ../backend/.env "$PROJ_DIR/backend/.env" 2>/dev/null || true
cp ../server-start.sh "$PROJ_DIR/start.sh"
chmod +x "$PROJ_DIR/start.sh"
chmod +x "$PROJ_DIR/backend/main"
echo "   ✅ Files copied"

echo ""
echo "🔄 Step 4: Restart backend..."
pkill -f "$PROJ_DIR/backend/main" 2>/dev/null || true
sleep 1
cd "$PROJ_DIR"
nohup ./start.sh > logs/backend.log 2>&1 &
echo "   ✅ Backend started"

echo ""
echo "⏳ Step 5: Wait for backend to be ready..."
sleep 3

echo ""
echo "=== ✅ Deploy selesai! ==="
echo ""
echo "Cek backend:"
curl -s http://localhost:8080/health || echo "Backend belum ready, tunggu sebentar"
echo ""
echo "Buka https://sosiomen.com di browser"