#!/bin/bash
set -e

PROJ_DIR="$HOME/singgah-pos"
REPO_URL="https://github.com/emoajib/SINGGAH-COFFEE.git"
WEB_DIR="$HOME/public_html"
BACKEND_BIN="singgah-backend"

# ... [skip clone logic] ...

echo ""
echo "📦 Step 1: Build Go backend (Linux binary)..."
cd "$PROJ_DIR/backend"
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o "$PROJ_DIR/backend/$BACKEND_BIN" ./cmd/server 2>/dev/null || echo "⚠️ Build backend gagal, pakai binary lama"
cp "$PROJ_DIR/backend/$BACKEND_BIN" "$PROJ_DIR/backend/main" 2>/dev/null || true
echo "   ✅ Backend binary ready"

echo ""
echo "📦 Step 2: Build React frontend (LOW MEMORY)"
cd "$PROJ_DIR/web-dashboard"

# Try local build; if fails, use pre-built from GitHub Release
if npm run build -- --minify=false 2>&1 | tail -3; then
    echo "   ✅ Frontend build ready"
    cd "$PROJ_DIR/web-dashboard"
    cp -r dist/* "$WEB_DIR/"
    cp .htaccess "$WEB_DIR/.htaccess" 2>/dev/null || true
else
    echo "⚠️ Build gagal di server. Download pre-built dari GitHub Release..."
    cd "$PROJ_DIR/web-dashboard"
    wget -q "https://github.com/emoajib/SINGGAH-COFFEE/releases/download/v1.0.0-security/singgah-frontend.tar.gz" -O /tmp/frontend.tar.gz
    mkdir -p dist && tar -xzf /tmp/frontend.tar.gz -C dist --strip-components=0
    rm -f /tmp/frontend.tar.gz
    cp -r dist/* "$WEB_DIR/"
    cp .htaccess "$WEB_DIR/.htaccess" 2>/dev/null || true
fi

echo ""
echo "📤 Step 3: Copy files to web root ($WEB_DIR)..."
mkdir -p "$WEB_DIR" "$PROJ_DIR/logs"
chmod -R 755 "$WEB_DIR"
find "$WEB_DIR" -type f -exec chmod 644 {} \; 2>/dev/null || true
cp "$PROJ_DIR/backend/.env" "$PROJ_DIR/backend/.env" 2>/dev/null || true  # keep existing
cp backend/start.sh "$PROJ_DIR/start.sh" 2>/dev/null || true
mkdir -p "$PROJ_DIR/scripts" "$PROJ_DIR/docs" "$PROJ_DIR/backups"
cp scripts/*.sh "$PROJ_DIR/scripts/" 2>/dev/null || true
cp docs/BACKUP.md "$PROJ_DIR/docs/" 2>/dev/null || true
chmod +x "$PROJ_DIR/start.sh" "$PROJ_DIR/backend/$BACKEND_BIN" "$PROJ_DIR/backend/main" "$PROJ_DIR/scripts/*.sh" 2>/dev/null || true
echo "   ✅ Files copied + permissions fixed"

echo ""
echo "🔄 Step 4: Restart backend..."
pkill -f "$BACKEND_BIN\|backend/main" 2>/dev/null || true
sleep 2
cd "$PROJ_DIR"
nohup ./start.sh > logs/backend.log 2>&1 &
echo "   ✅ Backend started (PID: $!)"
sleep 3

echo ""
echo "=== ✅ Deploy selesai! ==="
curl -s http://localhost:8080/health