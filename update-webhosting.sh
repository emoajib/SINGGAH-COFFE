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
REPO_SSH="git@github.com:emoajib/SINGGAH-COFFE.git"
REPO_HTTPS="https://github.com/emoajib/SINGGAH-COFFE.git"
TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"

echo "=== Singgah POS Auto-Update ==="
echo "Server: $(hostname)"
echo "Time:   $(date)"
echo ""

# --- Safety: Backup existing .env before update ---
if [ -f "$PROJ_DIR/backend/.env" ]; then
    cp "$PROJ_DIR/backend/.env" "$PROJ_DIR/backend/.env.backup" 2>/dev/null || true
fi

# --- Step 0: Ensure repo is available ---
if [ ! -d "$PROJ_DIR/.git" ]; then
    echo "📋 Repo not found. Cloning..."
    if [ -n "$TOKEN" ]; then
        # Clone via HTTPS with token (non-interactive)
        git clone "https://oauth2:${TOKEN}@github.com/emoajib/SINGGAH-COFFE.git" "$PROJ_DIR"
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

# --- Step 0: Parse args ---
SKIP_PULL=false
for arg in "$@"; do
    case "$arg" in
        --skip-pull) SKIP_PULL=true; shift ;;
    esac
done

# --- Step 1: Pull latest code ---
SELF_SCRIPT="$0"
SELF_HASH_BEFORE=$(md5sum "$SELF_SCRIPT" 2>/dev/null | awk '{print $1}')

if [ "$SKIP_PULL" = true ]; then
    echo "⏭️  Skipping git pull (--skip-pull)"
    echo "✅ On $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
else
    echo "📥 Pulling latest code..."
    cd "$PROJ_DIR"
    # Kill backend before pull (in case binary is locked)
    pkill -f "singgah-backend" 2>/dev/null || true
    sleep 1
    # Aggressive reset: discard local tracking differences, then pull
    git fetch origin 2>&1 | tail -2
    git reset --hard origin/main 2>&1
    echo "✅ Pulled to $(git rev-parse --short HEAD)"
    # Restore .env if needed
    if [ ! -f "$PROJ_DIR/backend/.env" ] && [ -f "$PROJ_DIR/backend/.env.backup" ]; then
        cp "$PROJ_DIR/backend/.env.backup" "$PROJ_DIR/backend/.env"
    fi
fi

SELF_HASH_AFTER=$(md5sum "$SELF_SCRIPT" 2>/dev/null | awk '{print $1}')
if [ "$SKIP_PULL" = false ] && [ -n "$SELF_HASH_BEFORE" ] && [ "$SELF_HASH_BEFORE" != "$SELF_HASH_AFTER" ]; then
    echo "↻ Script updated during pull — re-running with latest version..."
    exec bash "$SELF_SCRIPT" "$@"
fi

# --- Step 2: Download deploy.tar.gz from latest GitHub release ---
echo "📥 Fetching latest deploy package from GitHub Releases..."
TMP_DIR=$(mktemp -d /tmp/singgah-deploy.XXXXXX)

# Try direct latest release first, fallback to releases API
RELEASE_URL=""
RELEASES_JSON=$(curl -sL -H "User-Agent: SinggahPOS-Deploy" --max-time 15 --connect-timeout 5 "https://api.github.com/repos/emoajib/SINGGAH-COFFE/releases?per_page=10" 2>/dev/null || true)
if [ -n "$RELEASES_JSON" ]; then
    RELEASE_URL=$(echo "$RELEASES_JSON" | grep -o '"browser_download_url":"[^"]*deploy.tar.gz"' | head -1 | sed 's/"browser_download_url":"//;s/"$//' || true)
fi

# Direct fallback if API rate-limited
if [ -z "$RELEASE_URL" ]; then
    RELEASE_URL="https://github.com/emoajib/SINGGAH-COFFE/releases/latest/download/deploy.tar.gz"
fi

