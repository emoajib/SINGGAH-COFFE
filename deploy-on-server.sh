#!/bin/bash
set -e

PROJ_DIR="$HOME/singgah-pos"
REPO_URL="https://github.com/emoajib/singgah-coffe.git"
WEB_DIR="$HOME/public_html"
BACKEND_BIN="singgah-backend"

# ... [skip clone logic] ...

echo ""
echo "📦 Step 1: Build Go backend (Linux binary)..."
cd "$PROJ_DIR/backend"
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o "$PROJ_DIR/backend/$BACKEND_BIN" ./cmd/server 2>/dev/null || echo "⚠️ Build backend gagal, pakai binary lama"
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
    cp api-proxy.php "$WEB_DIR/api-proxy.php" 2>/dev/null || true
else
    echo "⚠️ Build gagal di server. Download pre-built dari GitHub Release..."
    cd "$PROJ_DIR/web-dashboard"
    wget -q "https://github.com/emoajib/singgah-coffe/releases/download/v1.0.0-security/singgah-frontend.tar.gz" -O /tmp/frontend.tar.gz
    mkdir -p dist && tar -xzf /tmp/frontend.tar.gz -C dist --strip-components=0
    rm -f /tmp/frontend.tar.gz
    cp -r dist/* "$WEB_DIR/"
    cp .htaccess "$WEB_DIR/.htaccess" 2>/dev/null || true
    cp api-proxy.php "$WEB_DIR/api-proxy.php" 2>/dev/null || true
fi

echo ""
echo "📤 Step 3: Copy files to web root ($WEB_DIR)..."
mkdir -p "$WEB_DIR" "$PROJ_DIR/logs"
chmod -R 755 "$WEB_DIR"
find "$WEB_DIR" -type f -exec chmod 644 {} \; 2>/dev/null || true
# Jaga-jaga .env server tidak ter-timpa jika belum ada (kredensial produksi TIDAK di-commit).
if [ ! -f "$PROJ_DIR/backend/.env" ]; then
    echo "   ⚠️ backend/.env tidak ditemukan di server. Buat manual sebelum start:"
    echo "       cp backend/.env.example backend/.env  → lalu isi DATABASE_URL & JWT_SECRET"
fi
cp "$PROJ_DIR/backend/start.sh" "$PROJ_DIR/start.sh"
mkdir -p "$PROJ_DIR/scripts" "$PROJ_DIR/docs" "$PROJ_DIR/backups"
chmod +x "$PROJ_DIR"/scripts/*.sh 2>/dev/null || true
for f in "$PROJ_DIR/scripts"/*.sh; do [ -f "$f" ] && chmod +x "$f"; done 2>/dev/null || true
chmod +x "$PROJ_DIR/start.sh" "$PROJ_DIR/backend/$BACKEND_BIN" "$PROJ_DIR/backend/main" 2>/dev/null || true
echo "   ✅ Files copied + permissions fixed"

echo ""
echo "🔄 Step 4: Restart backend..."
pkill -f "$BACKEND_BIN\|backend/main" 2>/dev/null || true
sleep 2
cd "$PROJ_DIR"
setsid nohup ./start.sh > logs/backend.log 2>&1 &
disown 2>/dev/null || true
echo "   ✅ Backend started (PID: $!)"
sleep 3

echo ""
echo "=== ✅ Deploy selesai! ==="
curl -s http://localhost:8080/health