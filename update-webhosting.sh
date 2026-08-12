#!/bin/bash
# ====================================================================
# update-webhosting.sh — Automated deploy script for Singgah POS
# Run this on your webhosting server (sosb4282@sosiomen.com) via SSH
#
# USAGE:
#   chmod +x update-webhosting.sh
#   ./update-webhosting.sh          # interactive — will prompt for GitHub token if needed
#   GH_TOKEN=token ./update-webhosting.sh  # non-interactive (token in env)
#
# PREREQUISITES (one-time setup):
#   • SSH key configured for github.com, OR GitHub PAT (Settings → Developer → Personal Access Tokens)
#   • Repo must be cloned once to $REPO_DIR (script will do this if GH_TOKEN is set)
# ====================================================================
set -euo pipefail

PROJ_DIR="$HOME/singgah-pos"
WEB_DIR="$HOME/public_html"
REPO_SSH="git@github.com:emoajib/SINGGAH-COFFEE.git"
REPO_HTTPS="https://github.com/emoajib/SINGGAH-COFFEE.git"
TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"

echo "=== Singgah POS Auto-Update ==="
echo "Server: $(hostname)"
echo "Time:   $(date)"
echo ""

# --- Step 0: Ensure repo is available ---
if [ ! -d "$PROJ_DIR/.git" ]; then
    echo "📋 Repo not found. Cloning..."
    if [ -n "$TOKEN" ]; then
        # Clone via HTTPS with token (non-interactive)
        git clone "https://oauth2:${TOKEN}@github.com/emoajib/SINGGAH-COFFEE.git" "$PROJ_DIR"
    elif ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
        git clone "$REPO_SSH" "$PROJ_DIR"
    else
        echo "❌ ERROR: Need GitHub access."
        echo "   Option A: Set GH_TOKEN env var then re-run"
        echo "   Option B: Configure SSH key for github.com"
        echo "   Option C: Manually upload deploy.tar.gz to $PROJ_DIR/"
        exit 1
    fi
fi

# --- Step 1: Pull latest code ---
# Guard: jika script ini berubah saat git pull, jalankan ulang versi terbaru
SELF_SCRIPT="$0"
SELF_HASH_BEFORE=$(md5sum "$SELF_SCRIPT" 2>/dev/null | awk '{print $1}')

echo "📥 Pulling latest code..."
cd "$PROJ_DIR"
git pull origin main
echo "✅ Pulled to $(git rev-parse --short HEAD)"

SELF_HASH_AFTER=$(md5sum "$SELF_SCRIPT" 2>/dev/null | awk '{print $1}')
if [ -n "$SELF_HASH_BEFORE" ] && [ "$SELF_HASH_BEFORE" != "$SELF_HASH_AFTER" ]; then
    echo "↻ Script updated during pull — re-running with latest version..."
    exec bash "$SELF_SCRIPT"
fi

# --- Step 2: Download deploy.tar.gz from latest GitHub release ---
echo "📥 Fetching latest deploy package from GitHub Releases..."
TMP_DIR=$(mktemp -d /tmp/singgah-deploy.XXXXXX)
RELEASE_URL=$(curl -sL "https://api.github.com/repos/emoajib/SINGGAH-COFFEE/releases?per_page=10" \
    | grep -o '"browser_download_url":"[^"]*deploy.tar.gz"' \
    | head -1 \
    | sed 's/"browser_download_url":"//;s/"$//')
# Fallback: try jq if available (more reliable JSON parsing)
if [ -z "$RELEASE_URL" ] && command -v jq &>/dev/null; then
    RELEASE_URL=$(curl -sL "https://api.github.com/repos/emoajib/SINGGAH-COFFEE/releases?per_page=10" \
        | jq -r '.[].assets[]? | select(.name == "deploy.tar.gz") | .browser_download_url' \
        | head -1)
fi

