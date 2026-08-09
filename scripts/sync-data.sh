#!/bin/bash
# sync-data.sh — Sync database dumps + uploads antara webhosting & localhost
#
# Usage:
#   bash scripts/sync-data.sh --pull     # Download from webhosting → localhost
#   bash scripts/sync-data.sh --push     # Upload from localhost → webhosting
#   bash scripts/sync-data.sh --status   # Check connections & files
#
# Env vars (or set in ~/.ssh/config / ~/.netrc):
#   EXPORT DEPLOY_HOST=sosb4282@colorado.sosomedia.net
#   EXPORT DEPLOY_PORT=992
#   EXPORT DEPLOY_PASS=your_webhosting_pass
set -euo pipefail

HOST="${DEPLOY_HOST:-sosb4282@colorado.sosomedia.net}"
PORT="${DEPLOY_PORT:-992}"
REMOTE_BACKUP_DIR="~/backups"
REMOTE_UPLOADS_DIR="~/singgah-pos/backend/uploads"
LOCAL_BACKUP_DIR="./backups"

ACTION="${1:---help}"

show_help() {
  echo "Usage: bash scripts/sync-data.sh [OPTION]"
  echo "Options:"
  echo "  --pull    Download database + uploads from webhosting to localhost"
  echo "  --push    Upload database dump + uploads from localhost to webhosting"
  echo "  --status  Check connection + list available backup files"
  echo "  --help    Show this help"
  echo ""
  echo "Required env vars:"
  echo "  DEPLOY_HOST  Webhosting SSH host (default: $HOST)"
  echo "  DEPLOY_PORT  Webhosting SSH port (default: $PORT)"
  echo "  DEPLOY_PASS  Webhosting password (for scp automation)"
}

# --- Functions ---
pull_latest_backup() {
  echo "=== Pulling latest backup from webhosting ==="

  # Get latest backup filenames from server
  LATEST_DB=$(sshpass -p "$DEPLOY_PASS" ssh -p "$PORT" "$HOST" \
    "ls -t $REMOTE_BACKUP_DIR/db_*.sql.gz 2>/dev/null | head -1" 2>/dev/null || echo "")

  if [ -z "$LATEST_DB" ]; then
    echo "❌ No backup found on server. Run backup-webhosting.sh first."
    exit 1
  fi

  echo "Latest DB backup: $(basename "$LATEST_DB")"
  mkdir -p "$LOCAL_BACKUP_DIR"
  sshpass -p "$DEPLOY_PASS" scp -P "$PORT" "$HOST:$LATEST_DB" "$LOCAL_BACKUP_DIR/"
  echo "✅ DB downloaded: $LOCAL_BACKUP_DIR/$(basename "$LATEST_DB")"

  # Pull latest uploads
  LATEST_UPLOADS=$(sshpass -p "$DEPLOY_PASS" ssh -p "$PORT" \
    "ls -t $REMOTE_BACKUP_DIR/uploads_*.tar.gz 2>/dev/null | head -1" 2>/dev/null || echo "")

  if [ -n "$LATEST_UPLOADS" ]; then
    echo "Latest uploads backup: $(basename "$LATEST_UPLOADS")"
    sshpass -p "$DEPLOY_PASS" scp -P "$PORT" "$HOST:$LATEST_UPLOADS" "$LOCAL_BACKUP_DIR/"
    echo "✅ Uploads downloaded: $LOCAL_BACKUP_DIR/$(basename "$LATEST_UPLOADS")"
  else
    echo "⚠️  No uploads backup found on server"
  fi
}

push_to_server() {
  echo "=== Pushing backup to webhosting ==="
  mkdir -p "$LOCAL_BACKUP_DIR"

  LATEST_LOCAL_DB=$(ls -t "$LOCAL_BACKUP_DIR"/db_local_*.sql.gz 2>/dev/null | head -1 || echo "")
  if [ -z "$LATEST_LOCAL_DB" ]; then
    echo "❌ No local DB backup. Run backup-local.sh first."
    exit 1
  fi

  echo "Pushing: $(basename "$LATEST_LOCAL_DB")"
  sshpass -p "$DEPLOY_PASS" scp -P "$PORT" "$LATEST_LOCAL_DB" "$HOST:$REMOTE_BACKUP_DIR/"
  echo "✅ DB uploaded to server"

  LATEST_LOCAL_UPLOADS=$(ls -t "$LOCAL_BACKUP_DIR"/uploads_local_*.tar.gz 2>/dev/null | head -1 || echo "")
  if [ -n "$LATEST_LOCAL_UPLOADS" ]; then
    echo "Pushing: $(basename "$LATEST_LOCAL_UPLOADS")"
    sshpass -p "$DEPLOY_PASS" scp -P "$PORT" "$LATEST_LOCAL_UPLOADS" "$HOST:$REMOTE_BACKUP_DIR/"
    echo "✅ Uploads uploaded to server"
  fi
}

show_status() {
  echo "=== Connection Test ==="
  sshpass -p "$DEPLOY_PASS" ssh -p "$PORT" "$HOST" "hostname && uptime && df -h ~/singgah-pos" 2>/dev/null || {
    echo "❌ SSH connection failed"
    echo "Set env: export DEPLOY_HOST=DEPLOY_PORT=DEPLOY_PASS"
  }

  echo ""
  echo "=== Server backups ==="
  sshpass -p "$DEPLOY_PASS" ssh -p "$PORT" "$HOST" \
    "ls -lh $REMOTE_BACKUP_DIR/db_*.sql.gz $REMOTE_BACKUP_DIR/uploads_*.tar.gz 2>/dev/null || echo 'No backups on server'" 2>/dev/null

  echo ""
  echo "=== Local backups ==="
  ls -lh "$LOCAL_BACKUP_DIR"/db_local_*.sql.gz "$LOCAL_BACKUP_DIR"/uploads_local_*.tar.gz 2>/dev/null || echo "No local backups"

  echo ""
  echo "=== Live uploads (server) ==="
  sshpass -p "$DEPLOY_PASS" ssh -p "$PORT" "$HOST" \
    "du -sh $REMOTE_UPLOADS_DIR 2>/dev/null || echo 'uploads dir not found'" 2>/dev/null

  echo "=== Live uploads (local) ==="
  du -sh ./backend/uploads 2>/dev/null || echo "no local uploads dir"
}

# --- Main ---
case "$ACTION" in
  --pull)  pull_latest_backup ;;
  --push)  push_to_server ;;
  --status) show_status ;;
  --help|*) show_help ;;
esac