echo "   → Downloading from: $RELEASE_URL"
if curl -sL -H "User-Agent: SinggahPOS-Deploy" --max-time 180 "$RELEASE_URL" -o "$TMP_DIR/deploy.tar.gz" 2>/dev/null && [ -s "$TMP_DIR/deploy.tar.gz" ]; then
    echo "📦 Extracting deploy.tar.gz..."
    tar -xzf "$TMP_DIR/deploy.tar.gz" -C "$TMP_DIR"
    
    # Copy backend binary (preserve server's existing start.sh & .env)
    cp -f "$TMP_DIR/backend/singgah-backend" backend/singgah-backend 2>/dev/null || true
    chmod +x backend/singgah-backend 2>/dev/null || true
    if [ ! -f "backend/.env" ] && [ -f "$TMP_DIR/backend/.env" ]; then
        cp -f "$TMP_DIR/backend/.env" backend/.env 2>/dev/null || true
    fi
    echo "✅ Backend binary updated from release"
    
    # Deploy frontend from package + proxy files (preserve uploads folder)
    find "$WEB_DIR" -mindepth 1 -maxdepth 1 ! -name 'uploads' -exec rm -rf {} + 2>/dev/null || true
    cp -r "$TMP_DIR/web"/* "$WEB_DIR/" 2>/dev/null || cp -r "$TMP_DIR"/web/* "$WEB_DIR/" 2>/dev/null || true
    cp "$TMP_DIR/.htaccess" "$WEB_DIR/.htaccess" 2>/dev/null || true
    cp "$TMP_DIR/api-proxy.php" "$WEB_DIR/api-proxy.php" 2>/dev/null || true
    echo "✅ Frontend + proxy files deployed from release (uploads preserved)"
    
    # Copy scripts + docs
    cp -rf "$TMP_DIR/scripts" scripts/ 2>/dev/null || true
    
    rm -rf "$TMP_DIR"
else
    echo "⚠️  Download from GitHub Releases failed. Falling back to local packages..."
    
    # Priority 1: web-fixed.zip (frontend-only, most recent)
    if [ -f "$PROJ_DIR/web-fixed.zip" ]; then
        echo "📦 Using web-fixed.zip (frontend-only)..."
        find "$WEB_DIR" -mindepth 1 -maxdepth 1 ! -name 'uploads' -exec rm -rf {} + 2>/dev/null || true
        unzip -o "$PROJ_DIR/web-fixed.zip" -d "$WEB_DIR/"
        find "$WEB_DIR" -type f -exec chmod 644 {} \;
        # Restore proxy files (web-fixed.zip is frontend-only)
        cp "$PROJ_DIR/api-proxy.php" "$WEB_DIR/api-proxy.php" 2>/dev/null || true
        cp "$PROJ_DIR/.htaccess" "$WEB_DIR/.htaccess" 2>/dev/null || true
        echo "✅ Frontend + proxy files deployed from web-fixed.zip"
    fi
    
    # Priority 2: local deploy.tar.gz (full package)
    if [ -f "$PROJ_DIR/deploy.tar.gz" ] && [ ! -f "$WEB_DIR/api-proxy.php" ]; then
        echo "📦 Using local deploy.tar.gz..."
        TMP_DIR=$(mktemp -d /tmp/singgah-deploy.XXXXXX)
        tar -xzf "$PROJ_DIR/deploy.tar.gz" -C "$TMP_DIR"
        cp -f "$TMP_DIR/backend/singgah-backend" backend/singgah-backend 2>/dev/null || true
        chmod +x backend/singgah-backend 2>/dev/null || true
        if [ ! -f "backend/.env" ] && [ -f "$TMP_DIR/backend/.env" ]; then
            cp -f "$TMP_DIR/backend/.env" backend/.env 2>/dev/null || true
        fi
        find "$WEB_DIR" -mindepth 1 -maxdepth 1 ! -name 'uploads' -exec rm -rf {} + 2>/dev/null || true
        cp -r "$TMP_DIR/web"/* "$WEB_DIR/" 2>/dev/null || true
        cp "$TMP_DIR/.htaccess" "$WEB_DIR/.htaccess" 2>/dev/null || true
        cp "$TMP_DIR/api-proxy.php" "$WEB_DIR/api-proxy.php" 2>/dev/null || true
        rm -rf "$TMP_DIR"
        echo "✅ Full deploy from local deploy.tar.gz"
    fi
    
    # If no package found, try building from source
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

# Ensure uploads static link in public_html
mkdir -p "$PROJ_DIR/uploads/products" "$PROJ_DIR/uploads/logo"
chmod -R 755 "$PROJ_DIR/uploads" 2>/dev/null || true
if [ ! -L "$WEB_DIR/uploads" ] && [ ! -d "$WEB_DIR/uploads" ]; then
    ln -s "$PROJ_DIR/uploads" "$WEB_DIR/uploads" 2>/dev/null || cp -r "$PROJ_DIR/uploads" "$WEB_DIR/" 2>/dev/null || true
fi
chmod -R 755 "$WEB_DIR/uploads" 2>/dev/null || true

echo ""
echo "=== ✅ Deploy complete! ==="
echo "Backend: http://localhost:8080"
echo "Frontend: $WEB_DIR"
echo "Logs: $PROJ_DIR/logs/backend.log"