if [ -n "$RELEASE_URL" ]; then
    echo "   → Downloading: $RELEASE_URL"
    curl -sL "$RELEASE_URL" -o "$TMP_DIR/deploy.tar.gz"
    echo "📦 Extracting deploy.tar.gz..."
    tar -xzf "$TMP_DIR/deploy.tar.gz" -C "$TMP_DIR"
    
    # Copy backend binary (preserve server's existing start.sh & .env)
    cp -f "$TMP_DIR/backend/singgah-backend" backend/singgah-backend 2>/dev/null || true
    chmod +x backend/singgah-backend 2>/dev/null || true
    # Update .env from package (server-specific overrides preserved by start.sh exports)
    cp -f "$TMP_DIR/backend/.env" backend/.env 2>/dev/null || true
    echo "✅ Backend binary updated from release"
    
    # Deploy frontend from package + proxy files
    rm -rf "$WEB_DIR"/*
    cp -r "$TMP_DIR/web"/* "$WEB_DIR/" 2>/dev/null || cp -r "$TMP_DIR"/web/* "$WEB_DIR/" 2>/dev/null || true
    cp "$TMP_DIR/.htaccess" "$WEB_DIR/.htaccess" 2>/dev/null || true
    cp "$TMP_DIR/api-proxy.php" "$WEB_DIR/api-proxy.php" 2>/dev/null || true
    echo "✅ Frontend + proxy files deployed from release"
    
    # Copy scripts + docs
    cp -rf "$TMP_DIR/scripts" scripts/ 2>/dev/null || true
    
    rm -rf "$TMP_DIR"
else
    echo "⚠️  No deploy.tar.gz release found. Falling back to local build..."
    # Fallback: use existing local deploy.tar.gz if present
    if [ -f "$PROJ_DIR/deploy.tar.gz" ]; then
        echo "📦 Using local deploy.tar.gz..."
        TMP_DIR=$(mktemp -d /tmp/singgah-deploy.XXXXXX)
        tar -xzf "$PROJ_DIR/deploy.tar.gz" -C "$TMP_DIR"
        cp -f "$TMP_DIR/backend/singgah-backend" backend/singgah-backend 2>/dev/null || true
        chmod +x backend/singgah-backend 2>/dev/null || true
        cp -f "$TMP_DIR/backend/.env" backend/.env 2>/dev/null || true
        rm -rf "$WEB_DIR"/*
        cp -r "$TMP_DIR/web"/* "$WEB_DIR/" 2>/dev/null || true
        cp "$TMP_DIR/.htaccess" "$WEB_DIR/.htaccess" 2>/dev/null || true
        cp "$TMP_DIR/api-proxy.php" "$WEB_DIR/api-proxy.php" 2>/dev/null || true
        rm -rf "$TMP_DIR"
    fi
    
    # If no release and no local package, try building from source
    if [ ! -f "$WEB_DIR/api-proxy.php" ]; then
        echo "🌐 No pre-built package found. Building from source..."
        if [ -d "web-dashboard/dist" ]; then
            rm -rf "$WEB_DIR"/*
            cp -r web-dashboard/dist/* "$WEB_DIR/"
            cp api-proxy.php "$WEB_DIR/api-proxy.php"
            cp .htaccess "$WEB_DIR/.htaccess" 2>/dev/null || true
            echo "✅ Frontend deployed from build/dist/"
        else
            echo "⚠️  No pre-built frontend found — skipping frontend update"
        fi
    fi
fi

# --- Step 4: Restart backend ---
echo "🔄 Restarting backend..."
pkill -f "singgah-backend" 2>/dev/null || true
pkill -f "backend/main" 2>/dev/null || true
sleep 2

chmod +x backend/singgah-backend 2>/dev/null || true
mkdir -p logs
GOMAXPROCS=1 setsid nohup ./backend/start.sh > logs/backend.log 2>&1 &
BACKEND_PID=$!
disown 2>/dev/null || true
echo "✅ Backend started (PID: $BACKEND_PID)"

# --- Step 5: Health check ---
echo "🩺 Health check..."
sleep 3
if curl -s http://localhost:8080/health | grep -q "ok"; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Health check failed. Check logs:"
    tail -20 logs/backend.log
    exit 1
fi

echo ""
echo "=== ✅ Deploy complete! ==="
echo "Backend: http://localhost:8080"
echo "Frontend: $WEB_DIR"
echo "Logs: $PROJ_DIR/logs/backend.log"
