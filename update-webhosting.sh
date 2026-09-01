#!/bin/bash
# ====================================================================
# update-webhosting.sh — Lightweight deploy for shared hosting
# Runs on: sosb4282@colorado.iixcp.rumahweb.net
# Fork-safe: no git, no pkill, no find -exec, no setsid
#
# USAGE:
#   ./update-webhosting.sh              # download from GitHub Releases
#   ./update-webhosting.sh --skip-pull  # use existing deploy.tar.gz in /tmp
# ====================================================================

PROJ_DIR="$HOME/singgah-pos"
WEB_DIR="$HOME/public_html"
DEPLOY_URL="https://github.com/emoajib/singgah-coffe/releases/latest/download/deploy.tar.gz"
PIDFILE="$PROJ_DIR/backend/backend.pid"
LOGFILE="$PROJ_DIR/logs/backend.log"

# --- Helpers ---
log()  { echo "[$(date '+%H:%M:%S')] $*"; }
die()  { log "FATAL: $*"; exit 1; }

safe_kill() {
    if [ -f "$PIDFILE" ]; then
        PID=$(cat "$PIDFILE" 2>/dev/null)
        if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
            log "Killing backend PID $PID..."
            kill "$PID" 2>/dev/null; sleep 2
            kill -9 "$PID" 2>/dev/null; sleep 1
        fi
        rm -f "$PIDFILE"
    fi
    # Fallback: kill by port (simple lsof, no fork)
    PID_ON_PORT=$(lsof -ti:8080 2>/dev/null)
    if [ -n "$PID_ON_PORT" ]; then
        log "Killing process on port 8080: $PID_ON_PORT"
        kill -9 $PID_ON_PORT 2>/dev/null; sleep 2
    fi
}

# --- Step 0: Parse args ---
SKIP_PULL=false
for arg in "$@"; do
    [ "$arg" = "--skip-pull" ] && SKIP_PULL=true
done

log "=== Singgah POS Deploy (Shared Hosting) ==="
log "Server: $(hostname)"

# --- Step 1: Kill old backend ---
log "Step 1: Stopping old backend..."
safe_kill

# --- Step 2: Backup .env ---
if [ -f "$PROJ_DIR/backend/.env" ]; then
    cp "$PROJ_DIR/backend/.env" "$PROJ_DIR/backend/.env.backup" 2>/dev/null || true
    log "Backed up .env"
fi

# --- Step 3: Download deploy.tar.gz ---
if [ "$SKIP_PULL" = true ]; then
    log "Step 2: Using existing /tmp/deploy.tar.gz (--skip-pull)"
    [ -f /tmp/deploy.tar.gz ] || die "No /tmp/deploy.tar.gz found. Run without --skip-pull first."
else
    log "Step 2: Downloading deploy.tar.gz..."
    curl -sL -H "User-Agent: SinggahPOS-Deploy" \
        --max-time 180 --connect-timeout 10 \
        "$DEPLOY_URL" -o /tmp/deploy.tar.gz \
        || die "Download failed. Check network or GitHub Releases."
    [ -s /tmp/deploy.tar.gz ] || die "Downloaded file is empty."
    log "Downloaded $(wc -c < /tmp/deploy.tar.gz) bytes"
fi

# --- Step 4: Extract ---
log "Step 3: Extracting..."
cd "$PROJ_DIR" || die "Cannot cd to $PROJ_DIR"
tar xzf /tmp/deploy.tar.gz --overwrite 2>&1 || die "tar extraction failed"
chmod +x singgah-pos-backend 2>/dev/null || true
log "Binary: $(ls -la singgah-pos-backend 2>/dev/null || echo 'NOT FOUND')"

# --- Step 5: Restore .env ---
if [ ! -f "$PROJ_DIR/backend/.env" ] && [ -f "$PROJ_DIR/backend/.env.backup" ]; then
    cp "$PROJ_DIR/backend/.env.backup" "$PROJ_DIR/backend/.env"
    log "Restored .env from backup"
fi

# --- Step 6: Deploy frontend ---
log "Step 4: Deploying frontend..."
if [ -d "$PROJ_DIR/web" ]; then
    # Simple cp, no find -exec
    rm -rf "$WEB_DIR"/apps "$WEB_DIR"/assets "$WEB_DIR"/favicon.ico "$WEB_DIR"/index.html "$WEB_DIR"/vite.svg 2>/dev/null || true
    cp -r "$PROJ_DIR"/web/* "$WEB_DIR/" 2>/dev/null || true
fi
cp -f "$PROJ_DIR/api-proxy.php" "$WEB_DIR/api-proxy.php" 2>/dev/null || true
cp -f "$PROJ_DIR/.htaccess" "$WEB_DIR/.htaccess" 2>/dev/null || true
log "Frontend deployed"

# --- Step 7: Uploads symlink ---
mkdir -p "$PROJ_DIR/backend/uploads/products" "$PROJ_DIR/backend/uploads/logo" 2>/dev/null || true
chmod -R 755 "$PROJ_DIR/backend/uploads" 2>/dev/null || true
if [ ! -L "$WEB_DIR/uploads" ] && [ ! -d "$WEB_DIR/uploads" ]; then
    ln -s "$PROJ_DIR/backend/uploads" "$WEB_DIR/uploads" 2>/dev/null || true
fi

# --- Step 8: Start backend ---
log "Step 5: Starting backend..."
mkdir -p "$PROJ_DIR/logs"
cd "$PROJ_DIR" || die "Cannot cd to $PROJ_DIR"
GOMAXPROCS=1 GOMEMLIMIT=200MiB nohup ./singgah-pos-backend > "$LOGFILE" 2>&1 &
echo $! > "$PIDFILE"
log "Backend started (PID: $!)"

# --- Step 9: Health check ---
log "Step 6: Health check..."
sleep 4
HEALTH=$(curl -s http://127.0.0.1:8080/health 2>/dev/null)
if echo "$HEALTH" | grep -q "ok"; then
    log "✅ Backend is healthy: $HEALTH"
else
    log "⚠️  Health check failed. Last 10 lines of log:"
    tail -10 "$LOGFILE" 2>/dev/null
    die "Backend not healthy"
fi

log ""
log "=== Deploy complete! ==="
log "Backend: http://localhost:8080"
log "Frontend: $WEB_DIR"
log "Log: tail -f $LOGFILE"
