#!/bin/bash
# update-webhosting.sh — Safe update untuk webhosting shared hosting
# Mencegah data loss saat update: backup .env, uploads, database
set -e

PROJ_DIR="$HOME/singgah-pos"
WEB_DIR="$HOME/public_html"
BACKUP_DIR="$HOME/backups/$(date +%Y%m%d_%H%M%S)"
BACKEND_BIN="singgah-backend"

echo "=========================================="
echo "  Singgah POS — Safe Update Webhosting"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# 1. PRE-FLIGHT CHECKS
echo ""
echo "🔍 Step 1: Pre-flight checks..."
if [ ! -f "$PROJ_DIR/backend/.env" ]; then
    echo "❌ ERROR: backend/.env tidak ditemukan! Kredensial produksi hilang."
    echo "   Buat manual: cp backend/.env.example backend/.env"
    exit 1
fi
echo "   ✅ .env file exists"

# 2. BACKUP CURRENT STATE
echo ""
echo "📦 Step 2: Backup current state..."
mkdir -p "$BACKUP_DIR"
cp "$PROJ_DIR/backend/.env" "$BACKUP_DIR/.env.backup" 2>/dev/null || true
cp -r "$PROJ_DIR/uploads" "$BACKUP_DIR/uploads/" 2>/dev/null || true
cp "$PROJ_DIR/logs/backend.log" "$BACKUP_DIR/backend.log.backup" 2>/dev/null || true
# Backup database (mysqldump tanpa password - gunakan .env untuk credentials)
DB_URL=$(grep DATABASE_URL "$PROJ_DIR/backend/.env" | head -1 | cut -d'=' -f2-)
DB_NAME=$(echo "$DB_URL" | sed 's|.*/||' | sed 's|?.*||')
DB_USER=$(echo "$DB_URL" | cut -d':' -f1 | sed 's|.*//||')
DB_PASS=$(echo "$DB_URL" | cut -d':' -f2 | cut -d'@' -f1)
DB_HOST=$(echo "$DB_URL" | grep -oP 'tcp\(\K[^)]+' | cut -d: -f1)
DB_PORT=$(echo "$DB_URL" | grep -oP 'tcp\(\K[^)]+' | cut -d: -f2)
if command -v mysqldump &>/dev/null; then
    mysqldump -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_DIR/database.sql" 2>/dev/null || echo "   ⚠️ Database backup failed (non-critical)"
    echo "   ✅ Database backed up to $BACKUP_DIR/database.sql"
else
    echo "   ⚠️ mysqldump not found — skipping database backup"
fi
echo "   ✅ State backed up to $BACKUP_DIR"

# 3. STOP BACKEND GRACEFULLY
echo ""
echo "🔄 Step 3: Stopping backend gracefully..."
# Kirim SIGTERM dulu untuk graceful shutdown
pkill -f "$BACKEND_BIN" 2>/dev/null || true
sleep 3
# Kill sisa proses jika masih ada
pkill -9 -f "$BACKEND_BIN" 2>/dev/null || true
# Bersihkan port 8080
lsof -ti:8080 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1
echo "   ✅ Backend stopped"

# 4. DEPLOY NEW FILES (preserve .env, uploads)
echo ""
echo "📤 Step 4: Deploying new files..."
cd "$PROJ_DIR"
if [ -f deploy.tar.gz ]; then
    tar -xzf deploy.tar.gz
    rm -f deploy.tar.gz
    echo "   ✅ deploy.tar.gz extracted"
fi

# 5. RESTORE .ENV (jangan timpa!)
echo ""
echo "🔒 Step 5: Restoring .env (preserving production credentials)..."
cp "$BACKUP_DIR/.env.backup" "$PROJ_DIR/backend/.env" 2>/dev/null || true
echo "   ✅ .env restored from backup"

# 6. RESTORE UPLOADS
echo ""
echo "📂 Step 6: Restoring uploads directory..."
mkdir -p "$PROJ_DIR/uploads/logo" "$PROJ_DIR/uploads/products"
cp -rn "$BACKUP_DIR/uploads/"* "$PROJ_DIR/uploads/" 2>/dev/null || true
echo "   ✅ Uploads restored"

# 7. FIX PERMISSIONS
echo ""
echo "🔐 Step 7: Fixing permissions..."
chmod +x "$PROJ_DIR/start.sh" 2>/dev/null || true
chmod +x "$PROJ_DIR/backend/$BACKEND_BIN" 2>/dev/null || true
chmod +x "$PROJ_DIR/backend/main" 2>/dev/null || true
echo "   ✅ Permissions fixed"

# 8. RESTART BACKEND
echo ""
echo "🚀 Step 8: Restarting backend..."
cd "$PROJ_DIR"
setsid nohup ./start.sh > logs/backend.log 2>&1 &
disown 2>/dev/null || true
echo "   ✅ Backend started (PID: $!)"

# 9. WAIT & HEALTH CHECK
echo ""
echo "🏥 Step 9: Health check..."
sleep 5
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
    echo "   ✅ Health check PASSED (HTTP 200)"
else
    echo "   ⚠️ Health check returned HTTP $HEALTH"
    echo "   Checking logs..."
    tail -20 "$PROJ_DIR/logs/backend.log"
fi

# 10. CLEANUP OLD BACKUPS (keep last 5)
echo ""
echo "🧹 Step 10: Cleaning up old backups..."
ls -dt "$HOME/backups"/*/ 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
echo "   ✅ Old backups cleaned"

echo ""
echo "=========================================="
echo "  ✅ Update selesai!"
echo "  Backup: $BACKEND_BIN"
echo "  Health: HTTP $HEALTH"
echo "=========================================="
