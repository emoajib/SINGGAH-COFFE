#!/bin/bash
# backup-webhosting.sh — Backup database + uploads di server webhosting
# Jalankan di terminal hosting:  bash ~/singgah-pos/scripts/backup-webhosting.sh
set -euo pipefail

BACKUP_DIR="$HOME/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
UPLOADS_DIR="$HOME/singgah-pos/backend/uploads"
ENV_FILE="$HOME/singgah-pos/backend/.env"

# Parser dotenv aman (tidak source shell) agar DSN dengan metakarakter tidak crash.
load_env_file() {
  [ -f "$1" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue ;; esac
    case "$line" in *=*) : ;; *) continue ;; esac
    name="${line%%=*}"
    value="${line#*=}"
    case "$value" in
      \"*\") value="${value#\"}"; value="${value%\"}" ;;
      \'*\') value="${value#\'}"; value="${value%\'}" ;;
    esac
    [ -n "$name" ] && export "$name=${value}" 2>/dev/null || true
  done < "$1"
}
load_env_file "$ENV_FILE"

# Izinkan override via env DB_NAME/DB_USER/DB_PASS; jika kosong, parse dari DATABASE_URL.
DB_NAME="${DB_NAME:-}"
DB_USER="${DB_USER:-}"
DB_PASS="${DB_PASS:-}"
if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASS" ]; then
  if [ -n "${DATABASE_URL:-}" ]; then
    CREDS="${DATABASE_URL%%@*}"
    CREDS="${CREDS#*//}"
    HOSTPART="${DATABASE_URL#*@}"
    HOSTPART="${HOSTPART%%)*}"
    DB_USER="${DB_USER:-${CREDS%%:*}}"
    DB_PASS="${DB_PASS:-${CREDS#*:}}"
    DB_NAME="${DB_NAME:-${DATABASE_URL##*/}}"
    DB_NAME="${DB_NAME%%\?*}"
  fi
fi

if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASS" ]; then
    echo "⚠️  DB_NAME/DB_USER/DB_PASS kosong — isi backend/.env (DATABASE_URL) atau export DB_*. Backup DB dibatalkan." >&2
    DB_NAME="" DB_USER="" DB_PASS=""
fi

mkdir -p "$BACKUP_DIR"

echo "=== Backup started: $TIMESTAMP ==="

# 1. Dump database
if [ -n "$DB_NAME" ] && [ -n "$DB_PASS" ]; then
  echo "[1/2] Dumping database..."
  mysqldump -u "$DB_USER" -p"$DB_PASS" -h localhost "$DB_NAME" \
    | gzip > "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
  echo "  ✅ DB: $(du -h "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz" | cut -f1)"
else
  echo "[1/2] ⚠️  DB backup dilewati (DB_NAME/DB_PASS kosong)."
fi

# 2. Backup uploads
echo "[2/2] Backing up uploads..."
if [ -d "$UPLOADS_DIR" ]; then
  tar czf "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" -C "$UPLOADS_DIR" .
  echo "  ✅ Uploads: $(du -h "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" | cut -f1)"
else
  echo "  ⚠️  Uploads dir not found: $UPLOADS_DIR"
fi

# 3. Rotation (keep last 5)
echo "=== Clean old backups (keep 5) ==="
ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | tail -n +6 | xargs rm -f
ls -t "$BACKUP_DIR"/uploads_*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f

# 4. Verify
echo "=== Backup files ==="
ls -lh "$BACKUP_DIR"/db_${TIMESTAMP}.sql.gz 2>/dev/null || true
ls -lh "$BACKUP_DIR"/uploads_${TIMESTAMP}.tar.gz 2>/dev/null || true

echo "=== ✅ Backup complete ==="
