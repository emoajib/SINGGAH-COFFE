#!/bin/bash
set -e

echo "=== Singgah POS Manual Deploy ==="
PROJ_DIR="/home/sosb4282/singgah-pos"
WEB_DIR="/home/sosb4282/public_html"

# 1. Create directories
mkdir -p "$PROJ_DIR/backend" "$WEB_DIR" "$PROJ_DIR/logs"

# 2. Upload/extract pre-built package
cd "$PROJ_DIR"
if [ -f deploy.tar.gz ]; then
    tar -xzf deploy.tar.gz
    rm deploy.tar.gz
elif [ -d web-dashboard ]; then
    echo "📂 Frontend files already extracted"
fi

# 3. Copy frontend to web root (public_html)
cd "$PROJ_DIR"
rm -rf "$WEB_DIR"/*
if [ -f web-dashboard/dist/index.html ] || [ -d web-dashboard/dist ]; then
    cp -r web-dashboard/dist/* "$WEB_DIR/"
else
    cp -r dist/* "$WEB_DIR/" 2>/dev/null || true
fi
cp web-dashboard/.htaccess "$WEB_DIR/.htaccess" 2>/dev/null || cp .htaccess "$WEB_DIR/" 2>/dev/null || true
cp api-proxy.php "$WEB_DIR/api-proxy.php" 2>/dev/null || true
echo "✅ Frontend files copied to $WEB_DIR"

# 4. Fix permissions
chmod 755 "$WEB_DIR"
find "$WEB_DIR" -type f -exec chmod 644 {} \; 2>/dev/null || true
chmod 755 "$WEB_DIR"/*.sh 2>/dev/null || true
echo "   ✅ Permissions fixed"

# 5. Restart backend
pkill -f "singgah-backend" 2>/dev/null || true
pkill -f "backend/main" 2>/dev/null || true
sleep 1
cd "$PROJ_DIR"
# start.sh berada di root $PROJ_DIR, binary di backend/sekitar script.
chmod +x start.sh 2>/dev/null || true
chmod +x backend/singgah-backend backend/main 2>/dev/null || true
# pastikan .env tersedia (kredensial produksi tidak di-commit ke repo publik)
if [ ! -f "$PROJ_DIR/backend/.env" ]; then
    echo "⚠️ backend/.env tidak ditemukan. Buat sebelum start (lihat docs/DEPLOY.md)."
    ls -la "$PROJ_DIR/backend/.env.example"
fi
setsid nohup ./start.sh > logs/backend.log 2>&1 &
disown 2>/dev/null || true
echo $! > backend.pid
sleep 3

# 6. Health check
curl -s http://localhost:8080/health || {
    echo "⚠️ Backend may need env vars. Check logs:"
    tail -20 "$PROJ_DIR/logs/backend.log"
}
echo "=== Done! ==="
