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
echo "📥 Pulling latest code..."
cd "$PROJ_DIR"
git pull origin main
echo "✅ Pulled to $(git rev-parse --short HEAD)"

# --- Step 2: Deploy from deploy.tar.gz (pre-built package) ---
TMP_DIR=$(mktemp -d /tmp/singgah-deploy.XXXXXX)
if [ -f "deploy.tar.gz" ]; then
    echo "📦 Extracting deploy.tar.gz..."
    tar -xzf deploy.tar.gz -C "$TMP_DIR"
    
    # Copy backend binary
    if [ -f "$TMP_DIR/backend/singgah-backend" ]; then
        cp -f "$TMP_DIR/backend/singgah-backend" backend/singgah-backend
        cp -f "$TMP_DIR/backend/.env" backend/.env 2>/dev/null || true
        echo "✅ Backend binary updated"
    fi
    
    # Copy start.sh
    cp -f "$TMP_DIR/start.sh" start.sh 2>/dev/null || true
    
    # Copy scripts + docs
    cp -rf "$TMP_DIR/scripts" scripts/ 2>/dev/null || true
    cp -rf "$TMP_DIR/docs" docs/ 2>/dev/null || true
    
    rm -rf "$TMP_DIR"
else
    echo "⚠️  deploy.tar.gz not found — using committed binary"
fi

# --- Step 3: Update frontend from pre-built web-build/ ---
echo "🌐 Updating frontend..."
mkdir -p "$WEB_DIR"
if [ -d "web-build" ]; then
    rm -rf "$WEB_DIR"/*
    cp -r web-build/* "$WEB_DIR/"
    cp .htaccess "$WEB_DIR/.htaccess" 2>/dev/null || true
    echo "✅ Frontend deployed from web-build/"
elif [ -d "web-dashboard/dist" ]; then
    rm -rf "$WEB_DIR"/*
    cp -r web-dashboard/dist/* "$WEB_DIR/"
    cp web-dashboard/.htaccess "$WEB_DIR/.htaccess" 2>/dev/null || true
    echo "✅ Frontend deployed from dist/"
else
    echo "⚠️  No pre-built frontend found — skipping frontend update"
fi

# --- Step 4: Restart backend ---
echo "🔄 Restarting backend..."
pkill -f "singgah-backend" 2>/dev/null || true
pkill -f "backend/main" 2>/dev/null || true
sleep 2

chmod +x backend/singgah-backend start.sh 2>/dev/null || chmod +x backend/main start.sh 2>/dev/null
GOMAXPROCS=1 nohup ./start.sh > logs/backend.log 2>&1 &
BACKEND_PID=$!
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
